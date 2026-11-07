using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Group;
using Nametag.Application.DTOs.Relationship;
using Nametag.Domain.Entities;

namespace Nametag.Application.Services;

public class RelationshipService : IRelationshipService
{
    private static readonly string[] PresetColors =
    [
        "#ef4444", "#f97316", "#f59e0b", "#10b981",
        "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
        "#ec4899", "#64748b"
    ];

    private readonly IAppDbContext _db;

    public RelationshipService(IAppDbContext db)
    {
        _db = db;
    }

    private static string GetRandomColor()
    {
        return PresetColors[Random.Shared.Next(PresetColors.Length)];
    }

    private static string NormalizeName(string name)
    {
        return Regex.Replace(name.Trim().ToUpper(), @"\s+", "_");
    }

    // ==========================================
    // Relationships
    // ==========================================

    public async Task<List<RelationshipDto>> GetRelationshipsAsync(Guid userId, CancellationToken ct = default)
    {
        var relationships = await _db.Relationships
            .Where(r => r.Person != null && r.Person.UserId == userId && r.Person.DeletedAt == null &&
                        r.RelatedPerson != null && r.RelatedPerson.DeletedAt == null &&
                        (r.RelationshipTypeId == null || (r.RelationshipType != null && r.RelationshipType.DeletedAt == null)))
            .Include(r => r.Person)
            .Include(r => r.RelatedPerson)
            .Include(r => r.RelationshipType)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return relationships.Select(MapRelationshipToDto).ToList();
    }

    public async Task<RelationshipDto> GetRelationshipByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var relationship = await _db.Relationships
            .Where(r => r.Id == id && r.Person != null && r.Person.UserId == userId &&
                        r.RelatedPerson != null && r.RelatedPerson.DeletedAt == null &&
                        (r.RelationshipTypeId == null || (r.RelationshipType != null && r.RelationshipType.DeletedAt == null)))
            .Include(r => r.Person)
            .Include(r => r.RelatedPerson)
            .Include(r => r.RelationshipType)
            .FirstOrDefaultAsync(ct);

        if (relationship == null)
        {
            throw new NotFoundException("Relationship not found");
        }

        return MapRelationshipToDto(relationship);
    }

    public async Task<RelationshipDto> CreateRelationshipAsync(Guid userId, CreateRelationshipRequest request, CancellationToken ct = default)
    {
        if (!request.RelationshipTypeId.HasValue || request.RelationshipTypeId.Value == Guid.Empty)
        {
            throw new BadRequestException("Relationship type is required");
        }

        if (request.PersonId == request.RelatedPersonId)
        {
            throw new BadRequestException("Cannot create a relationship with the same person");
        }

        var duplicate = await _db.Relationships.AnyAsync(
            r => r.PersonId == request.PersonId &&
                 r.RelatedPersonId == request.RelatedPersonId &&
                 r.RelationshipTypeId == request.RelationshipTypeId &&
                 r.DeletedAt == null,
            ct);

        if (duplicate)
        {
            throw new BadRequestException("This relationship already exists");
        }

        var person = await _db.People.FirstOrDefaultAsync(
            p => p.Id == request.PersonId && p.UserId == userId && p.DeletedAt == null,
            ct);

        var relatedPerson = await _db.People.FirstOrDefaultAsync(
            p => p.Id == request.RelatedPersonId && p.UserId == userId && p.DeletedAt == null,
            ct);

        if (person == null || relatedPerson == null)
        {
            throw new NotFoundException("One or both people not found");
        }

        var relationshipType = await _db.RelationshipTypes.FirstOrDefaultAsync(
            rt => rt.Id == request.RelationshipTypeId.Value && rt.UserId == userId && rt.DeletedAt == null,
            ct);

        if (relationshipType == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        var verificationStatus = !string.IsNullOrWhiteSpace(request.VerificationStatus)
            ? request.VerificationStatus
            : "CONFIRMED";
        var confidence = !string.IsNullOrWhiteSpace(request.Confidence)
            ? request.Confidence
            : "HIGH";

        var primary = new Relationship
        {
            PersonId = request.PersonId,
            RelatedPersonId = request.RelatedPersonId,
            RelationshipTypeId = request.RelationshipTypeId,
            VerificationStatus = verificationStatus,
            Confidence = confidence,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Source = request.Source,
            Notes = request.Notes
        };

        _db.Relationships.Add(primary);

        var inverseTypeId = relationshipType.InverseId ?? request.RelationshipTypeId.Value;
        var existingInverse = await _db.Relationships.FirstOrDefaultAsync(
            r => r.PersonId == request.RelatedPersonId &&
                 r.RelatedPersonId == request.PersonId &&
                 r.RelationshipTypeId == inverseTypeId &&
                 r.DeletedAt == null,
            ct);

        if (existingInverse == null)
        {
            var inverse = new Relationship
            {
                PersonId = request.RelatedPersonId,
                RelatedPersonId = request.PersonId,
                RelationshipTypeId = inverseTypeId,
                VerificationStatus = verificationStatus,
                Confidence = confidence,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Source = request.Source,
                Notes = request.Notes
            };

            _db.Relationships.Add(inverse);
        }

        await _db.SaveChangesAsync(ct);

        return await GetRelationshipByIdAsync(userId, primary.Id, ct);
    }

    public async Task<RelationshipDto> UpdateRelationshipAsync(Guid userId, Guid id, UpdateRelationshipRequest request, CancellationToken ct = default)
    {
        var existing = await _db.Relationships
            .Include(r => r.Person)
            .FirstOrDefaultAsync(r => r.Id == id && r.DeletedAt == null, ct);

        if (existing == null || existing.Person?.UserId != userId)
        {
            throw new NotFoundException("Relationship not found");
        }

        if (!request.RelationshipTypeId.HasValue || request.RelationshipTypeId.Value == Guid.Empty)
        {
            throw new BadRequestException("Relationship type is required");
        }

        var relationshipType = await _db.RelationshipTypes.FirstOrDefaultAsync(
            rt => rt.Id == request.RelationshipTypeId.Value && rt.UserId == userId && rt.DeletedAt == null,
            ct);

        if (relationshipType == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        existing.RelationshipTypeId = request.RelationshipTypeId;
        if (!string.IsNullOrWhiteSpace(request.VerificationStatus))
        {
            existing.VerificationStatus = request.VerificationStatus;
        }
        if (request.Confidence != null)
        {
            existing.Confidence = request.Confidence;
        }
        if (request.StartDate != null)
        {
            existing.StartDate = request.StartDate;
        }
        if (request.EndDate != null)
        {
            existing.EndDate = request.EndDate;
        }
        if (request.Source != null)
        {
            existing.Source = request.Source;
        }
        if (request.Notes != null)
        {
            existing.Notes = request.Notes;
        }

        var inverse = await _db.Relationships.FirstOrDefaultAsync(
            r => r.PersonId == existing.RelatedPersonId &&
                 r.RelatedPersonId == existing.PersonId &&
                 r.DeletedAt == null,
            ct);

        if (inverse != null && relationshipType.InverseId.HasValue)
        {
            inverse.RelationshipTypeId = relationshipType.InverseId.Value;
            if (!string.IsNullOrWhiteSpace(request.VerificationStatus))
            {
                inverse.VerificationStatus = request.VerificationStatus;
            }
            if (request.Confidence != null)
            {
                inverse.Confidence = request.Confidence;
            }
            if (request.StartDate != null)
            {
                inverse.StartDate = request.StartDate;
            }
            if (request.EndDate != null)
            {
                inverse.EndDate = request.EndDate;
            }
            if (request.Source != null)
            {
                inverse.Source = request.Source;
            }
            if (request.Notes != null)
            {
                inverse.Notes = request.Notes;
            }
        }

        await _db.SaveChangesAsync(ct);

        return await GetRelationshipByIdAsync(userId, id, ct);
    }

    public async Task SoftDeleteRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var existing = await _db.Relationships
            .Include(r => r.Person)
            .FirstOrDefaultAsync(r => r.Id == id && r.DeletedAt == null, ct);

        if (existing == null || existing.Person?.UserId != userId)
        {
            throw new NotFoundException("Relationship not found");
        }

        existing.DeletedAt = DateTime.UtcNow;

        var inverse = await _db.Relationships.FirstOrDefaultAsync(
            r => r.PersonId == existing.RelatedPersonId &&
                 r.RelatedPersonId == existing.PersonId &&
                 r.DeletedAt == null,
            ct);

        if (inverse != null)
        {
            inverse.DeletedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<RelationshipDto> RestoreRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var existing = await _db.Relationships
            .IgnoreQueryFilters()
            .Include(r => r.Person)
            .FirstOrDefaultAsync(r => r.Id == id && r.Person != null && r.Person.UserId == userId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Relationship not found");
        }

        if (existing.DeletedAt == null)
        {
            throw new BadRequestException("Relationship is not deleted");
        }

        existing.DeletedAt = null;

        var inverse = await _db.Relationships
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                r => r.PersonId == existing.RelatedPersonId &&
                     r.RelatedPersonId == existing.PersonId &&
                     r.DeletedAt != null,
                ct);

        if (inverse != null)
        {
            inverse.DeletedAt = null;
        }

        await _db.SaveChangesAsync(ct);

        return await GetRelationshipByIdAsync(userId, id, ct);
    }

    public async Task PermanentDeleteRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var existing = await _db.Relationships
            .IgnoreQueryFilters()
            .Include(r => r.Person)
            .FirstOrDefaultAsync(r => r.Id == id && r.Person != null && r.Person.UserId == userId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Relationship not found");
        }

        if (existing.DeletedAt == null)
        {
            throw new BadRequestException("Relationship is not deleted");
        }

        var inverse = await _db.Relationships
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                r => r.PersonId == existing.RelatedPersonId &&
                     r.RelatedPersonId == existing.PersonId &&
                     r.DeletedAt != null,
                ct);

        if (inverse != null)
        {
            _db.Relationships.Remove(inverse);
        }

        _db.Relationships.Remove(existing);
        await _db.SaveChangesAsync(ct);
    }

    // ==========================================
    // Relationship Types
    // ==========================================

    public async Task<List<RelationshipTypeDto>> GetRelationshipTypesAsync(Guid userId, CancellationToken ct = default)
    {
        var types = await _db.RelationshipTypes
            .Where(rt => rt.UserId == userId)
            .Include(rt => rt.Inverse)
            .OrderBy(rt => rt.Name)
            .ToListAsync(ct);

        return types.Select(MapTypeToDto).ToList();
    }

    public async Task<RelationshipTypeDto> GetRelationshipTypeByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var type = await _db.RelationshipTypes
            .Where(rt => rt.Id == id && rt.UserId == userId)
            .Include(rt => rt.Inverse)
            .FirstOrDefaultAsync(ct);

        if (type == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        return MapTypeToDto(type);
    }

    public async Task<RelationshipTypeDto> CreateRelationshipTypeAsync(Guid userId, CreateRelationshipTypeRequest request, CancellationToken ct = default)
    {
        var normalizedName = NormalizeName(request.Name);

        var exists = await _db.RelationshipTypes.AnyAsync(
            rt => rt.UserId == userId && rt.Name.ToLower() == normalizedName.ToLower(),
            ct);

        if (exists)
        {
            throw new BadRequestException("A relationship type with this name already exists");
        }

        var color = !string.IsNullOrWhiteSpace(request.Color) ? request.Color.Trim() : GetRandomColor();
        var category = !string.IsNullOrWhiteSpace(request.Category) ? request.Category.Trim() : "CRIMINAL";
        var lineStyle = !string.IsNullOrWhiteSpace(request.LineStyle) ? request.LineStyle.Trim() : "SOLID";

        if (request.Symmetric == true)
        {
            var symType = new RelationshipType
            {
                UserId = userId,
                Name = normalizedName,
                Label = request.Label.Trim(),
                Category = category,
                DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : "BIDIRECTIONAL",
                LineStyle = lineStyle,
                Color = color,
            };

            _db.RelationshipTypes.Add(symType);
            symType.InverseId = symType.Id;
            await _db.SaveChangesAsync(ct);

            return await GetRelationshipTypeByIdAsync(userId, symType.Id, ct);
        }

        Guid? finalInverseId = (request.InverseId.HasValue && request.InverseId.Value != Guid.Empty)
            ? request.InverseId.Value
            : null;

        if (!string.IsNullOrWhiteSpace(request.InverseLabel) && finalInverseId == null)
        {
            var inverseNormalized = NormalizeName(request.InverseLabel);

            var inverseExists = await _db.RelationshipTypes.AnyAsync(
                rt => rt.UserId == userId && rt.Name.ToLower() == inverseNormalized.ToLower(),
                ct);

            if (inverseExists)
            {
                throw new BadRequestException($"The inverse relationship type \"{request.InverseLabel}\" already exists");
            }

            var inverseType = new RelationshipType
            {
                UserId = userId,
                Name = inverseNormalized,
                Label = request.InverseLabel.Trim(),
                Category = category,
                DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : "DIRECTED",
                LineStyle = lineStyle,
                Color = color,
            };

            _db.RelationshipTypes.Add(inverseType);

            var mainType = new RelationshipType
            {
                UserId = userId,
                Name = normalizedName,
                Label = request.Label.Trim(),
                Category = category,
                DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : "DIRECTED",
                LineStyle = lineStyle,
                Color = color,
                InverseId = inverseType.Id,
            };

            _db.RelationshipTypes.Add(mainType);
            inverseType.InverseId = mainType.Id;

            await _db.SaveChangesAsync(ct);
            return await GetRelationshipTypeByIdAsync(userId, mainType.Id, ct);
        }

        var relType = new RelationshipType
        {
            UserId = userId,
            Name = normalizedName,
            Label = request.Label.Trim(),
            Category = category,
            DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : "DIRECTED",
            LineStyle = lineStyle,
            Color = color,
            InverseId = finalInverseId,
        };

        _db.RelationshipTypes.Add(relType);
        await _db.SaveChangesAsync(ct);

        return await GetRelationshipTypeByIdAsync(userId, relType.Id, ct);
    }

    public async Task<RelationshipTypeDto> UpdateRelationshipTypeAsync(Guid userId, Guid id, UpdateRelationshipTypeRequest request, CancellationToken ct = default)
    {
        var existing = await _db.RelationshipTypes
            .FirstOrDefaultAsync(rt => rt.Id == id && rt.UserId == userId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        var normalizedName = NormalizeName(request.Name);

        var duplicate = await _db.RelationshipTypes.AnyAsync(
            rt => rt.UserId == userId && rt.Id != id && rt.Name.ToLower() == normalizedName.ToLower(),
            ct);

        if (duplicate)
        {
            throw new BadRequestException("A relationship type with this name already exists");
        }

        var color = !string.IsNullOrWhiteSpace(request.Color) ? request.Color.Trim() : (existing.Color ?? GetRandomColor());
        var category = !string.IsNullOrWhiteSpace(request.Category) ? request.Category.Trim() : existing.Category;
        var lineStyle = !string.IsNullOrWhiteSpace(request.LineStyle) ? request.LineStyle.Trim() : existing.LineStyle;

        if (request.Symmetric == true)
        {
            existing.Name = normalizedName;
            existing.Label = request.Label.Trim();
            existing.Category = category;
            existing.DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : "BIDIRECTIONAL";
            existing.LineStyle = lineStyle;
            existing.Color = color;
            existing.InverseId = id;

            await _db.SaveChangesAsync(ct);
            return await GetRelationshipTypeByIdAsync(userId, id, ct);
        }

        Guid? finalInverseId = (request.InverseId.HasValue && request.InverseId.Value != Guid.Empty)
            ? request.InverseId.Value
            : null;

        if (!string.IsNullOrWhiteSpace(request.InverseLabel) && finalInverseId == null)
        {
            var inverseNormalized = NormalizeName(request.InverseLabel);

            var inverseExists = await _db.RelationshipTypes.AnyAsync(
                rt => rt.UserId == userId && rt.Id != id && rt.Name.ToLower() == inverseNormalized.ToLower(),
                ct);

            if (inverseExists)
            {
                throw new BadRequestException($"The inverse relationship type \"{request.InverseLabel}\" already exists");
            }

            var inverseType = new RelationshipType
            {
                UserId = userId,
                Name = inverseNormalized,
                Label = request.InverseLabel.Trim(),
                Category = category,
                DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : "DIRECTED",
                LineStyle = lineStyle,
                Color = color,
                InverseId = id,
            };

            _db.RelationshipTypes.Add(inverseType);
            finalInverseId = inverseType.Id;
        }

        existing.Name = normalizedName;
        existing.Label = request.Label.Trim();
        existing.Category = category;
        existing.DirectionType = !string.IsNullOrWhiteSpace(request.DirectionType) ? request.DirectionType.Trim() : existing.DirectionType;
        existing.LineStyle = lineStyle;
        existing.Color = color;
        existing.InverseId = finalInverseId;

        if (finalInverseId.HasValue && finalInverseId.Value != id)
        {
            var inverseToUpdate = await _db.RelationshipTypes.FirstOrDefaultAsync(
                rt => rt.Id == finalInverseId.Value && rt.UserId == userId,
                ct);

            if (inverseToUpdate != null)
            {
                inverseToUpdate.Color = color;
            }
        }

        await _db.SaveChangesAsync(ct);

        return await GetRelationshipTypeByIdAsync(userId, id, ct);
    }

    public async Task SoftDeleteRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var existing = await _db.RelationshipTypes
            .FirstOrDefaultAsync(rt => rt.Id == id && rt.UserId == userId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        var inUseCount = await _db.Relationships.CountAsync(
            r => r.RelationshipTypeId == id &&
                 r.DeletedAt == null &&
                 r.Person != null && r.Person.DeletedAt == null &&
                 r.RelatedPerson != null && r.RelatedPerson.DeletedAt == null,
            ct);

        if (inUseCount > 0)
        {
            throw new BadRequestException($"Cannot delete relationship type that is in use by {inUseCount} relationship(s)");
        }

        existing.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<RelationshipTypeDto> RestoreRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var existing = await _db.RelationshipTypes
            .IgnoreQueryFilters()
            .Include(rt => rt.Inverse)
            .FirstOrDefaultAsync(rt => rt.Id == id && rt.UserId == userId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        if (existing.DeletedAt == null)
        {
            throw new BadRequestException("Relationship type is not deleted");
        }

        existing.DeletedAt = null;
        await _db.SaveChangesAsync(ct);

        return MapTypeToDto(existing);
    }

    public async Task PermanentDeleteRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var existing = await _db.RelationshipTypes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(rt => rt.Id == id && rt.UserId == userId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Relationship type not found");
        }

        if (existing.DeletedAt == null)
        {
            throw new BadRequestException("Relationship type is not deleted");
        }

        var peopleWithRelation = await _db.People
            .IgnoreQueryFilters()
            .Where(p => p.RelationshipToUserId == id)
            .ToListAsync(ct);

        foreach (var person in peopleWithRelation)
        {
            person.RelationshipToUserId = null;
        }

        var relsWithRelation = await _db.Relationships
            .IgnoreQueryFilters()
            .Where(r => r.RelationshipTypeId == id)
            .ToListAsync(ct);

        foreach (var rel in relsWithRelation)
        {
            rel.RelationshipTypeId = null;
        }

        var typesWithInverse = await _db.RelationshipTypes
            .IgnoreQueryFilters()
            .Where(rt => rt.InverseId == id)
            .ToListAsync(ct);

        foreach (var type in typesWithInverse)
        {
            type.InverseId = null;
        }

        _db.RelationshipTypes.Remove(existing);
        await _db.SaveChangesAsync(ct);
    }

    private static RelationshipDto MapRelationshipToDto(Relationship r)
    {
        return new RelationshipDto
        {
            Id = r.Id,
            PersonId = r.PersonId,
            RelatedPersonId = r.RelatedPersonId,
            RelationshipTypeId = r.RelationshipTypeId,
            VerificationStatus = r.VerificationStatus,
            Confidence = r.Confidence,
            StartDate = r.StartDate,
            EndDate = r.EndDate,
            Source = r.Source,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            DeletedAt = r.DeletedAt,
            Person = r.Person == null ? null : new PersonSummaryDto
            {
                Id = r.Person.Id,
                Name = r.Person.Name,
                Surname = r.Person.Surname,
                Nickname = r.Person.Nickname,
                DisplayNameOverride = r.Person.DisplayNameOverride,
                Photo = r.Person.Photo,
            },
            RelatedPerson = r.RelatedPerson == null ? null : new PersonSummaryDto
            {
                Id = r.RelatedPerson.Id,
                Name = r.RelatedPerson.Name,
                Surname = r.RelatedPerson.Surname,
                Nickname = r.RelatedPerson.Nickname,
                DisplayNameOverride = r.RelatedPerson.DisplayNameOverride,
                Photo = r.RelatedPerson.Photo,
            },
            RelationshipType = r.RelationshipType == null ? null : new RelationshipTypeSummaryDto
            {
                Id = r.RelationshipType.Id,
                Name = r.RelationshipType.Name,
                Label = r.RelationshipType.Label,
                Color = r.RelationshipType.Color,
            }
        };
    }

    private static RelationshipTypeDto MapTypeToDto(RelationshipType rt)
    {
        return new RelationshipTypeDto
        {
            Id = rt.Id,
            UserId = rt.UserId,
            Name = rt.Name,
            Label = rt.Label,
            Category = rt.Category,
            DirectionType = rt.DirectionType,
            LineStyle = rt.LineStyle,
            Color = rt.Color,
            InverseId = rt.InverseId,
            Inverse = rt.Inverse == null ? null : new RelationshipTypeSummaryDto
            {
                Id = rt.Inverse.Id,
                Name = rt.Inverse.Name,
                Label = rt.Inverse.Label,
                Color = rt.Inverse.Color,
            },
            CreatedAt = rt.CreatedAt,
            UpdatedAt = rt.UpdatedAt,
            DeletedAt = rt.DeletedAt,
        };
    }
}

