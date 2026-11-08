using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.User;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public class UserService : IUserService
{
    private readonly IAppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenRevocationService _revocationService;
    private readonly IPhotoStorageService _photoStorageService;

    public UserService(
        IAppDbContext context,
        IPasswordHasher passwordHasher,
        ITokenRevocationService revocationService,
        IPhotoStorageService photoStorageService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _revocationService = revocationService;
        _photoStorageService = photoStorageService;
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        return MapToDto(user);
    }

    public async Task<UpdateProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // Check if email is already taken by another user
        var emailTaken = await _context.Users
            .AnyAsync(u => u.Email == normalizedEmail && u.Id != userId);

        if (emailTaken)
        {
            throw new ConflictException("Email already in use");
        }

        user.Name = request.Name.Trim();
        user.Surname = string.IsNullOrWhiteSpace(request.Surname) ? null : request.Surname.Trim();
        user.Nickname = string.IsNullOrWhiteSpace(request.Nickname) ? null : request.Nickname.Trim();
        user.Email = normalizedEmail;

        await _context.SaveChangesAsync();

        return new UpdateProfileResponse
        {
            User = MapToDto(user),
            EmailChanged = false
        };
    }

    public async Task ChangePasswordAsync(Guid userId, UpdatePasswordRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        if (string.IsNullOrEmpty(user.Password))
        {
            throw new BadRequestException("Cannot change password for OAuth accounts");
        }

        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.Password))
        {
            throw new BadRequestException("Current password is incorrect");
        }

        user.Password = _passwordHasher.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        // Revoke all tokens for this user upon password change
        await _revocationService.RevokeUserTokensAsync(userId);
    }

    public async Task<Theme> UpdateThemeAsync(Guid userId, Theme theme)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.Theme = theme;
        await _context.SaveChangesAsync();

        return user.Theme;
    }

    public async Task<string> UpdateLanguageAsync(Guid userId, string language)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.Language = language;
        await _context.SaveChangesAsync();

        return user.Language;
    }

    public async Task<DateFormat> UpdateDateFormatAsync(Guid userId, DateFormat dateFormat)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.DateFormat = dateFormat;
        await _context.SaveChangesAsync();

        return user.DateFormat;
    }

    public async Task<NameOrder> UpdateNameOrderAsync(Guid userId, NameOrder nameOrder)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.NameOrder = nameOrder;
        await _context.SaveChangesAsync();

        return user.NameOrder;
    }

    public async Task<NameDisplayFormat> UpdateNameDisplayFormatAsync(Guid userId, NameDisplayFormat format)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.NameDisplayFormat = format;
        await _context.SaveChangesAsync();

        return user.NameDisplayFormat;
    }

    public async Task<string?> UpdateGraphDisplayAsync(Guid userId, string? graphMode)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.GraphMode = graphMode;
        await _context.SaveChangesAsync();

        return user.GraphMode;
    }

    public async Task<bool> UpdateGeocodingAsync(Guid userId, bool geocodingEnabled)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.GeocodingEnabled = geocodingEnabled;
        await _context.SaveChangesAsync();

        return user.GeocodingEnabled;
    }

    public async Task<int> UpdateReminderLeadDaysAsync(Guid userId, int days)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.DefaultReminderLeadDays = days;
        await _context.SaveChangesAsync();

        return user.DefaultReminderLeadDays;
    }

    public async Task<(bool enabled, int weekday)> UpdateWeeklyDigestAsync(Guid userId, bool enabled, int weekday)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        user.WeeklyDigestEnabled = enabled;
        user.WeeklyDigestWeekday = weekday;
        await _context.SaveChangesAsync();

        return (user.WeeklyDigestEnabled, user.WeeklyDigestWeekday);
    }

    public async Task DeleteAccountAsync(Guid userId, DeleteAccountRequest request)
    {
        if (request.ConfirmationText != "DELETE")
        {
            throw new BadRequestException("Confirmation text must be \"DELETE\"");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            throw new NotFoundException("User not found");
        }

        if (!string.IsNullOrEmpty(user.Password))
        {
            if (string.IsNullOrEmpty(request.Password))
            {
                throw new BadRequestException("Password is required");
            }

            if (!_passwordHasher.VerifyPassword(request.Password, user.Password))
            {
                throw new BadRequestException("Password is incorrect");
            }
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        // Revoke user token immediately
        await _revocationService.RevokeUserTokensAsync(userId);
    }

    public async Task<string> UploadPhotoAsync(Guid userId, Stream stream, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User not found");

        var filename = await _photoStorageService.SaveUserPhotoAsync(userId, stream, cancellationToken);
        user.Photo = filename;
        await _context.SaveChangesAsync(cancellationToken);
        return filename;
    }

    public async Task DeletePhotoAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User not found");

        await _photoStorageService.DeleteUserPhotoAsync(userId, cancellationToken);
        user.Photo = null;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static UserProfileDto MapToDto(User user)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            Surname = user.Surname,
            Nickname = user.Nickname,
            Theme = user.Theme,
            DateFormat = user.DateFormat,
            Language = user.Language,
            NameOrder = user.NameOrder,
            NameDisplayFormat = user.NameDisplayFormat,
            GraphMode = user.GraphMode,
            GeocodingEnabled = user.GeocodingEnabled,
            DefaultReminderLeadDays = user.DefaultReminderLeadDays,
            WeeklyDigestEnabled = user.WeeklyDigestEnabled,
            WeeklyDigestWeekday = user.WeeklyDigestWeekday,
            Photo = user.Photo,
            EmailVerified = true,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
        };
    }
}
