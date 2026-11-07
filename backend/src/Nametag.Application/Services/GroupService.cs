using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Group;
using Nametag.Domain.Entities;

namespace Nametag.Application.Services;

public class GroupService : IGroupService
{
    private static readonly string[] PresetColors =
    [
        "#ef4444", "#f97316", "#f59e0b", "#10b981",
        "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
        "#ec4899", "#64748b"
    ];

    private readonly IAppDbContext _db;

    public GroupService(IAppDbContext db)
    {
        _db = db;
    }

    private static string GetRandomColor()
    {
        return PresetColors[Random.Shared.Next(PresetColors.Length)];
    }

    public async Task<List<GroupDto>> GetGroupsAsync(Guid userId, CancellationToken ct = default)
    {
        var groups = await _db.Groups
            .Where(g => g.UserId == userId)
            .Include(g => g.People.Where(pg => pg.Person != null && pg.Person.DeletedAt == null))
                .ThenInclude(pg => pg.Person)
            .OrderBy(g => g.Name)
            .ToListAsync(ct);

        return groups.Select(MapToDto).ToList();
    }

    public async Task<GroupDto> GetGroupByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .Where(g => g.Id == id && g.UserId == userId)
            .Include(g => g.People.Where(pg => pg.Person != null && pg.Person.DeletedAt == null))
                .ThenInclude(pg => pg.Person)
            .FirstOrDefaultAsync(ct);

        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        return MapToDto(group);
    }

    public async Task<GroupDto> CreateGroupAsync(Guid userId, CreateGroupRequest request, CancellationToken ct = default)
    {
        var trimmedName = request.Name.Trim();

        var exists = await _db.Groups.AnyAsync(
            g => g.UserId == userId && g.Name.ToLower() == trimmedName.ToLower(),
            ct);

        if (exists)
        {
            throw new BadRequestException("A group with this name already exists");
        }

        var group = new Group
        {
            UserId = userId,
            Name = trimmedName,
            Description = request.Description?.Trim(),
            Color = !string.IsNullOrWhiteSpace(request.Color) ? request.Color.Trim() : GetRandomColor(),
        };

        if (request.PeopleIds != null && request.PeopleIds.Count > 0)
        {
            var validPersonIds = await _db.People
                .Where(p => request.PeopleIds.Contains(p.Id) && p.UserId == userId)
                .Select(p => p.Id)
                .ToListAsync(ct);

            foreach (var personId in validPersonIds)
            {
                group.People.Add(new PersonGroup
                {
                    PersonId = personId,
                    GroupId = group.Id,
                });
            }
        }

        _db.Groups.Add(group);
        await _db.SaveChangesAsync(ct);

        return await GetGroupByIdAsync(userId, group.Id, ct);
    }

    public async Task<GroupDto> UpdateGroupAsync(Guid userId, Guid id, UpdateGroupRequest request, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .Include(g => g.People.Where(pg => pg.Person != null && pg.Person.DeletedAt == null))
                .ThenInclude(pg => pg.Person)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);

        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        var trimmedName = request.Name.Trim();

        var duplicate = await _db.Groups.AnyAsync(
            g => g.UserId == userId && g.Id != id && g.Name.ToLower() == trimmedName.ToLower(),
            ct);

        if (duplicate)
        {
            throw new BadRequestException("A group with this name already exists");
        }

        group.Name = trimmedName;
        group.Description = request.Description?.Trim();
        if (!string.IsNullOrWhiteSpace(request.Color))
        {
            group.Color = request.Color.Trim();
        }
        else if (string.IsNullOrEmpty(group.Color))
        {
            group.Color = GetRandomColor();
        }

        await _db.SaveChangesAsync(ct);

        return MapToDto(group);
    }

    public async Task SoftDeleteGroupAsync(Guid userId, Guid id, bool deletePeople, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .Include(g => g.People)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);

        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        if (deletePeople && group.People.Count > 0)
        {
            var personIds = group.People.Select(p => p.PersonId).ToList();
            var people = await _db.People
                .Where(p => personIds.Contains(p.Id) && p.UserId == userId)
                .ToListAsync(ct);

            foreach (var person in people)
            {
                person.DeletedAt = DateTime.UtcNow;
            }
        }

        group.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<GroupDto> RestoreGroupAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .IgnoreQueryFilters()
            .Include(g => g.People.Where(pg => pg.Person != null && pg.Person.DeletedAt == null))
                .ThenInclude(pg => pg.Person)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);

        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        if (group.DeletedAt == null)
        {
            throw new BadRequestException("Group is not deleted");
        }

        group.DeletedAt = null;
        await _db.SaveChangesAsync(ct);

        return MapToDto(group);
    }

    public async Task PermanentDeleteGroupAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var group = await _db.Groups
            .IgnoreQueryFilters()
            .Include(g => g.People)
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);

        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        if (group.DeletedAt == null)
        {
            throw new BadRequestException("Group is not deleted");
        }

        if (group.People.Count > 0)
        {
            _db.PersonGroups.RemoveRange(group.People);
        }

        _db.Groups.Remove(group);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddMemberAsync(Guid userId, Guid id, Guid personId, CancellationToken ct = default)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);
        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId, ct);
        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        var existingMembership = await _db.PersonGroups
            .FirstOrDefaultAsync(pg => pg.GroupId == id && pg.PersonId == personId, ct);

        if (existingMembership != null)
        {
            throw new BadRequestException("Person is already a member of this group");
        }

        _db.PersonGroups.Add(new PersonGroup
        {
            GroupId = id,
            PersonId = personId,
            AddedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveMemberAsync(Guid userId, Guid id, Guid personId, CancellationToken ct = default)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct);
        if (group == null)
        {
            throw new NotFoundException("Group not found");
        }

        var membership = await _db.PersonGroups
            .FirstOrDefaultAsync(pg => pg.GroupId == id && pg.PersonId == personId, ct);

        if (membership == null)
        {
            throw new NotFoundException("Person is not a member of this group");
        }

        _db.PersonGroups.Remove(membership);
        await _db.SaveChangesAsync(ct);
    }

    private static GroupDto MapToDto(Group group)
    {
        return new GroupDto
        {
            Id = group.Id,
            UserId = group.UserId,
            Name = group.Name,
            Description = group.Description,
            Color = group.Color,
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            DeletedAt = group.DeletedAt,
            People = group.People
                .Where(pg => pg.Person != null && pg.Person.DeletedAt == null)
                .Select(pg => new PersonGroupDto
                {
                    PersonId = pg.PersonId,
                    GroupId = pg.GroupId,
                    AddedAt = pg.AddedAt,
                    Person = pg.Person == null ? null : new PersonSummaryDto
                    {
                        Id = pg.Person.Id,
                        Name = pg.Person.Name,
                        Surname = pg.Person.Surname,
                        Nickname = pg.Person.Nickname,
                        DisplayNameOverride = pg.Person.DisplayNameOverride,
                        Photo = pg.Person.Photo,
                    }
                }).ToList()
        };
    }
}

