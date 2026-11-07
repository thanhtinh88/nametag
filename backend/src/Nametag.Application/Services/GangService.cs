using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Gang;
using Nametag.Domain.Entities;
using ValidationException = Nametag.Application.Common.Exceptions.ValidationException;

namespace Nametag.Application.Services;

public class GangService : IGangService
{
    private readonly IAppDbContext _context;
    private readonly IValidator<CreateGangRequest> _createValidator;
    private readonly IValidator<UpdateGangRequest> _updateValidator;
    private readonly IValidator<AddGangMemberRequest> _memberValidator;

    public GangService(
        IAppDbContext _context,
        IValidator<CreateGangRequest> createValidator,
        IValidator<UpdateGangRequest> updateValidator,
        IValidator<AddGangMemberRequest> memberValidator)
    {
        this._context = _context;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _memberValidator = memberValidator;
    }

    public async Task<List<GangDto>> GetGangsAsync(Guid userId, CancellationToken ct = default)
    {
        var gangs = await _context.Gangs
            .AsNoTracking()
            .Where(g => g.UserId == userId && g.DeletedAt == null)
            .Include(g => g.Members)
                .ThenInclude(m => m.Person)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

        return gangs.Select(MapToDto).ToList();
    }

    public async Task<GangDto> GetGangByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var gang = await _context.Gangs
            .AsNoTracking()
            .Where(g => g.Id == id && g.UserId == userId && g.DeletedAt == null)
            .Include(g => g.Members.OrderBy(m => m.CreatedAt))
                .ThenInclude(m => m.Person)
            .FirstOrDefaultAsync(ct);

        if (gang == null)
        {
            throw new NotFoundException("Gang not found");
        }

        return MapToDto(gang);
    }

    public async Task<GangDto> CreateGangAsync(Guid userId, CreateGangRequest request, CancellationToken ct = default)
    {
        var validationResult = await _createValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors.First().ErrorMessage);
        }

        var gang = new Gang
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Description = request.Description,
            Turf = request.Turf,
            Color = request.Color
        };

        _context.Gangs.Add(gang);
        await _context.SaveChangesAsync(ct);

        return MapToDto(gang);
    }

    public async Task<GangDto> UpdateGangAsync(Guid userId, Guid id, UpdateGangRequest request, CancellationToken ct = default)
    {
        var validationResult = await _updateValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors.First().ErrorMessage);
        }

        var gang = await _context.Gangs
            .Where(g => g.Id == id && g.UserId == userId && g.DeletedAt == null)
            .Include(g => g.Members)
                .ThenInclude(m => m.Person)
            .FirstOrDefaultAsync(ct);

        if (gang == null)
        {
            throw new NotFoundException("Gang not found");
        }

        if (request.Name != null)
        {
            gang.Name = request.Name.Trim();
        }
        if (request.Description != null)
        {
            gang.Description = request.Description;
        }
        if (request.Turf != null)
        {
            gang.Turf = request.Turf;
        }
        if (request.Color != null)
        {
            gang.Color = request.Color;
        }

        await _context.SaveChangesAsync(ct);

        return MapToDto(gang);
    }

    public async Task DeleteGangAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var gang = await _context.Gangs
            .Where(g => g.Id == id && g.UserId == userId && g.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (gang == null)
        {
            throw new NotFoundException("Gang not found");
        }

        gang.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<GangMemberDto> AddOrUpdateMemberAsync(Guid userId, Guid gangId, AddGangMemberRequest request, CancellationToken ct = default)
    {
        var validationResult = await _memberValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors.First().ErrorMessage);
        }

        var gangExists = await _context.Gangs
            .AnyAsync(g => g.Id == gangId && g.UserId == userId && g.DeletedAt == null, ct);
        if (!gangExists)
        {
            throw new NotFoundException("Gang not found");
        }

        var person = await _context.People
            .Where(p => p.Id == request.PersonId && p.UserId == userId && p.DeletedAt == null)
            .FirstOrDefaultAsync(ct);
        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        var membership = await _context.GangMemberships
            .Where(m => m.GangId == gangId && m.PersonId == request.PersonId)
            .FirstOrDefaultAsync(ct);

        if (membership == null)
        {
            membership = new GangMembership
            {
                GangId = gangId,
                PersonId = request.PersonId,
                Role = request.Role ?? "MEMBER",
                Notes = request.Notes,
                JoinedAt = request.JoinedAt,
                LeftAt = request.LeftAt
            };
            _context.GangMemberships.Add(membership);
        }
        else
        {
            membership.Role = request.Role ?? "MEMBER";
            membership.Notes = request.Notes;
            membership.JoinedAt = request.JoinedAt;
            membership.LeftAt = request.LeftAt;
        }

        await _context.SaveChangesAsync(ct);

        return new GangMemberDto
        {
            Id = membership.Id,
            GangId = membership.GangId,
            PersonId = membership.PersonId,
            Role = membership.Role,
            Notes = membership.Notes,
            JoinedAt = membership.JoinedAt,
            LeftAt = membership.LeftAt,
            CreatedAt = membership.CreatedAt,
            Person = new GangMemberPersonDto
            {
                Id = person.Id,
                Name = person.Name,
                Surname = person.Surname,
                Nickname = person.Nickname,
                Photo = person.Photo,
                ManagementLevel = person.ManagementLevel,
                ThreatLevel = person.ThreatLevel
            }
        };
    }

    public async Task RemoveMemberAsync(Guid userId, Guid gangId, Guid personId, CancellationToken ct = default)
    {
        var gangExists = await _context.Gangs
            .AnyAsync(g => g.Id == gangId && g.UserId == userId && g.DeletedAt == null, ct);
        if (!gangExists)
        {
            throw new NotFoundException("Gang not found");
        }

        var membership = await _context.GangMemberships
            .Where(m => m.GangId == gangId && m.PersonId == personId)
            .FirstOrDefaultAsync(ct);

        if (membership == null)
        {
            throw new NotFoundException("Member not found in gang");
        }

        _context.GangMemberships.Remove(membership);
        await _context.SaveChangesAsync(ct);
    }

    private static GangDto MapToDto(Gang gang)
    {
        return new GangDto
        {
            Id = gang.Id,
            Name = gang.Name,
            Description = gang.Description,
            Turf = gang.Turf,
            Color = gang.Color,
            CreatedAt = gang.CreatedAt,
            UpdatedAt = gang.UpdatedAt,
            Members = gang.Members.Select(m => new GangMemberDto
            {
                Id = m.Id,
                GangId = m.GangId,
                PersonId = m.PersonId,
                Role = m.Role,
                Notes = m.Notes,
                JoinedAt = m.JoinedAt,
                LeftAt = m.LeftAt,
                CreatedAt = m.CreatedAt,
                Person = m.Person != null ? new GangMemberPersonDto
                {
                    Id = m.Person.Id,
                    Name = m.Person.Name,
                    Surname = m.Person.Surname,
                    Nickname = m.Person.Nickname,
                    Photo = m.Person.Photo,
                    ManagementLevel = m.Person.ManagementLevel,
                    ThreatLevel = m.Person.ThreatLevel
                } : null
            }).ToList()
        };
    }
}
