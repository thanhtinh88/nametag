using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Event;
using Nametag.Application.DTOs.Person;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public class EventService : IEventService
{
    private readonly IAppDbContext _db;

    public EventService(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<List<EventDto>> GetEventsAsync(Guid userId, EventListQuery query, CancellationToken ct = default)
    {
        var q = _db.Events
            .Where(e => e.UserId == userId);

        if (query.Status.HasValue)
        {
            q = q.Where(e => e.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            q = q.Where(e => e.Category == query.Category);
        }

        if (query.PersonId.HasValue)
        {
            q = q.Where(e => e.People.Any(p => p.PersonId == query.PersonId.Value && p.DeletedAt == null && p.Person != null && p.Person.DeletedAt == null));
        }

        if (query.GroupId.HasValue)
        {
            q = q.Where(e => e.Groups.Any(g => g.GroupId == query.GroupId.Value));
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var search = query.Q.Trim().ToLower();
            q = q.Where(e =>
                e.Title.ToLower().Contains(search) ||
                (e.Description != null && e.Description.ToLower().Contains(search)) ||
                (e.Category != null && e.Category.ToLower().Contains(search)));
        }

        var events = await q
            .Include(e => e.Groups.Where(eg => eg.Group != null && eg.Group.DeletedAt == null))
                .ThenInclude(eg => eg.Group)
            .Include(e => e.Addresses)
            .Include(e => e.Urls)
            .Include(e => e.CustomFields)
            .Include(e => e.People.Where(ep => ep.DeletedAt == null && ep.Person != null && ep.Person.DeletedAt == null))
                .ThenInclude(ep => ep.Person)
            .OrderByDescending(e => e.StartDate)
            .ThenByDescending(e => e.CreatedAt)
            .ToListAsync(ct);

        return events.Select(MapToDto).ToList();
    }

    public async Task<EventDto> GetEventByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .Where(e => e.Id == id && e.UserId == userId)
            .Include(e => e.Groups.Where(eg => eg.Group != null && eg.Group.DeletedAt == null))
                .ThenInclude(eg => eg.Group)
            .Include(e => e.Addresses)
            .Include(e => e.Urls)
            .Include(e => e.CustomFields)
            .Include(e => e.People.Where(ep => ep.DeletedAt == null && ep.Person != null && ep.Person.DeletedAt == null))
                .ThenInclude(ep => ep.Person)
            .Include(e => e.JournalEntries.Where(je => je.JournalEntry != null && je.JournalEntry.DeletedAt == null))
                .ThenInclude(je => je.JournalEntry!)
                .ThenInclude(j => j.People.Where(jp => jp.Person != null && jp.Person.DeletedAt == null))
                .ThenInclude(jp => jp.Person)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        return MapToDto(ev);
    }

    public async Task<EventDto> CreateEventAsync(Guid userId, CreateEventRequest request, CancellationToken ct = default)
    {
        var ev = new Event
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Title = request.Title.Trim(),
            Category = request.Category?.Trim(),
            Status = request.Status ?? EventStatus.PLANNED,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            HasTime = request.HasTime ?? false,
            Description = request.Description,
            Photo = request.Photo,
            CaseCode = request.CaseCode?.Trim(),
            CrimeType = request.CrimeType?.Trim(),
            CaseStatus = request.CaseStatus ?? "UNRESOLVED",
            IncidentTimeNotes = request.IncidentTimeNotes?.Trim(),
            DamageAssessment = request.DamageAssessment,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.GroupIds != null && request.GroupIds.Count > 0)
        {
            var validGroupIds = await _db.Groups
                .Where(g => request.GroupIds.Contains(g.Id) && g.UserId == userId && g.DeletedAt == null)
                .Select(g => g.Id)
                .ToListAsync(ct);

            foreach (var groupId in validGroupIds)
            {
                ev.Groups.Add(new EventGroup
                {
                    EventId = ev.Id,
                    GroupId = groupId,
                    AddedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Addresses != null && request.Addresses.Count > 0)
        {
            foreach (var addr in request.Addresses)
            {
                var hasCoords = addr.Latitude.HasValue && addr.Longitude.HasValue;
                ev.Addresses.Add(new EventLocation
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    Type = addr.Type,
                    StreetLine1 = addr.StreetLine1,
                    StreetLine2 = addr.StreetLine2,
                    Locality = addr.Locality,
                    Region = addr.Region,
                    PostalCode = addr.PostalCode,
                    Country = addr.Country,
                    Latitude = addr.Latitude,
                    Longitude = addr.Longitude,
                    GeocodeStatus = hasCoords ? "success" : null,
                    GeocodedAt = hasCoords ? DateTime.UtcNow : null,
                    GeocodeHash = hasCoords ? "manual" : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Urls != null && request.Urls.Count > 0)
        {
            foreach (var url in request.Urls)
            {
                ev.Urls.Add(new EventUrl
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    Type = url.Type,
                    Url = url.Url,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.CustomFields != null && request.CustomFields.Count > 0)
        {
            foreach (var cf in request.CustomFields)
            {
                ev.CustomFields.Add(new EventCustomField
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    Key = cf.Key,
                    Value = cf.Value,
                    Type = cf.Type,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Participants != null && request.Participants.Count > 0)
        {
            var participantPersonIds = request.Participants.Select(p => p.PersonId).Distinct().ToList();
            var validPersonIds = await _db.People
                .Where(p => participantPersonIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null)
                .Select(p => p.Id)
                .ToListAsync(ct);

            foreach (var part in request.Participants.Where(p => validPersonIds.Contains(p.PersonId)))
            {
                ev.People.Add(new EventPerson
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    PersonId = part.PersonId,
                    Role = part.Role,
                    InvolvementType = part.InvolvementType ?? "SUSPECT",
                    VerificationStatus = part.VerificationStatus ?? "HYPOTHESIS",
                    Confidence = part.Confidence,
                    ReasonForSuspicion = part.ReasonForSuspicion,
                    Alibi = part.Alibi,
                    Notes = part.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        _db.Events.Add(ev);
        await _db.SaveChangesAsync(ct);

        return await GetEventByIdAsync(userId, ev.Id, ct);
    }

    public async Task<EventDto> UpdateEventAsync(Guid userId, Guid id, UpdateEventRequest request, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .Where(e => e.Id == id && e.UserId == userId)
            .Include(e => e.Groups)
            .Include(e => e.Addresses)
            .Include(e => e.Urls)
            .Include(e => e.CustomFields)
            .Include(e => e.People)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        if (request.Title != null) ev.Title = request.Title.Trim();
        if (request.Category != null) ev.Category = request.Category.Trim();
        if (request.Status.HasValue) ev.Status = request.Status.Value;
        if (request.StartDate.HasValue) ev.StartDate = request.StartDate.Value;
        if (request.EndDate.HasValue) ev.EndDate = request.EndDate.Value;
        if (request.HasTime.HasValue) ev.HasTime = request.HasTime.Value;
        if (request.Description != null) ev.Description = request.Description;
        if (request.Photo != null) ev.Photo = request.Photo;
        if (request.CaseCode != null) ev.CaseCode = request.CaseCode.Trim();
        if (request.CrimeType != null) ev.CrimeType = request.CrimeType.Trim();
        if (request.CaseStatus != null) ev.CaseStatus = request.CaseStatus;
        if (request.IncidentTimeNotes != null) ev.IncidentTimeNotes = request.IncidentTimeNotes.Trim();
        if (request.DamageAssessment != null) ev.DamageAssessment = request.DamageAssessment;

        ev.UpdatedAt = DateTime.UtcNow;

        if (request.GroupIds != null)
        {
            ev.Groups.Clear();
            var validGroupIds = await _db.Groups
                .Where(g => request.GroupIds.Contains(g.Id) && g.UserId == userId && g.DeletedAt == null)
                .Select(g => g.Id)
                .ToListAsync(ct);

            foreach (var groupId in validGroupIds)
            {
                ev.Groups.Add(new EventGroup
                {
                    EventId = ev.Id,
                    GroupId = groupId,
                    AddedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Addresses != null)
        {
            _db.EventLocations.RemoveRange(ev.Addresses);
            ev.Addresses.Clear();
            foreach (var addr in request.Addresses)
            {
                var hasCoords = addr.Latitude.HasValue && addr.Longitude.HasValue;
                ev.Addresses.Add(new EventLocation
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    Type = addr.Type,
                    StreetLine1 = addr.StreetLine1,
                    StreetLine2 = addr.StreetLine2,
                    Locality = addr.Locality,
                    Region = addr.Region,
                    PostalCode = addr.PostalCode,
                    Country = addr.Country,
                    Latitude = addr.Latitude,
                    Longitude = addr.Longitude,
                    GeocodeStatus = hasCoords ? "success" : null,
                    GeocodedAt = hasCoords ? DateTime.UtcNow : null,
                    GeocodeHash = hasCoords ? "manual" : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Urls != null)
        {
            _db.EventUrls.RemoveRange(ev.Urls);
            ev.Urls.Clear();
            foreach (var url in request.Urls)
            {
                ev.Urls.Add(new EventUrl
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    Type = url.Type,
                    Url = url.Url,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.CustomFields != null)
        {
            _db.EventCustomFields.RemoveRange(ev.CustomFields);
            ev.CustomFields.Clear();
            foreach (var cf in request.CustomFields)
            {
                ev.CustomFields.Add(new EventCustomField
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    Key = cf.Key,
                    Value = cf.Value,
                    Type = cf.Type,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Participants != null)
        {
            _db.EventPersons.RemoveRange(ev.People);
            ev.People.Clear();
            var participantPersonIds = request.Participants.Select(p => p.PersonId).Distinct().ToList();
            var validPersonIds = await _db.People
                .Where(p => participantPersonIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null)
                .Select(p => p.Id)
                .ToListAsync(ct);

            foreach (var part in request.Participants.Where(p => validPersonIds.Contains(p.PersonId)))
            {
                ev.People.Add(new EventPerson
                {
                    Id = Guid.CreateVersion7(),
                    EventId = ev.Id,
                    PersonId = part.PersonId,
                    Role = part.Role,
                    InvolvementType = part.InvolvementType ?? "SUSPECT",
                    VerificationStatus = part.VerificationStatus ?? "HYPOTHESIS",
                    Confidence = part.Confidence,
                    ReasonForSuspicion = part.ReasonForSuspicion,
                    Alibi = part.Alibi,
                    Notes = part.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        return await GetEventByIdAsync(userId, ev.Id, ct);
    }

    public async Task SoftDeleteEventAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .Where(e => e.Id == id && e.UserId == userId)
            .Include(e => e.People)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        var now = DateTime.UtcNow;
        ev.DeletedAt = now;
        foreach (var personLink in ev.People.Where(p => p.DeletedAt == null))
        {
            personLink.DeletedAt = now;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<EventDto> RestoreEventAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .IgnoreQueryFilters()
            .Where(e => e.Id == id && e.UserId == userId)
            .Include(e => e.People)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        ev.DeletedAt = null;
        foreach (var personLink in ev.People)
        {
            personLink.DeletedAt = null;
        }

        await _db.SaveChangesAsync(ct);
        return await GetEventByIdAsync(userId, id, ct);
    }

    public async Task PermanentDeleteEventAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .IgnoreQueryFilters()
            .Where(e => e.Id == id && e.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        _db.Events.Remove(ev);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<EventParticipantDto> AddPersonAsync(Guid userId, Guid eventId, AddEventPersonRequest request, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .Where(e => e.Id == eventId && e.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        var person = await _db.People
            .Where(p => p.Id == request.PersonId && p.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        var existing = await _db.EventPersons
            .IgnoreQueryFilters()
            .Where(ep => ep.EventId == eventId && ep.PersonId == request.PersonId)
            .FirstOrDefaultAsync(ct);

        if (existing != null && existing.DeletedAt == null)
        {
            throw new BadRequestException("Person is already linked to this event");
        }

        EventPerson entity;
        if (existing != null)
        {
            existing.Role = request.Role;
            existing.InvolvementType = request.InvolvementType ?? "SUSPECT";
            existing.VerificationStatus = request.VerificationStatus ?? "HYPOTHESIS";
            existing.Confidence = request.Confidence;
            existing.ReasonForSuspicion = request.ReasonForSuspicion;
            existing.Alibi = request.Alibi;
            existing.Notes = request.Notes;
            existing.DeletedAt = null;
            existing.UpdatedAt = DateTime.UtcNow;
            entity = existing;
        }
        else
        {
            entity = new EventPerson
            {
                Id = Guid.CreateVersion7(),
                EventId = eventId,
                PersonId = request.PersonId,
                Role = request.Role,
                InvolvementType = request.InvolvementType ?? "SUSPECT",
                VerificationStatus = request.VerificationStatus ?? "HYPOTHESIS",
                Confidence = request.Confidence,
                ReasonForSuspicion = request.ReasonForSuspicion,
                Alibi = request.Alibi,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.EventPersons.Add(entity);
        }

        await _db.SaveChangesAsync(ct);

        return new EventParticipantDto
        {
            Id = entity.Id,
            PersonId = entity.PersonId,
            EventId = entity.EventId,
            Role = entity.Role,
            InvolvementType = entity.InvolvementType,
            VerificationStatus = entity.VerificationStatus,
            Confidence = entity.Confidence,
            ReasonForSuspicion = entity.ReasonForSuspicion,
            Alibi = entity.Alibi,
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
            Person = new PersonSummaryDto
            {
                Id = person.Id,
                Name = person.Name,
                Surname = person.Surname,
                MiddleName = person.MiddleName,
                SecondLastName = person.SecondLastName,
                Nickname = person.Nickname,
                DisplayNameOverride = person.DisplayNameOverride,
                Photo = person.Photo
            }
        };
    }

    public async Task<EventParticipantDto> UpdatePersonAsync(Guid userId, Guid eventId, UpdateEventPersonRequest request, CancellationToken ct = default)
    {
        var ev = await _db.Events
            .Where(e => e.Id == eventId && e.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        var existing = await _db.EventPersons
            .Include(ep => ep.Person)
            .Where(ep => ep.EventId == eventId && ep.DeletedAt == null &&
                (request.Id.HasValue ? ep.Id == request.Id.Value : ep.PersonId == request.PersonId!.Value))
            .FirstOrDefaultAsync(ct);

        if (existing == null)
        {
            throw new NotFoundException("Person-event link not found");
        }

        if (request.Role != null) existing.Role = request.Role;
        if (request.InvolvementType != null) existing.InvolvementType = request.InvolvementType;
        if (request.VerificationStatus != null) existing.VerificationStatus = request.VerificationStatus;
        if (request.Confidence != null) existing.Confidence = request.Confidence;
        if (request.ReasonForSuspicion != null) existing.ReasonForSuspicion = request.ReasonForSuspicion;
        if (request.Alibi != null) existing.Alibi = request.Alibi;
        if (request.Notes != null) existing.Notes = request.Notes;
        existing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new EventParticipantDto
        {
            Id = existing.Id,
            PersonId = existing.PersonId,
            EventId = existing.EventId,
            Role = existing.Role,
            InvolvementType = existing.InvolvementType,
            VerificationStatus = existing.VerificationStatus,
            Confidence = existing.Confidence,
            ReasonForSuspicion = existing.ReasonForSuspicion,
            Alibi = existing.Alibi,
            Notes = existing.Notes,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = existing.UpdatedAt,
            Person = existing.Person == null ? null : new PersonSummaryDto
            {
                Id = existing.Person.Id,
                Name = existing.Person.Name,
                Surname = existing.Person.Surname,
                MiddleName = existing.Person.MiddleName,
                SecondLastName = existing.Person.SecondLastName,
                Nickname = existing.Person.Nickname,
                DisplayNameOverride = existing.Person.DisplayNameOverride,
                Photo = existing.Person.Photo
            }
        };
    }

    public async Task RemovePersonAsync(Guid userId, Guid eventId, Guid? linkId, Guid? personId, CancellationToken ct = default)
    {
        if (!linkId.HasValue && !personId.HasValue)
        {
            throw new BadRequestException("linkId or personId is required");
        }

        var ev = await _db.Events
            .Where(e => e.Id == eventId && e.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        var existing = await _db.EventPersons
            .Where(ep => ep.EventId == eventId && ep.DeletedAt == null &&
                (linkId.HasValue ? ep.Id == linkId.Value : ep.PersonId == personId!.Value))
            .FirstOrDefaultAsync(ct);

        if (existing == null)
        {
            throw new NotFoundException("Person-event link not found");
        }

        existing.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<BulkActionResultDto> BulkActionAsync(Guid userId, BulkEventActionRequest request, CancellationToken ct = default)
    {
        List<Guid> ids;
        if (request.SelectAll == true)
        {
            ids = await _db.Events
                .Where(e => e.UserId == userId)
                .Select(e => e.Id)
                .ToListAsync(ct);
        }
        else
        {
            var requestedIds = request.EventIds ?? new List<Guid>();
            ids = await _db.Events
                .Where(e => requestedIds.Contains(e.Id) && e.UserId == userId)
                .Select(e => e.Id)
                .ToListAsync(ct);
        }

        if (ids.Count == 0)
        {
            return new BulkActionResultDto { Success = true, AffectedCount = 0 };
        }

        var now = DateTime.UtcNow;
        switch (request.Action)
        {
            case "delete":
                var eventsToDelete = await _db.Events
                    .Where(e => ids.Contains(e.Id) && e.UserId == userId)
                    .Include(e => e.People)
                    .ToListAsync(ct);

                foreach (var ev in eventsToDelete)
                {
                    ev.DeletedAt = now;
                    foreach (var p in ev.People.Where(ep => ep.DeletedAt == null))
                    {
                        p.DeletedAt = now;
                    }
                }
                await _db.SaveChangesAsync(ct);
                return new BulkActionResultDto { Success = true, AffectedCount = eventsToDelete.Count };

            case "setCaseStatus":
                var eventsToSetCaseStatus = await _db.Events
                    .Where(e => ids.Contains(e.Id) && e.UserId == userId)
                    .ToListAsync(ct);

                foreach (var ev in eventsToSetCaseStatus)
                {
                    ev.CaseStatus = request.CaseStatus;
                    ev.UpdatedAt = now;
                }
                await _db.SaveChangesAsync(ct);
                return new BulkActionResultDto { Success = true, AffectedCount = eventsToSetCaseStatus.Count };

            case "setEventStatus":
                var eventsToSetStatus = await _db.Events
                    .Where(e => ids.Contains(e.Id) && e.UserId == userId)
                    .ToListAsync(ct);

                foreach (var ev in eventsToSetStatus)
                {
                    ev.Status = request.Status!.Value;
                    ev.UpdatedAt = now;
                }
                await _db.SaveChangesAsync(ct);
                return new BulkActionResultDto { Success = true, AffectedCount = eventsToSetStatus.Count };

            case "addToGroups":
                var validGroupIds = await _db.Groups
                    .Where(g => request.GroupIds!.Contains(g.Id) && g.UserId == userId && g.DeletedAt == null)
                    .Select(g => g.Id)
                    .ToListAsync(ct);

                if (validGroupIds.Count == 0)
                {
                    throw new NotFoundException("No valid groups found");
                }

                var existingMemberships = await _db.EventGroups
                    .Where(eg => ids.Contains(eg.EventId) && validGroupIds.Contains(eg.GroupId))
                    .Select(eg => new { eg.EventId, eg.GroupId })
                    .ToListAsync(ct);

                var existingSet = new HashSet<string>(existingMemberships.Select(m => $"{m.EventId}:{m.GroupId}"));
                var newMemberships = new List<EventGroup>();

                foreach (var eventId in ids)
                {
                    foreach (var groupId in validGroupIds)
                    {
                        if (!existingSet.Contains($"{eventId}:{groupId}"))
                        {
                            newMemberships.Add(new EventGroup
                            {
                                EventId = eventId,
                                GroupId = groupId,
                                AddedAt = now
                            });
                        }
                    }
                }

                if (newMemberships.Count > 0)
                {
                    _db.EventGroups.AddRange(newMemberships);
                    await _db.SaveChangesAsync(ct);
                }

                return new BulkActionResultDto { Success = true, AffectedCount = ids.Count };

            case "removeFromGroups":
                var validRemoveGroupIds = await _db.Groups
                    .Where(g => request.GroupIds!.Contains(g.Id) && g.UserId == userId && g.DeletedAt == null)
                    .Select(g => g.Id)
                    .ToListAsync(ct);

                if (validRemoveGroupIds.Count == 0)
                {
                    throw new NotFoundException("No valid groups found");
                }

                var toRemove = await _db.EventGroups
                    .Where(eg => ids.Contains(eg.EventId) && validRemoveGroupIds.Contains(eg.GroupId))
                    .ToListAsync(ct);

                _db.EventGroups.RemoveRange(toRemove);
                await _db.SaveChangesAsync(ct);
                return new BulkActionResultDto { Success = true, AffectedCount = toRemove.Count };

            default:
                throw new BadRequestException("Invalid action");
        }
    }

    private static EventDto MapToDto(Event ev)
    {
        return new EventDto
        {
            Id = ev.Id,
            UserId = ev.UserId,
            Title = ev.Title,
            Category = ev.Category,
            Status = ev.Status,
            StartDate = ev.StartDate,
            EndDate = ev.EndDate,
            HasTime = ev.HasTime,
            Description = ev.Description,
            Photo = ev.Photo,
            ImmichAlbumId = ev.ImmichAlbumId,
            CaseCode = ev.CaseCode,
            CrimeType = ev.CrimeType,
            CaseStatus = ev.CaseStatus,
            IncidentTimeNotes = ev.IncidentTimeNotes,
            DamageAssessment = ev.DamageAssessment,
            CreatedAt = ev.CreatedAt,
            UpdatedAt = ev.UpdatedAt,
            DeletedAt = ev.DeletedAt,
            Groups = ev.Groups.Select(g => new EventGroupItemDto
            {
                EventId = g.EventId,
                GroupId = g.GroupId,
                AddedAt = g.AddedAt,
                Group = g.Group == null ? null : new GroupSummaryDto
                {
                    Id = g.Group.Id,
                    Name = g.Group.Name,
                    Color = g.Group.Color
                }
            }).ToList(),
            Addresses = ev.Addresses.Select(a => new EventLocationDto
            {
                Id = a.Id,
                EventId = a.EventId,
                Type = a.Type,
                StreetLine1 = a.StreetLine1,
                StreetLine2 = a.StreetLine2,
                Locality = a.Locality,
                Region = a.Region,
                PostalCode = a.PostalCode,
                Country = a.Country,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                GeocodeStatus = a.GeocodeStatus,
                GeocodedAt = a.GeocodedAt,
                GeocodeHash = a.GeocodeHash
            }).ToList(),
            Urls = ev.Urls.Select(u => new EventUrlDto
            {
                Id = u.Id,
                EventId = u.EventId,
                Type = u.Type,
                Url = u.Url
            }).ToList(),
            CustomFields = ev.CustomFields.Select(cf => new EventCustomFieldDto
            {
                Id = cf.Id,
                EventId = cf.EventId,
                Key = cf.Key,
                Value = cf.Value,
                Type = cf.Type
            }).ToList(),
            People = ev.People.Select(p => new EventParticipantDto
            {
                Id = p.Id,
                PersonId = p.PersonId,
                EventId = p.EventId,
                Role = p.Role,
                InvolvementType = p.InvolvementType,
                VerificationStatus = p.VerificationStatus,
                Confidence = p.Confidence,
                ReasonForSuspicion = p.ReasonForSuspicion,
                Alibi = p.Alibi,
                Notes = p.Notes,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                Person = p.Person == null ? null : new PersonSummaryDto
                {
                    Id = p.Person.Id,
                    Name = p.Person.Name,
                    Surname = p.Person.Surname,
                    MiddleName = p.Person.MiddleName,
                    SecondLastName = p.Person.SecondLastName,
                    Nickname = p.Person.Nickname,
                    DisplayNameOverride = p.Person.DisplayNameOverride,
                    Photo = p.Person.Photo
                }
            }).ToList(),
            JournalEntries = ev.JournalEntries.Select(je => new JournalEntryEventItemDto
            {
                Id = je.Id,
                JournalEntryId = je.JournalEntryId,
                EventId = je.EventId,
                JournalEntry = je.JournalEntry == null ? null : new JournalEntryInEventDto
                {
                    Id = je.JournalEntry.Id,
                    Title = je.JournalEntry.Title,
                    Date = je.JournalEntry.Date,
                    Body = je.JournalEntry.Body,
                    People = je.JournalEntry.People.Select(jp => new JournalEntryPersonInEventDto
                    {
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
                    }).ToList()
                }
            }).ToList()
        };
    }
}

