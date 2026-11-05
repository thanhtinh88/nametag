using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Auth;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public interface IAuthService
{
    Task<AuthResponse?> LoginAsync(LoginRequest request, string? ipAddress, string? userAgent);
    Task<AuthResponse?> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken, string? ipAddress, string? userAgent);
    Task<bool> RevokeTokenAsync(string refreshToken);
    Task<UserDto?> GetCurrentUserAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly int _refreshReuseGraceSeconds;

    public const int MaxFailedAttempts = 10;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(30);

    public AuthService(
        IAppDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
        : this(db, passwordHasher, jwtTokenService, 30)
    {
    }

    public AuthService(
        IAppDbContext db,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        int refreshReuseGraceSeconds)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshReuseGraceSeconds = refreshReuseGraceSeconds;
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, string? ipAddress, string? userAgent)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
            return null;

        if (user.LockedUntil.HasValue && user.LockedUntil.Value > DateTime.UtcNow)
            throw new InvalidOperationException("ACCOUNT_LOCKED");

        if (string.IsNullOrEmpty(user.Password) || !_passwordHasher.VerifyPassword(request.Password, user.Password))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockedUntil = DateTime.UtcNow.Add(LockoutDuration);
            }
            await _db.SaveChangesAsync();
            return null;
        }

        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        user.LastLoginAt = DateTime.UtcNow;

        var (accessToken, expiresAt, _) = _jwtTokenService.GenerateAccessToken(user);
        var (plainRefreshToken, tokenHash) = _jwtTokenService.GenerateRefreshToken();

        var familyId = Guid.CreateVersion7();
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            FamilyId = familyId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress,
            UserAgent = userAgent
        };

        user.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = plainRefreshToken,
            ExpiresIn = (int)(expiresAt - DateTime.UtcNow).TotalSeconds,
            User = MapUser(user)
        };
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.Email == normalizedEmail);
        if (exists)
            return null;

        var user = new User
        {
            Email = normalizedEmail,
            Password = _passwordHasher.HashPassword(request.Password),
            Name = request.Name.Trim(),
            Surname = request.Surname?.Trim(),
            Nickname = request.Nickname?.Trim(),
            LastLoginAt = DateTime.UtcNow
        };

        var (accessToken, expiresAt, _) = _jwtTokenService.GenerateAccessToken(user);
        var (plainRefreshToken, tokenHash) = _jwtTokenService.GenerateRefreshToken();

        var familyId = Guid.CreateVersion7();
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            FamilyId = familyId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress,
            UserAgent = userAgent
        };

        user.RefreshTokens.Add(refreshToken);
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = plainRefreshToken,
            ExpiresIn = (int)(expiresAt - DateTime.UtcNow).TotalSeconds,
            User = MapUser(user)
        };
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string plainRefreshToken, string? ipAddress, string? userAgent)
    {
        var (_, tokenHash) = HashToken(plainRefreshToken);
        var token = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (token == null)
            return null;

        // Reuse detection with grace period
        if (token.IsRevoked)
        {
            // Grace window: if rotated within grace seconds and replacement token exists and is active
            if (token.RevokedAt.HasValue &&
                DateTime.UtcNow - token.RevokedAt.Value <= TimeSpan.FromSeconds(_refreshReuseGraceSeconds) &&
                token.ReplacedById.HasValue)
            {
                var replacedToken = await _db.RefreshTokens
                    .Include(t => t.User)
                    .FirstOrDefaultAsync(t => t.Id == token.ReplacedById.Value);

                if (replacedToken != null && replacedToken.IsActive)
                {
                    // Rotate the replacedToken and issue new token pair
                    replacedToken.RevokedAt = DateTime.UtcNow;

                    var (newAt, expAt, _) = _jwtTokenService.GenerateAccessToken(replacedToken.User);
                    var (nextPlainRt, nextRtHash) = _jwtTokenService.GenerateRefreshToken();

                    var nextRefreshToken = new RefreshToken
                    {
                        UserId = replacedToken.UserId,
                        TokenHash = nextRtHash,
                        FamilyId = replacedToken.FamilyId,
                        ExpiresAt = DateTime.UtcNow.AddDays(30),
                        CreatedByIp = ipAddress,
                        UserAgent = userAgent
                    };

                    replacedToken.ReplacedById = nextRefreshToken.Id;
                    _db.RefreshTokens.Add(nextRefreshToken);
                    await _db.SaveChangesAsync();

                    return new AuthResponse
                    {
                        AccessToken = newAt,
                        RefreshToken = nextPlainRt,
                        ExpiresIn = (int)(expAt - DateTime.UtcNow).TotalSeconds,
                        User = MapUser(replacedToken.User)
                    };
                }
            }

            // Outside grace period or invalid replacement token -> Revoke entire token family!
            var compromisedFamily = await _db.RefreshTokens
                .Where(t => t.FamilyId == token.FamilyId && t.RevokedAt == null)
                .ToListAsync();

            foreach (var t in compromisedFamily)
            {
                t.RevokedAt = DateTime.UtcNow;
            }
            await _db.SaveChangesAsync();
            return null;
        }

        if (token.IsExpired)
            return null;

        // Revoke current token
        token.RevokedAt = DateTime.UtcNow;

        // Generate new pair
        var (accessToken, expiresAt, _) = _jwtTokenService.GenerateAccessToken(token.User);
        var (newPlainRefreshToken, newTokenHash) = _jwtTokenService.GenerateRefreshToken();

        var newRefreshToken = new RefreshToken
        {
            UserId = token.UserId,
            TokenHash = newTokenHash,
            FamilyId = token.FamilyId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress,
            UserAgent = userAgent
        };

        token.ReplacedById = newRefreshToken.Id;
        _db.RefreshTokens.Add(newRefreshToken);
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = newPlainRefreshToken,
            ExpiresIn = (int)(expiresAt - DateTime.UtcNow).TotalSeconds,
            User = MapUser(token.User)
        };
    }

    public async Task<bool> RevokeTokenAsync(string plainRefreshToken)
    {
        var (_, tokenHash) = HashToken(plainRefreshToken);
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash);
        if (token == null)
            return false;

        token.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        return user == null ? null : MapUser(user);
    }

    private static (string PlainToken, string TokenHash) HashToken(string plainToken)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(plainToken);
        var hash = Convert.ToHexString(sha.ComputeHash(bytes)).ToLowerInvariant();
        return (plainToken, hash);
    }

    private static UserDto MapUser(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            Surname = user.Surname,
            Nickname = user.Nickname,
            Photo = user.Photo,
            Theme = user.Theme.ToString(),
            DateFormat = user.DateFormat.ToString(),
            NameOrder = user.NameOrder.ToString(),
            NameDisplayFormat = user.NameDisplayFormat.ToString(),
            Language = user.Language
        };
    }
}


