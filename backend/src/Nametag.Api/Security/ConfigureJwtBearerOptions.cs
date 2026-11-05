using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Nametag.Application.Common.Interfaces;
using Nametag.Infrastructure.Security;

namespace Nametag.Api.Security;

public class ConfigureJwtBearerOptions : IConfigureNamedOptions<JwtBearerOptions>
{
    private readonly IJwtTokenService _jwtService;
    private readonly IConfiguration _configuration;

    public ConfigureJwtBearerOptions(IJwtTokenService jwtService, IConfiguration configuration)
    {
        _jwtService = jwtService;
        _configuration = configuration;
    }

    public void Configure(string? name, JwtBearerOptions options)
    {
        if (name == JwtBearerDefaults.AuthenticationScheme)
        {
            Configure(options);
        }
    }

    public void Configure(JwtBearerOptions options)
    {
        var rsaKey = (_jwtService as JwtTokenService)?.GetSigningKey();
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _configuration["Jwt:Issuer"] ?? "nametag-api",
            ValidateAudience = true,
            ValidAudience = _configuration["Jwt:Audience"] ?? "nametag-app",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = rsaKey,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var revocationService = context.HttpContext.RequestServices.GetService<ITokenRevocationService>();
                if (revocationService == null)
                {
                    return;
                }

                var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                var sub = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                    ?? context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                Guid? userId = Guid.TryParse(sub, out var parsedGuid) ? parsedGuid : null;

                DateTime? issuedAt = null;
                var iatClaim = context.Principal?.FindFirst(JwtRegisteredClaimNames.Iat)?.Value;
                if (long.TryParse(iatClaim, out var iatEpoch))
                {
                    issuedAt = DateTimeOffset.FromUnixTimeSeconds(iatEpoch).UtcDateTime;
                }

                var isRevoked = await revocationService.IsRevokedAsync(jti, userId, issuedAt, context.HttpContext.RequestAborted);
                if (isRevoked)
                {
                    context.Fail("Token has been revoked");
                }
            },
            OnChallenge = context =>
            {
                if (!context.Response.HasStarted)
                {
                    context.HandleResponse();
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json";
                    return context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "Unauthorized" }));
                }
                return Task.CompletedTask;
            }
        };
    }
}


