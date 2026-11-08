using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Nametag.Application.Common.Interfaces;
using Nametag.Infrastructure.Persistence;
using Nametag.Infrastructure.Security;
using Nametag.Infrastructure.Services;
using StackExchange.Redis;

namespace Nametag.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Database=nametag;Username=postgres;Password=postgres";

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<ISecretEncryptionService, SecretEncryptionService>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPhotoStorageService, PhotoStorageService>();
        services.AddScoped<Application.Services.IGeocodeQueueService, Services.GeocodeQueueService>();

        // Redis configuration for Token Revocation
        var redisConnectionString = configuration.GetConnectionString("Redis")
            ?? configuration["Redis:ConnectionString"]
            ?? Environment.GetEnvironmentVariable("REDIS_URL");

        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            try
            {
                var options = ConfigurationOptions.Parse(redisConnectionString);
                options.AbortOnConnectFail = false;
                options.ConnectTimeout = 1000;
                options.SyncTimeout = 250;
                var multiplexer = ConnectionMultiplexer.Connect(options);
                services.AddSingleton<IConnectionMultiplexer>(multiplexer);
                services.AddSingleton<ITokenRevocationService, RedisTokenRevocationService>();
            }
            catch (Exception)
            {
                services.AddSingleton<ITokenRevocationService, NoopTokenRevocationService>();
            }
        }
        else
        {
            services.AddSingleton<ITokenRevocationService, NoopTokenRevocationService>();
        }

        if (configuration.GetValue<bool>("ENABLE_BACKGROUND_CRON", false))
        {
            services.AddHostedService<BackgroundServices.PurgeDeletedBackgroundService>();
            services.AddHostedService<BackgroundServices.GeocodeBackgroundService>();
        }

        return services;
    }
}


