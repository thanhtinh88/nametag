using Nametag.Application.DTOs.Deleted;

namespace Nametag.Application.Services;

public interface IDeletedService
{
    Task<DeletedResponseDto> GetDeletedAsync(Guid userId, string? type, CancellationToken ct = default);
}

