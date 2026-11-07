using Nametag.Application.DTOs.Gang;

namespace Nametag.Application.Services;

public interface IGangService
{
    Task<List<GangDto>> GetGangsAsync(Guid userId, CancellationToken ct = default);
    Task<GangDto> GetGangByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<GangDto> CreateGangAsync(Guid userId, CreateGangRequest request, CancellationToken ct = default);
    Task<GangDto> UpdateGangAsync(Guid userId, Guid id, UpdateGangRequest request, CancellationToken ct = default);
    Task DeleteGangAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<GangMemberDto> AddOrUpdateMemberAsync(Guid userId, Guid gangId, AddGangMemberRequest request, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid userId, Guid gangId, Guid personId, CancellationToken ct = default);
}

