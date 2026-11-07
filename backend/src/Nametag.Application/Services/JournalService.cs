using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Journal;
using Nametag.Application.DTOs.Person;
using Nametag.Domain.Entities;

namespace Nametag.Application.Services;

public class JournalService : IJournalService
{
    private readonly IAppDbContext _db;

    public JournalService(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<JournalListResponseDto> GetEntriesAsync(Guid userId, JournalListQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Max(1, Math.Min(100, query.PageSize));

        var q = _db.JournalEntries
            .Where(j => j.UserId == userId);

        if (query.Person.HasValue)
        {
            q = q.Where(j => j.People.Any(p => p.PersonId == query.Person.Value && p.Person != null && p.Person.DeletedAt == null));
        }

        if (query.Event.HasValue)
        {
            q = q.Where(j => j.Events.Any(e => e.EventId == query.Event.Value && e.Event != null && e.Event.DeletedAt == null));
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var search = query.Q.Trim().ToLower();
            q = q.Where(j =>
                j.Title.ToLower().Contains(search) ||
                j.Body.ToLower().Contains(search));
        }

        var totalCount = await q.CountAsync(ct);

        var entries = await q
            .Include(j => j.People.Where(jp => jp.Person != null && jp.Person.DeletedAt == null))
                .ThenInclude(jp => jp.Person)
            .Include(j => j.Events.Where(je => je.Event != null && je.Event.DeletedAt == null))
                .ThenInclude(je => je.Event)
            .OrderByDescending(j => j.Date)
            .ThenByDescending(j => j.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new JournalListResponseDto
        {
            Entries = entries.Select(MapToDto).ToList(),
            Pagination = new JournalPaginationDto
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            }
        };
    }

    public async Task<JournalEntryDto> GetEntryByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries
            .Where(j => j.Id == id && j.UserId == userId)
            .Include(j => j.People.Where(jp => jp.Person != null && jp.Person.DeletedAt == null))
                .ThenInclude(jp => jp.Person)
            .Include(j => j.Events.Where(je => je.Event != null && je.Event.DeletedAt == null))
                .ThenInclude(je => je.Event)
            .FirstOrDefaultAsync(ct);

        if (entry == null)
        {
            throw new NotFoundException("Journal entry not found");
        }

        return MapToDto(entry);
    }

    public async Task<JournalEntryDto> CreateEntryAsync(Guid userId, CreateJournalEntryRequest request, CancellationToken ct = default)
    {
        if (request.PersonIds != null && request.PersonIds.Count > 0)
        {
            var distinctPersonIds = request.PersonIds.Distinct().ToList();
            var validCount = await _db.People
                .CountAsync(p => distinctPersonIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null, ct);

            if (validCount != distinctPersonIds.Count)
            {
                throw new BadRequestException("One or more person IDs are invalid");
            }
        }

        if (request.EventIds != null && request.EventIds.Count > 0)
        {
            var distinctEventIds = request.EventIds.Distinct().ToList();
            var validCount = await _db.Events
                .CountAsync(e => distinctEventIds.Contains(e.Id) && e.UserId == userId && e.DeletedAt == null, ct);

            if (validCount != distinctEventIds.Count)
            {
                throw new BadRequestException("One or more event IDs are invalid");
            }
        }

        var entryDate = request.HasTime == true
            ? request.Date
            : new DateTime(request.Date.Year, request.Date.Month, request.Date.Day, 0, 0, 0, DateTimeKind.Utc);

        var entry = new JournalEntry
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Title = request.Title.Trim(),
            Date = entryDate,
            HasTime = request.HasTime ?? false,
            Body = request.Body.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.PersonIds != null && request.PersonIds.Count > 0)
        {
            foreach (var personId in request.PersonIds.Distinct())
            {
                entry.People.Add(new JournalEntryPerson
                {
                    Id = Guid.CreateVersion7(),
                    JournalEntryId = entry.Id,
                    PersonId = personId
                });
            }
        }

        if (request.EventIds != null && request.EventIds.Count > 0)
        {
            foreach (var eventId in request.EventIds.Distinct())
            {
                entry.Events.Add(new JournalEntryEvent
                {
                    Id = Guid.CreateVersion7(),
                    JournalEntryId = entry.Id,
                    EventId = eventId
                });
            }
        }

        _db.JournalEntries.Add(entry);

        if (request.UpdateLastContact == true && request.PersonIds != null && request.PersonIds.Count > 0)
        {
            var distinctPersonIds = request.PersonIds.Distinct().ToList();
            var peopleToUpdate = await _db.People
                .Where(p => distinctPersonIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null &&
                    (p.LastContact == null || p.LastContact < entryDate))
                .ToListAsync(ct);

            foreach (var p in peopleToUpdate)
            {
                p.LastContact = entryDate;
            }
        }

        await _db.SaveChangesAsync(ct);

        return await GetEntryByIdAsync(userId, entry.Id, ct);
    }

    public async Task<JournalEntryDto> UpdateEntryAsync(Guid userId, Guid id, UpdateJournalEntryRequest request, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries
            .Where(j => j.Id == id && j.UserId == userId)
            .Include(j => j.People)
            .Include(j => j.Events)
            .FirstOrDefaultAsync(ct);

        if (entry == null)
        {
            throw new NotFoundException("Journal entry not found");
        }

        if (request.PersonIds != null && request.PersonIds.Count > 0)
        {
            var distinctPersonIds = request.PersonIds.Distinct().ToList();
            var validCount = await _db.People
                .CountAsync(p => distinctPersonIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null, ct);

            if (validCount != distinctPersonIds.Count)
            {
                throw new BadRequestException("One or more person IDs are invalid");
            }
        }

        if (request.EventIds != null && request.EventIds.Count > 0)
        {
            var distinctEventIds = request.EventIds.Distinct().ToList();
            var validCount = await _db.Events
                .CountAsync(e => distinctEventIds.Contains(e.Id) && e.UserId == userId && e.DeletedAt == null, ct);

            if (validCount != distinctEventIds.Count)
            {
                throw new BadRequestException("One or more event IDs are invalid");
            }
        }

        if (request.Title != null) entry.Title = request.Title.Trim();
        if (request.Body != null) entry.Body = request.Body.Trim();
        if (request.HasTime.HasValue) entry.HasTime = request.HasTime.Value;

        DateTime entryDate = entry.Date;
        if (request.Date.HasValue)
        {
            entryDate = entry.HasTime
                ? request.Date.Value
                : new DateTime(request.Date.Value.Year, request.Date.Value.Month, request.Date.Value.Day, 0, 0, 0, DateTimeKind.Utc);
            entry.Date = entryDate;
        }

        entry.UpdatedAt = DateTime.UtcNow;

        if (request.PersonIds != null)
        {
            _db.JournalEntryPeople.RemoveRange(entry.People);
            entry.People.Clear();
            foreach (var personId in request.PersonIds.Distinct())
            {
                entry.People.Add(new JournalEntryPerson
                {
                    Id = Guid.CreateVersion7(),
                    JournalEntryId = entry.Id,
                    PersonId = personId
                });
            }
        }

        if (request.EventIds != null)
        {
            _db.JournalEntryEvents.RemoveRange(entry.Events);
            entry.Events.Clear();
            foreach (var eventId in request.EventIds.Distinct())
            {
                entry.Events.Add(new JournalEntryEvent
                {
                    Id = Guid.CreateVersion7(),
                    JournalEntryId = entry.Id,
                    EventId = eventId
                });
            }
        }

        if (request.UpdateLastContact == true && request.PersonIds != null && request.PersonIds.Count > 0)
        {
            var distinctPersonIds = request.PersonIds.Distinct().ToList();
            var peopleToUpdate = await _db.People
                .Where(p => distinctPersonIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null &&
                    (p.LastContact == null || p.LastContact < entryDate))
                .ToListAsync(ct);

            foreach (var p in peopleToUpdate)
            {
                p.LastContact = entryDate;
            }
        }

        await _db.SaveChangesAsync(ct);

        return await GetEntryByIdAsync(userId, entry.Id, ct);
    }

    public async Task SoftDeleteEntryAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries
            .Where(j => j.Id == id && j.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (entry == null)
        {
            throw new NotFoundException("Journal entry not found");
        }

        entry.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<JournalEntryDto> RestoreEntryAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries
            .IgnoreQueryFilters()
            .Where(j => j.Id == id && j.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (entry == null)
        {
            throw new NotFoundException("Journal entry not found");
        }

        entry.DeletedAt = null;
        await _db.SaveChangesAsync(ct);
        return await GetEntryByIdAsync(userId, id, ct);
    }

    public async Task PermanentDeleteEntryAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries
            .IgnoreQueryFilters()
            .Where(j => j.Id == id && j.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (entry == null)
        {
            throw new NotFoundException("Journal entry not found");
        }

        _db.JournalEntries.Remove(entry);
        await _db.SaveChangesAsync(ct);
    }

    private static JournalEntryDto MapToDto(JournalEntry j)
    {
        return new JournalEntryDto
        {
            Id = j.Id,
            UserId = j.UserId,
            Title = j.Title,
            Date = j.Date,
            HasTime = j.HasTime,
            Body = j.Body,
            CreatedAt = j.CreatedAt,
            UpdatedAt = j.UpdatedAt,
            DeletedAt = j.DeletedAt,
            People = j.People.Select(jp => new JournalEntryPersonDto
            {
                Id = jp.Id,
                JournalEntryId = jp.JournalEntryId,
                PersonId = jp.PersonId,
                Person = jp.Person == null ? null : new PersonSummaryDto
                {
                    Id = jp.Person.Id,
                    Name = jp.Person.Name,
                    Surname = jp.Person.Surname,
                    MiddleName = jp.Person.MiddleName,
                    SecondLastName = jp.Person.SecondLastName,
                    Nickname = jp.Person.Nickname,
                    DisplayNameOverride = jp.Person.DisplayNameOverride,
                    Photo = jp.Person.Photo
                }
            }).ToList(),
            Events = j.Events.Select(je => new JournalEntryEventDto
            {
                Id = je.Id,
                JournalEntryId = je.JournalEntryId,
                EventId = je.EventId,
                Event = je.Event == null ? null : new JournalEventSummaryDto
                {
                    Id = je.Event.Id,
                    Title = je.Event.Title,
                    Status = je.Event.Status.ToString(),
                    Category = je.Event.Category
                }
            }).ToList()
        };
    }
}

