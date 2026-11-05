using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "Unauthorized" }));
            }
        };
    }
}

