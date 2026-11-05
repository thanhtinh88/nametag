using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Nametag.Application.Common.Interfaces;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Security;

public class JwtTokenService : IJwtTokenService
{
    private readonly RSA _rsa;
    private readonly RsaSecurityKey _signingKey;
    private readonly string _keyId;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessTokenLifetimeMinutes;

    public JwtTokenService(IConfiguration configuration)
    {
        _issuer = configuration["Jwt:Issuer"] ?? "nametag-api";
        _audience = configuration["Jwt:Audience"] ?? "nametag-app";
        _keyId = configuration["Jwt:KeyId"] ?? "nametag-key-1";
        _accessTokenLifetimeMinutes = int.TryParse(configuration["Jwt:AccessTokenLifetimeMinutes"], out var min) ? min : 15;

        var privateKeyPem = configuration["Jwt:PrivateKeyPem"];
        _rsa = RSA.Create();

        if (!string.IsNullOrEmpty(privateKeyPem))
        {
            _rsa.ImportFromPem(privateKeyPem);
        }
        else
        {
            // Fallback: generate a 2048-bit RSA key for dev/test if none provided
            _rsa.KeySize = 2048;
        }

        _signingKey = new RsaSecurityKey(_rsa)
        {
            KeyId = _keyId
        };
    }

    public (string Token, DateTime ExpiresAt, string Jti) GenerateAccessToken(User user)
    {
        var jti = Guid.NewGuid().ToString("N");
        var expiresAt = DateTime.UtcNow.AddMinutes(_accessTokenLifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, jti),
            new("name", user.Name),
        };

        if (!string.IsNullOrEmpty(user.Surname)) claims.Add(new("surname", user.Surname));
        if (!string.IsNullOrEmpty(user.Nickname)) claims.Add(new("nickname", user.Nickname));

        var credentials = new SigningCredentials(_signingKey, SecurityAlgorithms.RsaSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = credentials
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(tokenDescriptor);
        return (handler.WriteToken(token), expiresAt, jti);
    }

    public (string PlainToken, string TokenHash) GenerateRefreshToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        var plain = Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        using var sha = SHA256.Create();
        var hashBytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(plain));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        return (plain, hash);
    }

    public string GetJwkSetJson()
    {
        var parameters = _rsa.ExportParameters(false);
        var jwk = new
        {
            kty = "RSA",
            use = "sig",
            alg = "RS256",
            kid = _keyId,
            n = Base64UrlEncode(parameters.Modulus!),
            e = Base64UrlEncode(parameters.Exponent!)
        };

        var jwks = new { keys = new[] { jwk } };
        return JsonSerializer.Serialize(jwks);
    }

    public RsaSecurityKey GetSigningKey() => _signingKey;

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }
}

