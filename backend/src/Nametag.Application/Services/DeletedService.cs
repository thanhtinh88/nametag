using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Deleted;

namespace Nametag.Application.Services;

public class DeletedService : IDeletedService
{
    private const int RetentionDays = 30;
    private readonly IAppDbContext _context;

    public DeletedService(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<DeletedResponseDto> GetDeletedAsync(Guid userId, string? type, CancellationToken ct = default)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-RetentionDays);
        object deletedData;

        switch (type)
        {
            case "people":
                var people = await _context.People
                    .IgnoreQueryFilters()
                    .Where(p => p.UserId == userId && p.DeletedAt != null && p.DeletedAt >= cutoffDate)
                    .OrderByDescending(p => p.DeletedAt)
                    .Select(p => new DeletedPersonDto
                    {
                        Id = p.Id,
                        Name = p.Name,
                        Surname = p.Surname,
                        Nickname = p.Nickname,
                        DisplayNameOverride = p.DisplayNameOverride,
                        DeletedAt = p.DeletedAt
                    })
                    .ToListAsync(ct);
                deletedData = people;
                break;

            case "groups":
                var groups = await _context.Groups
                    .IgnoreQueryFilters()
                    .Where(g => g.UserId == userId && g.DeletedAt != null && g.DeletedAt >= cutoffDate)
                    .OrderByDescending(g => g.DeletedAt)
                    .Select(g => new DeletedGroupDto
                    {
                        Id = g.Id,
                        Name = g.Name,
                        Description = g.Description,
                        Color = g.Color,
                        DeletedAt = g.DeletedAt
                    })
                    .ToListAsync(ct);
                deletedData = groups;
                break;

            case "relationships":
                var relationships = await _context.Relationships
                    .IgnoreQueryFilters()
                    .Include(r => r.Person)
                    .Include(r => r.RelatedPerson)
                    .Include(r => r.RelationshipType)
                    .Where(r => r.Person.UserId == userId && r.DeletedAt != null && r.DeletedAt >= cutoffDate)
                    .OrderByDescending(r => r.DeletedAt)
                    .Select(r => new DeletedRelationshipDto
                    {
                        Id = r.Id,
                        DeletedAt = r.DeletedAt,
                        Person = new DeletedRelationshipPersonSummary
                        {
                            Id = r.Person.Id,
                            Name = r.Person.Name,
                            Surname = r.Person.Surname
                        },
                        RelatedPerson = new DeletedRelationshipPersonSummary
                        {
                            Id = r.RelatedPerson.Id,
                            Name = r.RelatedPerson.Name,
                            Surname = r.RelatedPerson.Surname
                        },
                        RelationshipType = r.RelationshipType != null ? new DeletedRelationshipTypeSummary
                        {
                            Id = r.RelationshipType.Id,
                            Label = r.RelationshipType.Label
                        } : null
                    })
                    .ToListAsync(ct);
                deletedData = relationships;
                break;

            case "relationshipTypes":
                var relTypes = await _context.RelationshipTypes
                    .IgnoreQueryFilters()
                    .Where(rt => rt.UserId == userId && rt.DeletedAt != null && rt.DeletedAt >= cutoffDate)
                    .OrderByDescending(rt => rt.DeletedAt)
                    .Select(rt => new DeletedRelationshipTypeDto
                    {
                        Id = rt.Id,
                        Name = rt.Name,
                        Label = rt.Label,
                        Color = rt.Color,
                        DeletedAt = rt.DeletedAt
                    })
                    .ToListAsync(ct);
                deletedData = relTypes;
                break;

            case "importantDates":
                var impDates = await _context.ImportantDates
                    .IgnoreQueryFilters()
                    .Include(d => d.Person)
                    .Where(d => d.Person.UserId == userId && d.DeletedAt != null && d.DeletedAt >= cutoffDate)
                    .OrderByDescending(d => d.DeletedAt)
                    .Select(d => new DeletedImportantDateDto
                    {
                        Id = d.Id,
                        Title = d.Title,
                        Date = d.Date,
                        DeletedAt = d.DeletedAt,
                        Person = new DeletedRelationshipPersonSummary
                        {
                            Id = d.Person.Id,
                            Name = d.Person.Name,
                            Surname = d.Person.Surname
                        }
                    })
                    .ToListAsync(ct);
                deletedData = impDates;
                break;

            case "events":
                var events = await _context.Events
                    .IgnoreQueryFilters()
                    .Where(e => e.UserId == userId && e.DeletedAt != null && e.DeletedAt >= cutoffDate)
                    .OrderByDescending(e => e.DeletedAt)
                    .Select(e => new DeletedEventDto
                    {
                        Id = e.Id,
                        Title = e.Title,
                        Category = e.Category,
                        Status = e.Status.ToString(),
                        DeletedAt = e.DeletedAt
                    })
                    .ToListAsync(ct);
                deletedData = events;
                break;

            case "gangs":
                var gangs = await _context.Gangs
                    .IgnoreQueryFilters()
                    .Where(g => g.UserId == userId && g.DeletedAt != null && g.DeletedAt >= cutoffDate)
                    .OrderByDescending(g => g.DeletedAt)
                    .Select(g => new DeletedGangDto
                    {
                        Id = g.Id,
                        Name = g.Name,
                        Color = g.Color,
                        DeletedAt = g.DeletedAt
                    })
                    .ToListAsync(ct);
                deletedData = gangs;
                break;

            case "customFieldTemplates":
                var templates = await _context.CustomFieldTemplates
                    .IgnoreQueryFilters()
                    .Where(t => t.UserId == userId && t.DeletedAt != null && t.DeletedAt >= cutoffDate)
                    .OrderByDescending(t => t.DeletedAt)
                    .Select(t => new DeletedCustomFieldTemplateDto
                    {
                        Id = t.Id,
                        Name = t.Name,
                        Slug = t.Slug,
                        Type = t.Type.ToString(),
                        DeletedAt = t.DeletedAt
                    })
                    .ToListAsync(ct);
                deletedData = templates;
                break;

            default:
                throw new BadRequestException("Invalid type parameter. Must be one of: people, groups, relationships, relationshipTypes, importantDates, events, gangs, customFieldTemplates");
        }

        return new DeletedResponseDto
        {
            Deleted = deletedData,
            RetentionDays = RetentionDays,
            CutoffDate = cutoffDate.ToString("o")
        };
    }
}

