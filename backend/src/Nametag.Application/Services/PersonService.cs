using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Person;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public class PersonService : IPersonService
{
    private readonly IAppDbContext _db;

    public PersonService(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<PersonListResponse> GetPeopleAsync(
        Guid userId,
        int? limit,
        int? offset,
        bool includeAll,
        bool includeDetails,
        string? groupIds,
        CancellationToken ct = default)
    {
        var query = _db.People.AsNoTracking();

        if (includeDetails)
        {
            query = query
                .Include(p => p.Emails)
                .Include(p => p.PhoneNumbers)
                .Include(p => p.Addresses)
                .Include(p => p.SocialProfiles)
                .Include(p => p.CustomFields)
                .Include(p => p.ImportantDates);
        }

        query = query.OrderBy(p => p.Name);

        if (includeAll && !limit.HasValue)
        {
            var allItems = await query.ToListAsync(ct);
            return new PersonListResponse
            {
                People = allItems.Select(MapToDto).ToList(),
                Pagination = null
            };
        }

        var effectiveLimit = Math.Clamp(limit ?? 50, 1, 100);
        var effectiveOffset = Math.Max(offset ?? 0, 0);

        var total = await query.CountAsync(ct);
        var items = await query.Skip(effectiveOffset).Take(effectiveLimit).ToListAsync(ct);

        return new PersonListResponse
        {
            People = items.Select(MapToDto).ToList(),
            Pagination = new PaginationDto
            {
                Total = total,
                Limit = effectiveLimit,
                Offset = effectiveOffset,
                HasMore = effectiveOffset + items.Count < total
            }
        };
    }

    public async Task<PersonDto> GetPersonByIdAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        var person = await _db.People
            .AsNoTracking()
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.ImportantDates)
            .FirstOrDefaultAsync(p => p.Id == personId, ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        return MapToDto(person);
    }

    public async Task<PersonDto> CreatePersonAsync(Guid userId, CreatePersonRequest request, CancellationToken ct = default)
    {
        var resolvedDisplayName = !string.IsNullOrWhiteSpace(request.DisplayNameOverride)
            ? request.DisplayNameOverride.Trim()
            : (!string.IsNullOrWhiteSpace(request.CardDavDisplayName) ? request.CardDavDisplayName.Trim() : null);

        var person = new Person
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Surname = request.Surname?.Trim(),
            MiddleName = request.MiddleName?.Trim(),
            SecondLastName = request.SecondLastName?.Trim(),
            Nickname = request.Nickname?.Trim(),
            Prefix = request.Prefix?.Trim(),
            Suffix = request.Suffix?.Trim(),
            Uid = request.Uid?.Trim(),
            Organization = request.Organization?.Trim(),
            JobTitle = request.JobTitle?.Trim(),
            Photo = request.Photo?.Trim(),
            Gender = request.Gender?.Trim(),
            Anniversary = request.Anniversary,
            LastContact = request.LastContact,
            Notes = request.Notes,
            RelationshipToUserId = request.RelationshipToUserId,
            ContactReminderEnabled = request.ContactReminderEnabled ?? false,
            ContactReminderInterval = request.ContactReminderInterval,
            ContactReminderIntervalUnit = request.ContactReminderIntervalUnit,
            CardDavSyncEnabled = request.CardDavSyncEnabled ?? true,
            DisplayNameOverride = resolvedDisplayName,
            CitizenId = request.CitizenId?.Trim(),
            CitizenIdIssueDate = request.CitizenIdIssueDate,
            CitizenIdIssuePlace = request.CitizenIdIssuePlace?.Trim(),
            ResidenceStatus = request.ResidenceStatus?.Trim(),
            ManagementLevel = request.ManagementLevel?.Trim() ?? "NORMAL",
            HeightCm = request.HeightCm,
            WeightKg = request.WeightKg,
            BloodType = request.BloodType?.Trim(),
            ThreatLevel = request.ThreatLevel?.Trim() ?? "LOW",
            ModusOperandi = request.ModusOperandi?.Trim(),
            RiskNotes = request.RiskNotes?.Trim(),
            ImmichPersonId = request.ImmichPersonId?.Trim(),
            ImmichAlbumId = request.ImmichAlbumId?.Trim()
        };

        if (request.Emails != null)
        {
            foreach (var email in request.Emails)
            {
                person.Emails.Add(new PersonEmail
                {
                    Type = email.Type.Trim(),
                    Email = email.Email.Trim()
                });
            }
        }

        if (request.PhoneNumbers != null)
        {
            foreach (var phone in request.PhoneNumbers)
            {
                person.PhoneNumbers.Add(new PersonPhone
                {
                    Type = phone.Type.Trim(),
                    Number = phone.Number.Trim()
                });
            }
        }

        if (request.Addresses != null)
        {
            foreach (var addr in request.Addresses)
            {
                person.Addresses.Add(new PersonAddress
                {
                    Type = addr.Type.Trim(),
                    StreetLine1 = addr.StreetLine1?.Trim(),
                    StreetLine2 = addr.StreetLine2?.Trim(),
                    Locality = addr.Locality?.Trim(),
                    Region = addr.Region?.Trim(),
                    PostalCode = addr.PostalCode?.Trim(),
                    Country = addr.Country?.Trim(),
                    Latitude = addr.Latitude,
                    Longitude = addr.Longitude
                });
            }
        }

        AddSocialProfiles(person, request.SocialProfiles, request.Urls, request.ImHandles);

        if (request.CustomFields != null)
        {
            foreach (var field in request.CustomFields)
            {
                person.CustomFields.Add(new PersonCustomField
                {
                    Key = field.Key.Trim(),
                    Value = field.Value,
                    Type = field.Type?.Trim()
                });
            }
        }

        if (request.ImportantDates != null)
        {
            foreach (var date in request.ImportantDates)
            {
                person.ImportantDates.Add(new ImportantDate
                {
                    UserId = userId,
                    Title = date.Title.Trim(),
                    Type = date.Type?.Trim(),
                    Date = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc),
                    YearUnknown = date.YearUnknown ?? false,
                    ReminderEnabled = date.ReminderEnabled ?? false,
                    ReminderType = date.ReminderType,
                    ReminderInterval = date.ReminderInterval,
                    ReminderIntervalUnit = date.ReminderIntervalUnit,
                    ReminderLeadDays = date.ReminderLeadDays
                });
            }
        }

        _db.People.Add(person);
        await _db.SaveChangesAsync(ct);

        return MapToDto(person);
    }

    public async Task<PersonDto> UpdatePersonAsync(Guid userId, Guid personId, UpdatePersonRequest request, CancellationToken ct = default)
    {
        var person = await _db.People
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.ImportantDates)
            .FirstOrDefaultAsync(p => p.Id == personId, ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        if (request.Name != null) person.Name = request.Name.Trim();
        if (request.Surname != null) person.Surname = string.IsNullOrWhiteSpace(request.Surname) ? null : request.Surname.Trim();
        if (request.MiddleName != null) person.MiddleName = string.IsNullOrWhiteSpace(request.MiddleName) ? null : request.MiddleName.Trim();
        if (request.SecondLastName != null) person.SecondLastName = string.IsNullOrWhiteSpace(request.SecondLastName) ? null : request.SecondLastName.Trim();
        if (request.Nickname != null) person.Nickname = string.IsNullOrWhiteSpace(request.Nickname) ? null : request.Nickname.Trim();
        if (request.Prefix != null) person.Prefix = string.IsNullOrWhiteSpace(request.Prefix) ? null : request.Prefix.Trim();
        if (request.Suffix != null) person.Suffix = string.IsNullOrWhiteSpace(request.Suffix) ? null : request.Suffix.Trim();
        if (request.Uid != null) person.Uid = string.IsNullOrWhiteSpace(request.Uid) ? null : request.Uid.Trim();
        if (request.Organization != null) person.Organization = string.IsNullOrWhiteSpace(request.Organization) ? null : request.Organization.Trim();
        if (request.JobTitle != null) person.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? null : request.JobTitle.Trim();
        if (request.Photo != null) person.Photo = string.IsNullOrWhiteSpace(request.Photo) ? null : request.Photo.Trim();
        if (request.Gender != null) person.Gender = string.IsNullOrWhiteSpace(request.Gender) ? null : request.Gender.Trim();
        if (request.Anniversary != null) person.Anniversary = request.Anniversary;
        if (request.LastContact != null) person.LastContact = request.LastContact;
        if (request.Notes != null) person.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes;
        if (request.RelationshipToUserId != null) person.RelationshipToUserId = request.RelationshipToUserId;
        if (request.ContactReminderEnabled.HasValue) person.ContactReminderEnabled = request.ContactReminderEnabled.Value;
        if (request.ContactReminderInterval.HasValue) person.ContactReminderInterval = request.ContactReminderInterval;
        if (request.ContactReminderIntervalUnit.HasValue) person.ContactReminderIntervalUnit = request.ContactReminderIntervalUnit;
        if (request.CardDavSyncEnabled.HasValue) person.CardDavSyncEnabled = request.CardDavSyncEnabled.Value;

        if (request.DisplayNameOverride != null || request.CardDavDisplayName != null)
        {
            var resolvedDisplayName = !string.IsNullOrWhiteSpace(request.DisplayNameOverride)
                ? request.DisplayNameOverride.Trim()
                : (!string.IsNullOrWhiteSpace(request.CardDavDisplayName) ? request.CardDavDisplayName.Trim() : null);
            person.DisplayNameOverride = resolvedDisplayName;
        }

        if (request.CitizenId != null) person.CitizenId = string.IsNullOrWhiteSpace(request.CitizenId) ? null : request.CitizenId.Trim();
        if (request.CitizenIdIssueDate != null) person.CitizenIdIssueDate = request.CitizenIdIssueDate;
        if (request.CitizenIdIssuePlace != null) person.CitizenIdIssuePlace = string.IsNullOrWhiteSpace(request.CitizenIdIssuePlace) ? null : request.CitizenIdIssuePlace.Trim();
        if (request.ResidenceStatus != null) person.ResidenceStatus = string.IsNullOrWhiteSpace(request.ResidenceStatus) ? null : request.ResidenceStatus.Trim();
        if (request.ManagementLevel != null) person.ManagementLevel = request.ManagementLevel.Trim();
        if (request.HeightCm.HasValue) person.HeightCm = request.HeightCm;
        if (request.WeightKg.HasValue) person.WeightKg = request.WeightKg;
        if (request.BloodType != null) person.BloodType = string.IsNullOrWhiteSpace(request.BloodType) ? null : request.BloodType.Trim();
        if (request.ThreatLevel != null) person.ThreatLevel = request.ThreatLevel.Trim();
        if (request.ModusOperandi != null) person.ModusOperandi = string.IsNullOrWhiteSpace(request.ModusOperandi) ? null : request.ModusOperandi.Trim();
        if (request.RiskNotes != null) person.RiskNotes = string.IsNullOrWhiteSpace(request.RiskNotes) ? null : request.RiskNotes.Trim();
        if (request.ImmichPersonId != null) person.ImmichPersonId = string.IsNullOrWhiteSpace(request.ImmichPersonId) ? null : request.ImmichPersonId.Trim();
        if (request.ImmichAlbumId != null) person.ImmichAlbumId = string.IsNullOrWhiteSpace(request.ImmichAlbumId) ? null : request.ImmichAlbumId.Trim();

        // Update multi-value relations (replaces collection when provided)
        if (request.Emails != null)
        {
            person.Emails.Clear();
            foreach (var email in request.Emails)
            {
                person.Emails.Add(new PersonEmail
                {
                    Type = email.Type.Trim(),
                    Email = email.Email.Trim()
                });
            }
        }

        if (request.PhoneNumbers != null)
        {
            person.PhoneNumbers.Clear();
            foreach (var phone in request.PhoneNumbers)
            {
                person.PhoneNumbers.Add(new PersonPhone
                {
                    Type = phone.Type.Trim(),
                    Number = phone.Number.Trim()
                });
            }
        }

        if (request.Addresses != null)
        {
            person.Addresses.Clear();
            foreach (var addr in request.Addresses)
            {
                person.Addresses.Add(new PersonAddress
                {
                    Type = addr.Type.Trim(),
                    StreetLine1 = addr.StreetLine1?.Trim(),
                    StreetLine2 = addr.StreetLine2?.Trim(),
                    Locality = addr.Locality?.Trim(),
                    Region = addr.Region?.Trim(),
                    PostalCode = addr.PostalCode?.Trim(),
                    Country = addr.Country?.Trim(),
                    Latitude = addr.Latitude,
                    Longitude = addr.Longitude
                });
            }
        }

        if (request.SocialProfiles != null || request.Urls != null || request.ImHandles != null)
        {
            person.SocialProfiles.Clear();
            AddSocialProfiles(person, request.SocialProfiles, request.Urls, request.ImHandles);
        }

        if (request.CustomFields != null)
        {
            person.CustomFields.Clear();
            foreach (var field in request.CustomFields)
            {
                person.CustomFields.Add(new PersonCustomField
                {
                    Key = field.Key.Trim(),
                    Value = field.Value,
                    Type = field.Type?.Trim()
                });
            }
        }

        if (request.ImportantDates != null)
        {
            person.ImportantDates.Clear();
            foreach (var date in request.ImportantDates)
            {
                person.ImportantDates.Add(new ImportantDate
                {
                    UserId = userId,
                    Title = date.Title.Trim(),
                    Type = date.Type?.Trim(),
                    Date = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc),
                    YearUnknown = date.YearUnknown ?? false,
                    ReminderEnabled = date.ReminderEnabled ?? false,
                    ReminderType = date.ReminderType,
                    ReminderInterval = date.ReminderInterval,
                    ReminderIntervalUnit = date.ReminderIntervalUnit,
                    ReminderLeadDays = date.ReminderLeadDays
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        return MapToDto(person);
    }

    public async Task SoftDeletePersonAsync(Guid userId, Guid personId, DeletePersonRequest? request = null, CancellationToken ct = default)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId, ct);
        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        person.DeletedAt = DateTime.UtcNow;

        if (request?.DeleteOrphans == true && request.OrphanIds?.Count > 0)
        {
            var orphans = await _db.People
                .Where(p => request.OrphanIds.Contains(p.Id))
                .ToListAsync(ct);

            foreach (var orphan in orphans)
            {
                orphan.DeletedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<PersonDto> RestorePersonAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        var person = await _db.People
            .IgnoreQueryFilters()
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.ImportantDates)
            .FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId, ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        if (person.DeletedAt == null)
        {
            throw new BadRequestException("Person is not deleted");
        }

        person.DeletedAt = null;
        await _db.SaveChangesAsync(ct);

        return MapToDto(person);
    }

    public async Task PermanentDeletePersonAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        var person = await _db.People
            .IgnoreQueryFilters()
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.ImportantDates)
            .FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId, ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        if (person.DeletedAt == null)
        {
            throw new BadRequestException("Person is not deleted");
        }

        _db.People.Remove(person);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<PersonSummaryDto>> SearchPeopleAsync(Guid userId, string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<PersonSummaryDto>();
        }

        var normalized = query.Trim().ToLower();

        var people = await _db.People
            .AsNoTracking()
            .Where(p =>
                (p.Name != null && p.Name.ToLower().Contains(normalized)) ||
                (p.Surname != null && p.Surname.ToLower().Contains(normalized)) ||
                (p.MiddleName != null && p.MiddleName.ToLower().Contains(normalized)) ||
                (p.SecondLastName != null && p.SecondLastName.ToLower().Contains(normalized)) ||
                (p.Nickname != null && p.Nickname.ToLower().Contains(normalized)) ||
                (p.DisplayNameOverride != null && p.DisplayNameOverride.ToLower().Contains(normalized)))
            .OrderBy(p => p.Name)
            .Take(20)
            .Select(p => new PersonSummaryDto
            {
                Id = p.Id,
                Name = p.Name,
                Surname = p.Surname,
                MiddleName = p.MiddleName,
                SecondLastName = p.SecondLastName,
                Nickname = p.Nickname,
                DisplayNameOverride = p.DisplayNameOverride,
                Photo = p.Photo
            })
            .ToListAsync(ct);

        return people;
    }

    private static void AddSocialProfiles(
        Person person,
        List<CreatePersonSocialProfileDto>? socialProfiles,
        List<CreatePersonUrlDto>? urls,
        List<CreatePersonImHandleDto>? imHandles)
    {
        if (socialProfiles != null)
        {
            foreach (var sp in socialProfiles)
            {
                person.SocialProfiles.Add(new PersonSocialProfile
                {
                    Type = sp.Type.Trim(),
                    Url = sp.Url?.Trim(),
                    Network = sp.Network?.Trim(),
                    Username = sp.Username?.Trim()
                });
            }
        }

        if (urls != null)
        {
            foreach (var url in urls)
            {
                if (!string.IsNullOrWhiteSpace(url.Url))
                {
                    person.SocialProfiles.Add(new PersonSocialProfile
                    {
                        Type = string.IsNullOrWhiteSpace(url.Type) ? "url" : url.Type.Trim(),
                        Url = url.Url.Trim()
                    });
                }
            }
        }

        if (imHandles != null)
        {
            foreach (var im in imHandles)
            {
                if (!string.IsNullOrWhiteSpace(im.Handle))
                {
                    person.SocialProfiles.Add(new PersonSocialProfile
                    {
                        Type = im.Protocol.Trim(),
                        Network = im.Protocol.Trim(),
                        Username = im.Handle.Trim(),
                        Url = im.Handle.Trim()
                    });
                }
            }
        }
    }

    private static PersonDto MapToDto(Person p)
    {
        var dto = new PersonDto
        {
            Id = p.Id,
            Name = p.Name,
            Surname = p.Surname,
            MiddleName = p.MiddleName,
            SecondLastName = p.SecondLastName,
            Nickname = p.Nickname,
            Prefix = p.Prefix,
            Suffix = p.Suffix,
            Uid = p.Uid,
            Organization = p.Organization,
            JobTitle = p.JobTitle,
            Photo = p.Photo,
            Gender = p.Gender,
            Anniversary = p.Anniversary,
            LastContact = p.LastContact,
            Notes = p.Notes,
            RelationshipToUserId = p.RelationshipToUserId,
            ContactReminderEnabled = p.ContactReminderEnabled,
            ContactReminderInterval = p.ContactReminderInterval,
            ContactReminderIntervalUnit = p.ContactReminderIntervalUnit,
            LastContactReminderSent = p.LastContactReminderSent,
            CardDavSyncEnabled = p.CardDavSyncEnabled,
            DisplayNameOverride = p.DisplayNameOverride,
            CitizenId = p.CitizenId,
            CitizenIdIssueDate = p.CitizenIdIssueDate,
            CitizenIdIssuePlace = p.CitizenIdIssuePlace,
            ResidenceStatus = p.ResidenceStatus,
            ManagementLevel = p.ManagementLevel,
            HeightCm = p.HeightCm,
            WeightKg = p.WeightKg,
            BloodType = p.BloodType,
            ThreatLevel = p.ThreatLevel,
            ModusOperandi = p.ModusOperandi,
            RiskNotes = p.RiskNotes,
            ImmichPersonId = p.ImmichPersonId,
            ImmichAlbumId = p.ImmichAlbumId,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
            DeletedAt = p.DeletedAt
        };

        if (p.Emails != null)
        {
            dto.Emails = p.Emails.Select(e => new PersonEmailDto
            {
                Id = e.Id,
                Type = e.Type,
                Email = e.Email
            }).ToList();
        }

        if (p.PhoneNumbers != null)
        {
            dto.PhoneNumbers = p.PhoneNumbers.Select(ph => new PersonPhoneDto
            {
                Id = ph.Id,
                Type = ph.Type,
                Number = ph.Number
            }).ToList();
        }

        if (p.Addresses != null)
        {
            dto.Addresses = p.Addresses.Select(a => new PersonAddressDto
            {
                Id = a.Id,
                Type = a.Type,
                StreetLine1 = a.StreetLine1,
                StreetLine2 = a.StreetLine2,
                Locality = a.Locality,
                Region = a.Region,
                PostalCode = a.PostalCode,
                Country = a.Country,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                GeocodedAt = a.GeocodedAt,
                GeocodeStatus = a.GeocodeStatus
            }).ToList();
        }

        if (p.SocialProfiles != null)
        {
            dto.SocialProfiles = p.SocialProfiles.Select(s => new PersonSocialProfileDto
            {
                Id = s.Id,
                Type = s.Type,
                Url = s.Url,
                Network = s.Network,
                Username = s.Username
            }).ToList();

            // Populate Urls and ImHandles for frontend backwards compatibility
            dto.Urls = p.SocialProfiles
                .Where(s => s.Type == "url" || (!string.IsNullOrEmpty(s.Url) && string.IsNullOrEmpty(s.Network)))
                .Select(s => new PersonUrlDto
                {
                    Id = s.Id,
                    Type = s.Type,
                    Url = s.Url ?? string.Empty
                }).ToList();

            dto.ImHandles = p.SocialProfiles
                .Where(s => !string.IsNullOrEmpty(s.Network) || !string.IsNullOrEmpty(s.Username))
                .Select(s => new PersonImHandleDto
                {
                    Id = s.Id,
                    Protocol = s.Network ?? s.Type,
                    Handle = s.Username ?? s.Url ?? string.Empty
                }).ToList();
        }

        if (p.CustomFields != null)
        {
            dto.CustomFields = p.CustomFields.Select(c => new PersonCustomFieldDto
            {
                Id = c.Id,
                Key = c.Key,
                Value = c.Value,
                Type = c.Type
            }).ToList();
        }

        if (p.ImportantDates != null)
        {
            dto.ImportantDates = p.ImportantDates
                .Where(d => d.DeletedAt == null)
                .OrderBy(d => d.Date)
                .Select(d => new ImportantDateDto
                {
                    Id = d.Id,
                    PersonId = d.PersonId,
                    Title = d.Title,
                    Type = d.Type,
                    Date = d.Date,
                    YearUnknown = d.YearUnknown,
                    ReminderEnabled = d.ReminderEnabled,
                    ReminderType = d.ReminderType,
                    ReminderInterval = d.ReminderInterval,
                    ReminderIntervalUnit = d.ReminderIntervalUnit,
                    ReminderLeadDays = d.ReminderLeadDays,
                    LastReminderSent = d.LastReminderSent,
                    LastLeadReminderSent = d.LastLeadReminderSent,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt
                }).ToList();
        }

        return dto;
    }
}

