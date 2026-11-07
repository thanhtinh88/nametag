using Nametag.Application.DTOs.Relationship;

namespace Nametag.Application.Services;

public interface IRelationshipService
{
    // Relationships
    Task<List<RelationshipDto>> GetRelationshipsAsync(Guid userId, CancellationToken ct = default);
    Task<RelationshipDto> GetRelationshipByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<RelationshipDto> CreateRelationshipAsync(Guid userId, CreateRelationshipRequest request, CancellationToken ct = default);
    Task<RelationshipDto> UpdateRelationshipAsync(Guid userId, Guid id, UpdateRelationshipRequest request, CancellationToken ct = default);
    Task SoftDeleteRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<RelationshipDto> RestoreRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task PermanentDeleteRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default);

    // Relationship Types
    Task<List<RelationshipTypeDto>> GetRelationshipTypesAsync(Guid userId, CancellationToken ct = default);
    Task<RelationshipTypeDto> GetRelationshipTypeByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<RelationshipTypeDto> CreateRelationshipTypeAsync(Guid userId, CreateRelationshipTypeRequest request, CancellationToken ct = default);
    Task<RelationshipTypeDto> UpdateRelationshipTypeAsync(Guid userId, Guid id, UpdateRelationshipTypeRequest request, CancellationToken ct = default);
    Task SoftDeleteRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<RelationshipTypeDto> RestoreRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task PermanentDeleteRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default);
}

