using Microsoft.Extensions.Logging;
using Nametag.Application.Common.Interfaces;
using StackExchange.Redis;

namespace Nametag.Infrastructure.Security;

public class RedisTokenRevocationService : ITokenRevocationService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisTokenRevocationService> _logger;
    private const string JtiPrefix = "revoked:jti:";
    private const string UserPrefix = "revoked:user:";

    public RedisTokenRevocationService(IConnectionMultiplexer? redis, ILogger<RedisTokenRevocationService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task RevokeJtiAsync(string jti, TimeSpan expiry, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(jti) || _redis == null || !_redis.IsConnected)
        {
            return;
        }

        try
        {
            var db = _redis.GetDatabase();
            var ttl = expiry <= TimeSpan.Zero ? TimeSpan.FromMinutes(15) : expiry;
            await db.StringSetAsync(JtiPrefix + jti, "1", ttl);
        }
        catch (Exception ex)
        {
            // Fail-open: log warning and do not block request
            _logger.LogWarning(ex, "Failed to revoke token jti in Redis (fail-open)");
        }
    }

    public async Task RevokeUserTokensAsync(Guid userId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty || _redis == null || !_redis.IsConnected)
        {
            return;
        }

        try
        {
            var db = _redis.GetDatabase();
            var unixNow = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            // Tokens have a maximum lifetime of 15 minutes, so keeping the user revocation marker for 15 minutes is sufficient
            await db.StringSetAsync(UserPrefix + userId.ToString(), unixNow.ToString(), TimeSpan.FromMinutes(15));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to revoke user tokens in Redis (fail-open)");
        }
    }

    public async Task<bool> IsRevokedAsync(string? jti, Guid? userId, DateTime? issuedAt, CancellationToken ct = default)
    {
        if (_redis == null || !_redis.IsConnected)
        {
            return false;
        }

        try
        {
            var db = _redis.GetDatabase();

            if (!string.IsNullOrWhiteSpace(jti))
            {
                var jtiRevoked = await db.KeyExistsAsync(JtiPrefix + jti);
                if (jtiRevoked)
                {
                    return true;
                }
            }

            if (userId.HasValue && userId.Value != Guid.Empty && issuedAt.HasValue)
            {
                var userRevokedAtVal = await db.StringGetAsync(UserPrefix + userId.Value.ToString());
                if (userRevokedAtVal.HasValue && long.TryParse(userRevokedAtVal.ToString(), out var revokedUnix))
                {
                    var revokedAt = DateTimeOffset.FromUnixTimeSeconds(revokedUnix).UtcDateTime;
                    if (issuedAt.Value.ToUniversalTime() <= revokedAt)
                    {
                        return true;
                    }
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            // Fail-open: Redis down, allow token
            _logger.LogWarning(ex, "Failed to check token revocation status in Redis (fail-open)");
            return false;
        }
    }
}

public class NoopTokenRevocationService : ITokenRevocationService
{
    public Task RevokeJtiAsync(string jti, TimeSpan expiry, CancellationToken ct = default) => Task.CompletedTask;
    public Task RevokeUserTokensAsync(Guid userId, CancellationToken ct = default) => Task.CompletedTask;
    public Task<bool> IsRevokedAsync(string? jti, Guid? userId, DateTime? issuedAt, CancellationToken ct = default) => Task.FromResult(false);
}
