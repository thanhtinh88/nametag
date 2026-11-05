namespace Nametag.Application.Common.Interfaces;

public interface ITokenRevocationService
{
    Task RevokeJtiAsync(string jti, TimeSpan expiry, CancellationToken ct = default);
    Task RevokeUserTokensAsync(Guid userId, CancellationToken ct = default);
    Task<bool> IsRevokedAsync(string? jti, Guid? userId, DateTime? issuedAt, CancellationToken ct = default);
}

