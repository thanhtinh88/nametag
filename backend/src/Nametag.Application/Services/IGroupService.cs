using Nametag.Application.DTOs.Group;

namespace Nametag.Application.Services;

public interface IGroupService
{
    Task<List<GroupDto>> GetGroupsAsync(Guid userId, CancellationToken ct = default);
    Task<GroupDto> GetGroupByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<GroupDto> CreateGroupAsync(Guid userId, CreateGroupRequest request, CancellationToken ct = default);
    Task<GroupDto> UpdateGroupAsync(Guid userId, Guid id, UpdateGroupRequest request, CancellationToken ct = default);
    Task SoftDeleteGroupAsync(Guid userId, Guid id, bool deletePeople, CancellationToken ct = default);
    Task<GroupDto> RestoreGroupAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task PermanentDeleteGroupAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task AddMemberAsync(Guid userId, Guid id, Guid personId, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid userId, Guid id, Guid personId, CancellationToken ct = default);
}

