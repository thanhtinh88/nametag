using System.Text.RegularExpressions;
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
    private readonly IPhotoStorageService _photoStorageService;

    public PersonService(IAppDbContext db, IPhotoStorageService photoStorageService)
    {
        _db = db;
        _photoStorageService = photoStorageService;
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

    // ─── Sub-resource: Suspect Vehicles ──────────────────────────────────────────

    public async Task<List<SuspectVehicleDto>> GetVehiclesAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var vehicles = await _db.SuspectVehicles
            .AsNoTracking()
            .Where(v => v.PersonId == personId && v.DeletedAt == null)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync(ct);

        return vehicles.Select(MapVehicleToDto).ToList();
    }

    public async Task<SuspectVehicleDto> CreateVehicleAsync(Guid userId, Guid personId, CreateSuspectVehicleRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var vehicle = new SuspectVehicle
        {
            PersonId = personId,
            PlateNumber = request.PlateNumber.Trim(),
            VehicleType = request.VehicleType.Trim(),
            BrandModel = request.BrandModel?.Trim(),
            Color = request.Color?.Trim(),
            IdentifyingFeatures = request.IdentifyingFeatures?.Trim(),
            RegisteredOwner = request.RegisteredOwner?.Trim(),
            IsSuspicious = request.IsSuspicious ?? false
        };

        _db.SuspectVehicles.Add(vehicle);
        await _db.SaveChangesAsync(ct);

        return MapVehicleToDto(vehicle);
    }

    public async Task<SuspectVehicleDto> UpdateVehicleAsync(Guid userId, Guid personId, Guid vehicleId, UpdateSuspectVehicleRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var vehicle = await _db.SuspectVehicles
            .Where(v => v.Id == vehicleId && v.PersonId == personId && v.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (vehicle == null)
        {
            throw new NotFoundException("Vehicle not found");
        }

        if (request.PlateNumber != null) vehicle.PlateNumber = request.PlateNumber.Trim();
        if (request.VehicleType != null) vehicle.VehicleType = request.VehicleType.Trim();
        if (request.BrandModel != null) vehicle.BrandModel = request.BrandModel.Trim();
        if (request.Color != null) vehicle.Color = request.Color.Trim();
        if (request.IdentifyingFeatures != null) vehicle.IdentifyingFeatures = request.IdentifyingFeatures.Trim();
        if (request.RegisteredOwner != null) vehicle.RegisteredOwner = request.RegisteredOwner.Trim();
        if (request.IsSuspicious.HasValue) vehicle.IsSuspicious = request.IsSuspicious.Value;

        await _db.SaveChangesAsync(ct);

        return MapVehicleToDto(vehicle);
    }

    public async Task DeleteVehicleAsync(Guid userId, Guid personId, Guid vehicleId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var vehicle = await _db.SuspectVehicles
            .Where(v => v.Id == vehicleId && v.PersonId == personId && v.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (vehicle == null)
        {
            throw new NotFoundException("Vehicle not found");
        }

        vehicle.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static SuspectVehicleDto MapVehicleToDto(SuspectVehicle v) => new()
    {
        Id = v.Id,
        PersonId = v.PersonId,
        PlateNumber = v.PlateNumber,
        VehicleType = v.VehicleType,
        BrandModel = v.BrandModel,
        Color = v.Color,
        IdentifyingFeatures = v.IdentifyingFeatures,
        RegisteredOwner = v.RegisteredOwner,
        IsSuspicious = v.IsSuspicious,
        CreatedAt = v.CreatedAt,
        UpdatedAt = v.UpdatedAt
    };

    // ─── Sub-resource: Physical Marks ─────────────────────────────────────────────

    public async Task<List<PhysicalMarkDto>> GetPhysicalMarksAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var marks = await _db.PhysicalMarks
            .AsNoTracking()
            .Where(m => m.PersonId == personId && m.DeletedAt == null)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);

        return marks.Select(MapMarkToDto).ToList();
    }

    public async Task<PhysicalMarkDto> CreatePhysicalMarkAsync(Guid userId, Guid personId, CreatePhysicalMarkRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var mark = new PhysicalMark
        {
            PersonId = personId,
            Type = request.Type.Trim().ToUpperInvariant(),
            Location = request.Location.Trim(),
            Description = request.Description.Trim(),
            PhotoUrl = request.PhotoUrl?.Trim()
        };

        _db.PhysicalMarks.Add(mark);
        await _db.SaveChangesAsync(ct);

        return MapMarkToDto(mark);
    }

    public async Task<PhysicalMarkDto> UpdatePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, UpdatePhysicalMarkRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var mark = await _db.PhysicalMarks
            .Where(m => m.Id == markId && m.PersonId == personId && m.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (mark == null)
        {
            throw new NotFoundException("Physical mark not found");
        }

        if (request.Type != null) mark.Type = request.Type.Trim().ToUpperInvariant();
        if (request.Location != null) mark.Location = request.Location.Trim();
        if (request.Description != null) mark.Description = request.Description.Trim();
        if (request.PhotoUrl != null) mark.PhotoUrl = request.PhotoUrl.Trim();

        await _db.SaveChangesAsync(ct);

        return MapMarkToDto(mark);
    }

    public async Task DeletePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var mark = await _db.PhysicalMarks
            .Where(m => m.Id == markId && m.PersonId == personId && m.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (mark == null)
        {
            throw new NotFoundException("Physical mark not found");
        }

        mark.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static PhysicalMarkDto MapMarkToDto(PhysicalMark m) => new()
    {
        Id = m.Id,
        PersonId = m.PersonId,
        Type = m.Type,
        Location = m.Location,
        Description = m.Description,
        PhotoUrl = m.PhotoUrl,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt
    };

    // ─── Sub-resource: Criminal Records ───────────────────────────────────────────

    public async Task<List<CriminalRecordDto>> GetCriminalRecordsAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var records = await _db.CriminalRecords
            .AsNoTracking()
            .Where(r => r.PersonId == personId && r.DeletedAt == null)
            .OrderByDescending(r => r.IncidentDate)
            .ToListAsync(ct);

        return records.Select(MapRecordToDto).ToList();
    }

    public async Task<CriminalRecordDto> CreateCriminalRecordAsync(Guid userId, Guid personId, CreateCriminalRecordRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var record = new CriminalRecord
        {
            PersonId = personId,
            Charge = request.Charge.Trim(),
            RecordType = string.IsNullOrEmpty(request.RecordType) ? "CONVICTION" : request.RecordType.Trim().ToUpperInvariant(),
            SentenceDetail = request.SentenceDetail?.Trim(),
            AdjudicatedBy = request.AdjudicatedBy?.Trim(),
            IncidentDate = request.IncidentDate,
            VerdictDate = request.VerdictDate,
            IsPardoned = request.IsPardoned ?? false,
            Notes = request.Notes?.Trim()
        };

        _db.CriminalRecords.Add(record);
        await _db.SaveChangesAsync(ct);

        return MapRecordToDto(record);
    }

    public async Task<CriminalRecordDto> UpdateCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, UpdateCriminalRecordRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var record = await _db.CriminalRecords
            .Where(r => r.Id == recordId && r.PersonId == personId && r.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (record == null)
        {
            throw new NotFoundException("Criminal record not found");
        }

        if (request.Charge != null) record.Charge = request.Charge.Trim();
        if (request.RecordType != null) record.RecordType = request.RecordType.Trim().ToUpperInvariant();
        if (request.SentenceDetail != null) record.SentenceDetail = request.SentenceDetail.Trim();
        if (request.AdjudicatedBy != null) record.AdjudicatedBy = request.AdjudicatedBy.Trim();
        if (request.IncidentDate.HasValue) record.IncidentDate = request.IncidentDate;
        if (request.VerdictDate.HasValue) record.VerdictDate = request.VerdictDate;
        if (request.IsPardoned.HasValue) record.IsPardoned = request.IsPardoned.Value;
        if (request.Notes != null) record.Notes = request.Notes.Trim();

        await _db.SaveChangesAsync(ct);

        return MapRecordToDto(record);
    }

    public async Task DeleteCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var record = await _db.CriminalRecords
            .Where(r => r.Id == recordId && r.PersonId == personId && r.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (record == null)
        {
            throw new NotFoundException("Criminal record not found");
        }

        record.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static CriminalRecordDto MapRecordToDto(CriminalRecord r) => new()
    {
        Id = r.Id,
        PersonId = r.PersonId,
        Charge = r.Charge,
        RecordType = r.RecordType,
        SentenceDetail = r.SentenceDetail,
        AdjudicatedBy = r.AdjudicatedBy,
        IncidentDate = r.IncidentDate,
        VerdictDate = r.VerdictDate,
        IsPardoned = r.IsPardoned,
        Notes = r.Notes,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };

    // ─── Sub-resource: Bank Accounts ──────────────────────────────────────────────

    public async Task<List<SuspectBankAccountDto>> GetBankAccountsAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var accounts = await _db.SuspectBankAccounts
            .AsNoTracking()
            .Where(b => b.PersonId == personId && b.DeletedAt == null)
            .OrderByDescending(b => b.IsPrimary)
            .ThenByDescending(b => b.CreatedAt)
            .ToListAsync(ct);

        return accounts.Select(MapAccountToDto).ToList();
    }

    public async Task<SuspectBankAccountDto> CreateBankAccountAsync(Guid userId, Guid personId, CreateSuspectBankAccountRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        if (request.IsPrimary == true)
        {
            var otherPrimaries = await _db.SuspectBankAccounts
                .Where(b => b.PersonId == personId && b.IsPrimary && b.DeletedAt == null)
                .ToListAsync(ct);
            foreach (var op in otherPrimaries)
            {
                op.IsPrimary = false;
            }
        }

        var account = new SuspectBankAccount
        {
            PersonId = personId,
            BankName = request.BankName.Trim(),
            AccountNumber = request.AccountNumber.Trim(),
            AccountHolder = request.AccountHolder?.Trim(),
            AccountType = string.IsNullOrEmpty(request.AccountType) ? "OWNER" : request.AccountType.Trim().ToUpperInvariant(),
            IsPrimary = request.IsPrimary ?? false,
            Notes = request.Notes?.Trim()
        };

        _db.SuspectBankAccounts.Add(account);
        await _db.SaveChangesAsync(ct);

        return MapAccountToDto(account);
    }

    public async Task<SuspectBankAccountDto> UpdateBankAccountAsync(Guid userId, Guid personId, Guid accountId, UpdateSuspectBankAccountRequest request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var account = await _db.SuspectBankAccounts
            .Where(b => b.Id == accountId && b.PersonId == personId && b.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (account == null)
        {
            throw new NotFoundException("Bank account not found");
        }

        if (request.IsPrimary == true)
        {
            var otherPrimaries = await _db.SuspectBankAccounts
                .Where(b => b.PersonId == personId && b.IsPrimary && b.Id != accountId && b.DeletedAt == null)
                .ToListAsync(ct);
            foreach (var op in otherPrimaries)
            {
                op.IsPrimary = false;
            }
        }

        if (request.BankName != null) account.BankName = request.BankName.Trim();
        if (request.AccountNumber != null) account.AccountNumber = request.AccountNumber.Trim();
        if (request.AccountHolder != null) account.AccountHolder = request.AccountHolder.Trim();
        if (request.AccountType != null) account.AccountType = request.AccountType.Trim().ToUpperInvariant();
        if (request.IsPrimary.HasValue) account.IsPrimary = request.IsPrimary.Value;
        if (request.Notes != null) account.Notes = request.Notes.Trim();

        await _db.SaveChangesAsync(ct);

        return MapAccountToDto(account);
    }

    public async Task DeleteBankAccountAsync(Guid userId, Guid personId, Guid accountId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var account = await _db.SuspectBankAccounts
            .Where(b => b.Id == accountId && b.PersonId == personId && b.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (account == null)
        {
            throw new NotFoundException("Bank account not found");
        }

        account.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static SuspectBankAccountDto MapAccountToDto(SuspectBankAccount b) => new()
    {
        Id = b.Id,
        PersonId = b.PersonId,
        BankName = b.BankName,
        AccountNumber = b.AccountNumber,
        AccountHolder = b.AccountHolder,
        AccountType = b.AccountType,
        IsPrimary = b.IsPrimary,
        Notes = b.Notes,
        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
    };

    // ─── Sub-resource: Important Dates ────────────────────────────────────────────

    public async Task<List<ImportantDateDto>> GetImportantDatesAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var dates = await _db.ImportantDates
            .AsNoTracking()
            .Where(d => d.PersonId == personId && d.DeletedAt == null)
            .OrderBy(d => d.Date)
            .ToListAsync(ct);

        return dates.Select(MapDateToDto).ToList();
    }

    public async Task<ImportantDateDto> CreateImportantDateAsync(Guid userId, Guid personId, CreateImportantDateDto request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        if (!string.IsNullOrEmpty(request.Type))
        {
            var exists = await _db.ImportantDates
                .AnyAsync(d => d.PersonId == personId && d.Type == request.Type && d.DeletedAt == null, ct);
            if (exists)
            {
                throw new BadRequestException($"A \"{request.Type}\" date already exists for this person.");
            }
        }

        var importantDate = new ImportantDate
        {
            UserId = userId,
            PersonId = personId,
            Type = request.Type,
            Title = string.IsNullOrEmpty(request.Title) ? (request.Type ?? string.Empty) : request.Title.Trim(),
            Date = request.Date,
            YearUnknown = request.YearUnknown ?? false,
            ReminderEnabled = request.ReminderEnabled ?? false,
            ReminderType = request.ReminderType,
            ReminderInterval = request.ReminderInterval,
            ReminderIntervalUnit = request.ReminderIntervalUnit,
            ReminderLeadDays = request.ReminderLeadDays
        };

        _db.ImportantDates.Add(importantDate);
        await _db.SaveChangesAsync(ct);

        return MapDateToDto(importantDate);
    }

    public async Task<ImportantDateDto> UpdateImportantDateAsync(Guid userId, Guid personId, Guid dateId, CreateImportantDateDto request, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var date = await _db.ImportantDates
            .Where(d => d.Id == dateId && d.PersonId == personId && d.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (date == null)
        {
            throw new NotFoundException("Important date not found");
        }

        if (!string.IsNullOrEmpty(request.Type))
        {
            var exists = await _db.ImportantDates
                .AnyAsync(d => d.PersonId == personId && d.Type == request.Type && d.Id != dateId && d.DeletedAt == null, ct);
            if (exists)
            {
                throw new BadRequestException($"A \"{request.Type}\" date already exists for this person.");
            }
        }

        date.Type = request.Type;
        date.Title = string.IsNullOrEmpty(request.Title) ? (request.Type ?? string.Empty) : request.Title.Trim();
        date.Date = request.Date;
        if (request.YearUnknown.HasValue) date.YearUnknown = request.YearUnknown.Value;
        if (request.ReminderEnabled.HasValue) date.ReminderEnabled = request.ReminderEnabled.Value;
        date.ReminderType = request.ReminderType;
        date.ReminderInterval = request.ReminderInterval;
        date.ReminderIntervalUnit = request.ReminderIntervalUnit;
        date.ReminderLeadDays = request.ReminderLeadDays;

        await _db.SaveChangesAsync(ct);

        return MapDateToDto(date);
    }

    public async Task DeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var date = await _db.ImportantDates
            .Where(d => d.Id == dateId && d.PersonId == personId && d.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (date == null)
        {
            throw new NotFoundException("Important date not found");
        }

        date.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ImportantDateDto> RestoreImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var date = await _db.ImportantDates
            .IgnoreQueryFilters()
            .Where(d => d.Id == dateId && d.PersonId == personId)
            .FirstOrDefaultAsync(ct);

        if (date == null)
        {
            throw new NotFoundException("Important date not found");
        }

        if (date.DeletedAt == null)
        {
            throw new BadRequestException("Important date is not deleted");
        }

        if (!string.IsNullOrEmpty(date.Type))
        {
            var exists = await _db.ImportantDates
                .AnyAsync(d => d.PersonId == personId && d.Type == date.Type && d.DeletedAt == null, ct);
            if (exists)
            {
                throw new BadRequestException($"A {date.Type} date already exists for this person. Delete it first before restoring this one.");
            }
        }

        date.DeletedAt = null;
        await _db.SaveChangesAsync(ct);

        return MapDateToDto(date);
    }

    public async Task PermanentDeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default)
    {
        await EnsurePersonExistsAsync(userId, personId, ct);

        var date = await _db.ImportantDates
            .IgnoreQueryFilters()
            .Where(d => d.Id == dateId && d.PersonId == personId)
            .FirstOrDefaultAsync(ct);

        if (date == null)
        {
            throw new NotFoundException("Important date not found");
        }

        _db.ImportantDates.Remove(date);
        await _db.SaveChangesAsync(ct);
    }

    private static ImportantDateDto MapDateToDto(ImportantDate d) => new()
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
    };

    // ─── Advanced: Duplicates & Dismiss ───────────────────────────────────────────

    public async Task<List<DuplicateGroupDto>> GetAllDuplicatesAsync(Guid userId, CancellationToken ct = default)
    {
        var people = await _db.People
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.ImportantDates)
            .ToListAsync(ct);

        var dismissals = await _db.DuplicateDismissals
            .AsNoTracking()
            .Where(d => d.UserId == userId)
            .Select(d => new { d.PersonAId, d.PersonBId })
            .ToListAsync(ct);

        var dismissedSet = new HashSet<string>(
            dismissals.Select(d => $"{d.PersonAId}:{d.PersonBId}")
        );

        var compPeople = people.Select(MapToComparison).ToList();
        return FindAllDuplicateGroups(compPeople, dismissedSet);
    }

    public async Task<List<DuplicateCandidateDto>> GetPersonDuplicatesAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        var targetPerson = await _db.People
            .AsNoTracking()
            .Where(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.ImportantDates)
            .FirstOrDefaultAsync(ct);

        if (targetPerson == null)
        {
            throw new NotFoundException("Person not found");
        }

        var allPeople = await _db.People
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.ImportantDates)
            .ToListAsync(ct);

        var dismissals = await _db.DuplicateDismissals
            .AsNoTracking()
            .Where(d => d.UserId == userId && (d.PersonAId == personId || d.PersonBId == personId))
            .ToListAsync(ct);

        var dismissedPartners = new HashSet<Guid>(
            dismissals.Select(d => d.PersonAId == personId ? d.PersonBId : d.PersonAId)
        );

        var targetComp = MapToComparison(targetPerson);
        var allComp = allPeople.Select(MapToComparison).ToList();

        var candidates = FindDuplicates(targetComp, allComp, personId)
            .Where(c => !dismissedPartners.Contains(c.PersonId))
            .ToList();

        return candidates;
    }

    public async Task DismissDuplicateAsync(Guid userId, Guid personAId, Guid personBId, CancellationToken ct = default)
    {
        if (personAId == personBId)
        {
            throw new BadRequestException("Cannot dismiss a person with themselves");
        }

        var smallerId = personAId.CompareTo(personBId) < 0 ? personAId : personBId;
        var largerId = personAId.CompareTo(personBId) < 0 ? personBId : personAId;

        var count = await _db.People
            .CountAsync(p => p.UserId == userId && (p.Id == smallerId || p.Id == largerId) && p.DeletedAt == null, ct);

        if (count != 2)
        {
            throw new NotFoundException("One or both people not found");
        }

        var existing = await _db.DuplicateDismissals
            .FirstOrDefaultAsync(d => d.UserId == userId && d.PersonAId == smallerId && d.PersonBId == largerId, ct);

        if (existing == null)
        {
            _db.DuplicateDismissals.Add(new DuplicateDismissal
            {
                UserId = userId,
                PersonAId = smallerId,
                PersonBId = largerId
            });
            await _db.SaveChangesAsync(ct);
        }
    }

    private class PersonForComparison
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Surname { get; set; }
        public List<string> Emails { get; set; } = new();
        public List<string> Phones { get; set; } = new();
        public List<DateTime> Birthdays { get; set; } = new();
    }

    private static PersonForComparison MapToComparison(Person p) => new()
    {
        Id = p.Id,
        Name = p.Name ?? string.Empty,
        Surname = p.Surname,
        Emails = p.Emails?.Select(e => e.Email.Trim().ToLowerInvariant()).ToList() ?? new List<string>(),
        Phones = p.PhoneNumbers?.Select(ph => Regex.Replace(ph.Number, @"\D", "")).ToList() ?? new List<string>(),
        Birthdays = p.ImportantDates?
            .Where(d => d.DeletedAt == null && d.Type == "birthday")
            .Select(d => d.Date)
            .ToList() ?? new List<DateTime>()
    };

    private static int Levenshtein(string a, string b)
    {
        if (a == b) return 0;
        if (a.Length == 0) return b.Length;
        if (b.Length == 0) return a.Length;

        if (a.Length < b.Length)
        {
            (a, b) = (b, a);
        }

        var bLen = b.Length;
        var prev = new int[bLen + 1];
        var curr = new int[bLen + 1];

        for (var i = 0; i <= bLen; i++) prev[i] = i;

        for (var i = 1; i <= a.Length; i++)
        {
            curr[0] = i;
            for (var j = 1; j <= bLen; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                curr[j] = Math.Min(
                    Math.Min(curr[j - 1] + 1, prev[j] + 1),
                    prev[j - 1] + cost);
            }
            Array.Copy(curr, prev, bLen + 1);
        }

        return prev[bLen];
    }

    private static double StringSimilarity(string a, string b)
    {
        var maxLen = Math.Max(a.Length, b.Length);
        if (maxLen == 0) return 1.0;
        return 1.0 - (double)Levenshtein(a, b) / maxLen;
    }

    private static (double Score, bool AutoFlagged) CompositeSimilarity(PersonForComparison a, PersonForComparison b)
    {
        var normNameA = a.Name.Trim().ToLowerInvariant();
        var normNameB = b.Name.Trim().ToLowerInvariant();
        var normSurA = (a.Surname ?? "").Trim().ToLowerInvariant();
        var normSurB = (b.Surname ?? "").Trim().ToLowerInvariant();

        double nameScore;
        if (!string.IsNullOrEmpty(a.Surname) && !string.IsNullOrEmpty(b.Surname))
        {
            var nameSim = StringSimilarity(normNameA, normNameB);
            var surSim = StringSimilarity(normSurA, normSurB);
            nameScore = nameSim * 0.6 + surSim * 0.4;
        }
        else
        {
            var fullA = $"{normNameA} {normSurA}".Trim();
            var fullB = $"{normNameB} {normSurB}".Trim();
            nameScore = StringSimilarity(fullA, fullB);
        }

        var emailMatch = a.Emails.Count > 0 && b.Emails.Count > 0 && a.Emails.Intersect(b.Emails).Any();
        var phoneMatch = a.Phones.Count > 0 && b.Phones.Count > 0 && a.Phones.Intersect(b.Phones).Any();

        var birthdayMatch = false;
        if (a.Birthdays.Count > 0 && b.Birthdays.Count > 0)
        {
            foreach (var da in a.Birthdays)
            {
                foreach (var db in b.Birthdays)
                {
                    if (da.Month == db.Month && da.Day == db.Day)
                    {
                        birthdayMatch = true;
                        break;
                    }
                }
                if (birthdayMatch) break;
            }
        }

        var totalWeight = 0.4;
        var score = 0.4 * nameScore;
        var comparableCount = 1;

        if (a.Emails.Count > 0 && b.Emails.Count > 0)
        {
            totalWeight += 0.3;
            score += 0.3 * (emailMatch ? 1.0 : 0.0);
            comparableCount++;
        }
        if (a.Phones.Count > 0 && b.Phones.Count > 0)
        {
            totalWeight += 0.2;
            score += 0.2 * (phoneMatch ? 1.0 : 0.0);
            comparableCount++;
        }
        if (birthdayMatch)
        {
            totalWeight += 0.1;
            score += 0.1 * 1.0;
            comparableCount++;
        }

        var normalizedScore = score / totalWeight;
        if (comparableCount < 2 && nameScore < 0.95)
        {
            normalizedScore = Math.Min(normalizedScore, 0.6);
        }

        if (emailMatch)
        {
            normalizedScore = Math.Max(normalizedScore, 0.85);
        }

        return (normalizedScore, emailMatch);
    }

    private static List<DuplicateCandidateDto> FindDuplicates(PersonForComparison target, List<PersonForComparison> people, Guid targetId)
    {
        var candidates = new List<DuplicateCandidateDto>();
        foreach (var p in people)
        {
            if (p.Id == targetId) continue;
            var (score, autoFlagged) = CompositeSimilarity(target, p);
            if (score >= 0.75 || autoFlagged)
            {
                candidates.Add(new DuplicateCandidateDto
                {
                    PersonId = p.Id,
                    Name = p.Name,
                    Surname = p.Surname,
                    Similarity = Math.Round(score, 4)
                });
            }
        }

        return candidates.OrderByDescending(c => c.Similarity).ToList();
    }

    private static List<DuplicateGroupDto> FindAllDuplicateGroups(List<PersonForComparison> people, HashSet<string> dismissedPairs)
    {
        var parent = new Dictionary<Guid, Guid>();
        foreach (var p in people) parent[p.Id] = p.Id;

        Guid Find(Guid x)
        {
            if (parent[x] == x) return x;
            return parent[x] = Find(parent[x]);
        }

        void Union(Guid x, Guid y)
        {
            var rx = Find(x);
            var ry = Find(y);
            if (rx != ry) parent[ry] = rx;
        }

        for (var i = 0; i < people.Count; i++)
        {
            for (var j = i + 1; j < people.Count; j++)
            {
                var a = people[i];
                var b = people[j];
                var key = a.Id.CompareTo(b.Id) < 0 ? $"{a.Id}:{b.Id}" : $"{b.Id}:{a.Id}";
                if (dismissedPairs.Contains(key)) continue;

                var (score, autoFlagged) = CompositeSimilarity(a, b);
                if (score >= 0.75 || autoFlagged)
                {
                    Union(a.Id, b.Id);
                }
            }
        }

        var clusters = new Dictionary<Guid, List<PersonForComparison>>();
        foreach (var p in people)
        {
            var root = Find(p.Id);
            if (!clusters.ContainsKey(root)) clusters[root] = new List<PersonForComparison>();
            clusters[root].Add(p);
        }

        var groups = new List<DuplicateGroupDto>();
        foreach (var cluster in clusters.Values.Where(c => c.Count >= 2))
        {
            var maxSim = 0.75;
            for (var i = 0; i < cluster.Count; i++)
            {
                for (var j = i + 1; j < cluster.Count; j++)
                {
                    var (score, _) = CompositeSimilarity(cluster[i], cluster[j]);
                    if (score > maxSim) maxSim = score;
                }
            }

            groups.Add(new DuplicateGroupDto
            {
                People = cluster.Select(p => new DuplicatePersonItemDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Surname = p.Surname
                }).ToList(),
                Similarity = Math.Round(maxSim, 4)
            });
        }

        return groups.OrderByDescending(g => g.Similarity).ToList();
    }

    // ─── Advanced: Merge ──────────────────────────────────────────────────────────

    public async Task<Guid> MergePeopleAsync(Guid userId, MergePeopleRequest request, CancellationToken ct = default)
    {
        if (request.PrimaryId == request.SecondaryId)
        {
            throw new BadRequestException("Cannot merge a person into themselves");
        }

        var primary = await _db.People
            .Where(p => p.Id == request.PrimaryId && p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.ImportantDates)
            .Include(p => p.Groups)
            .Include(p => p.Vehicles)
            .Include(p => p.PhysicalMarks)
            .Include(p => p.CriminalRecords)
            .Include(p => p.BankAccounts)
            .Include(p => p.GangMemberships)
            .Include(p => p.CustomFieldValues)
            .FirstOrDefaultAsync(ct);

        var secondary = await _db.People
            .Where(p => p.Id == request.SecondaryId && p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.ImportantDates)
            .Include(p => p.Groups)
            .Include(p => p.Vehicles)
            .Include(p => p.PhysicalMarks)
            .Include(p => p.CriminalRecords)
            .Include(p => p.BankAccounts)
            .Include(p => p.GangMemberships)
            .Include(p => p.CustomFieldValues)
            .FirstOrDefaultAsync(ct);

        if (primary == null || secondary == null)
        {
            throw new NotFoundException("Person not found");
        }

        // Apply overrides or auto-transfer empty scalar fields
        var overrides = request.FieldOverrides;
        if (overrides != null)
        {
            if (overrides.Name != null) primary.Name = overrides.Name;
            if (overrides.Surname != null) primary.Surname = overrides.Surname;
            if (overrides.MiddleName != null) primary.MiddleName = overrides.MiddleName;
            if (overrides.SecondLastName != null) primary.SecondLastName = overrides.SecondLastName;
            if (overrides.Nickname != null) primary.Nickname = overrides.Nickname;
            if (overrides.DisplayNameOverride != null) primary.DisplayNameOverride = overrides.DisplayNameOverride;
            if (overrides.Prefix != null) primary.Prefix = overrides.Prefix;
            if (overrides.Suffix != null) primary.Suffix = overrides.Suffix;
            if (overrides.Organization != null) primary.Organization = overrides.Organization;
            if (overrides.JobTitle != null) primary.JobTitle = overrides.JobTitle;
            if (overrides.Gender != null) primary.Gender = overrides.Gender;
            if (overrides.Photo != null) primary.Photo = overrides.Photo;
            if (overrides.Notes != null) primary.Notes = overrides.Notes;
            if (overrides.Anniversary.HasValue) primary.Anniversary = overrides.Anniversary;
            if (overrides.LastContact.HasValue) primary.LastContact = overrides.LastContact;
            if (overrides.RelationshipToUserId.HasValue) primary.RelationshipToUserId = overrides.RelationshipToUserId;
        }

        // Auto-transfer scalars if empty on primary
        if (string.IsNullOrEmpty(primary.Surname) && !string.IsNullOrEmpty(secondary.Surname)) primary.Surname = secondary.Surname;
        if (string.IsNullOrEmpty(primary.MiddleName) && !string.IsNullOrEmpty(secondary.MiddleName)) primary.MiddleName = secondary.MiddleName;
        if (string.IsNullOrEmpty(primary.SecondLastName) && !string.IsNullOrEmpty(secondary.SecondLastName)) primary.SecondLastName = secondary.SecondLastName;
        if (string.IsNullOrEmpty(primary.Nickname) && !string.IsNullOrEmpty(secondary.Nickname)) primary.Nickname = secondary.Nickname;
        if (string.IsNullOrEmpty(primary.Photo) && !string.IsNullOrEmpty(secondary.Photo)) primary.Photo = secondary.Photo;
        if (string.IsNullOrEmpty(primary.Organization) && !string.IsNullOrEmpty(secondary.Organization)) primary.Organization = secondary.Organization;
        if (string.IsNullOrEmpty(primary.JobTitle) && !string.IsNullOrEmpty(secondary.JobTitle)) primary.JobTitle = secondary.JobTitle;
        if (string.IsNullOrEmpty(primary.Notes) && !string.IsNullOrEmpty(secondary.Notes)) primary.Notes = secondary.Notes;
        if (!primary.Anniversary.HasValue && secondary.Anniversary.HasValue) primary.Anniversary = secondary.Anniversary;
        if (!primary.LastContact.HasValue && secondary.LastContact.HasValue) primary.LastContact = secondary.LastContact;
        if (!primary.RelationshipToUserId.HasValue && secondary.RelationshipToUserId.HasValue) primary.RelationshipToUserId = secondary.RelationshipToUserId;

        // Deduplicate & transfer collections
        var targetEmails = new HashSet<string>(primary.Emails.Select(e => e.Email.ToLowerInvariant()));
        foreach (var e in secondary.Emails.Where(e => !targetEmails.Contains(e.Email.ToLowerInvariant())))
        {
            primary.Emails.Add(new PersonEmail { PersonId = primary.Id, Type = e.Type, Email = e.Email });
        }

        var targetPhones = new HashSet<string>(primary.PhoneNumbers.Select(p => p.Number));
        foreach (var p in secondary.PhoneNumbers.Where(p => !targetPhones.Contains(p.Number)))
        {
            primary.PhoneNumbers.Add(new PersonPhone { PersonId = primary.Id, Type = p.Type, Number = p.Number });
        }

        var targetAddresses = new HashSet<string>(primary.Addresses.Select(a => $"{a.StreetLine1}|{a.Locality}|{a.Country}".ToLowerInvariant()));
        foreach (var a in secondary.Addresses)
        {
            var key = $"{a.StreetLine1}|{a.Locality}|{a.Country}".ToLowerInvariant();
            if (!targetAddresses.Contains(key))
            {
                primary.Addresses.Add(new PersonAddress
                {
                    PersonId = primary.Id,
                    Type = a.Type,
                    StreetLine1 = a.StreetLine1,
                    StreetLine2 = a.StreetLine2,
                    Locality = a.Locality,
                    Region = a.Region,
                    PostalCode = a.PostalCode,
                    Country = a.Country
                });
            }
        }

        var targetDates = new HashSet<string>(primary.ImportantDates.Select(d => $"{d.Title}:{d.Date:yyyy-MM-dd}"));
        foreach (var d in secondary.ImportantDates.Where(d => d.DeletedAt == null))
        {
            var key = $"{d.Title}:{d.Date:yyyy-MM-dd}";
            if (!targetDates.Contains(key))
            {
                primary.ImportantDates.Add(new ImportantDate
                {
                    UserId = userId,
                    PersonId = primary.Id,
                    Title = d.Title,
                    Type = d.Type,
                    Date = d.Date,
                    YearUnknown = d.YearUnknown,
                    ReminderEnabled = d.ReminderEnabled
                });
            }
        }

        var targetGroups = new HashSet<Guid>(primary.Groups.Select(g => g.GroupId));
        foreach (var g in secondary.Groups.Where(g => !targetGroups.Contains(g.GroupId)))
        {
            primary.Groups.Add(new PersonGroup { PersonId = primary.Id, GroupId = g.GroupId });
        }

        var targetPlates = new HashSet<string>(primary.Vehicles.Where(v => v.DeletedAt == null).Select(v => v.PlateNumber));
        foreach (var v in secondary.Vehicles.Where(v => v.DeletedAt == null && !targetPlates.Contains(v.PlateNumber)))
        {
            primary.Vehicles.Add(new SuspectVehicle
            {
                PersonId = primary.Id,
                PlateNumber = v.PlateNumber,
                VehicleType = v.VehicleType,
                BrandModel = v.BrandModel,
                Color = v.Color,
                RegisteredOwner = v.RegisteredOwner
            });
        }

        var targetAccounts = new HashSet<string>(primary.BankAccounts.Where(b => b.DeletedAt == null).Select(b => $"{b.BankName}:{b.AccountNumber}"));
        foreach (var b in secondary.BankAccounts.Where(b => b.DeletedAt == null))
        {
            var key = $"{b.BankName}:{b.AccountNumber}";
            if (!targetAccounts.Contains(key))
            {
                primary.BankAccounts.Add(new SuspectBankAccount
                {
                    PersonId = primary.Id,
                    BankName = b.BankName,
                    AccountNumber = b.AccountNumber,
                    AccountHolder = b.AccountHolder,
                    AccountType = b.AccountType,
                    IsPrimary = false
                });
            }
        }

        // Re-parent relationships
        var relsFromSecondary = await _db.Relationships
            .Where(r => r.PersonId == secondary.Id && r.DeletedAt == null)
            .ToListAsync(ct);

        foreach (var rel in relsFromSecondary)
        {
            if (rel.RelatedPersonId == primary.Id) continue;
            var exists = await _db.Relationships
                .AnyAsync(r => r.PersonId == primary.Id && r.RelatedPersonId == rel.RelatedPersonId && r.DeletedAt == null, ct);
            if (!exists)
            {
                rel.PersonId = primary.Id;
            }
            else
            {
                rel.DeletedAt = DateTime.UtcNow;
            }
        }

        var relsToSecondary = await _db.Relationships
            .Where(r => r.RelatedPersonId == secondary.Id && r.DeletedAt == null)
            .ToListAsync(ct);

        foreach (var rel in relsToSecondary)
        {
            if (rel.PersonId == primary.Id) continue;
            var exists = await _db.Relationships
                .AnyAsync(r => r.PersonId == rel.PersonId && r.RelatedPersonId == primary.Id && r.DeletedAt == null, ct);
            if (!exists)
            {
                rel.RelatedPersonId = primary.Id;
            }
            else
            {
                rel.DeletedAt = DateTime.UtcNow;
            }
        }

        // Soft-delete secondary
        secondary.DeletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return primary.Id;
    }

    // ─── Advanced: Orphans ────────────────────────────────────────────────────────

    public async Task<List<PersonOrphanDto>> GetPersonOrphansAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        var person = await _db.People
            .AsNoTracking()
            .Where(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Relationships)
            .Include(p => p.RelatedRelationships)
            .FirstOrDefaultAsync(ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        var relatedIds = new HashSet<Guid>();
        foreach (var r in person.Relationships.Where(r => r.DeletedAt == null)) relatedIds.Add(r.RelatedPersonId);
        foreach (var r in person.RelatedRelationships.Where(r => r.DeletedAt == null)) relatedIds.Add(r.PersonId);

        if (relatedIds.Count == 0) return new List<PersonOrphanDto>();

        var relatedPeople = await _db.People
            .AsNoTracking()
            .Where(p => relatedIds.Contains(p.Id) && p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Relationships)
            .Include(p => p.RelatedRelationships)
            .ToListAsync(ct);

        var orphans = new List<PersonOrphanDto>();
        foreach (var p in relatedPeople)
        {
            if (p.RelationshipToUserId.HasValue) continue;

            var otherRelsCount = p.Relationships.Count(r => r.DeletedAt == null && r.RelatedPersonId != personId) +
                                 p.RelatedRelationships.Count(r => r.DeletedAt == null && r.PersonId != personId);

            if (otherRelsCount == 0)
            {
                orphans.Add(new PersonOrphanDto
                {
                    Id = p.Id,
                    FullName = FormatFullName(p.Name, p.Surname)
                });
            }
        }

        return orphans;
    }

    public async Task<BulkOrphansResponse> GetBulkOrphansAsync(Guid userId, BulkOrphansRequest request, CancellationToken ct = default)
    {
        var allPeople = await _db.People
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Relationships)
            .Include(p => p.RelatedRelationships)
            .ToListAsync(ct);

        HashSet<Guid> targetIds;
        if (request.SelectAll)
        {
            targetIds = allPeople.Select(p => p.Id).ToHashSet();
        }
        else
        {
            targetIds = (request.PersonIds ?? new List<Guid>()).ToHashSet();
        }

        var orphans = new List<PersonOrphanDto>();
        foreach (var p in allPeople)
        {
            if (targetIds.Contains(p.Id)) continue;
            if (p.RelationshipToUserId.HasValue) continue;

            var remainingConnections =
                p.Relationships.Count(r => r.DeletedAt == null && !targetIds.Contains(r.RelatedPersonId)) +
                p.RelatedRelationships.Count(r => r.DeletedAt == null && !targetIds.Contains(r.PersonId));

            if (remainingConnections == 0)
            {
                var hadConnectionToTarget =
                    p.Relationships.Any(r => r.DeletedAt == null && targetIds.Contains(r.RelatedPersonId)) ||
                    p.RelatedRelationships.Any(r => r.DeletedAt == null && targetIds.Contains(r.PersonId));

                if (hadConnectionToTarget)
                {
                    orphans.Add(new PersonOrphanDto
                    {
                        Id = p.Id,
                        FullName = FormatFullName(p.Name, p.Surname)
                    });
                }
            }
        }

        return new BulkOrphansResponse
        {
            Orphans = orphans,
            HasCardDavSync = false
        };
    }

    private static string FormatFullName(string name, string? surname)
    {
        if (string.IsNullOrEmpty(surname)) return name;
        return $"{name} {surname}".Trim();
    }

    // ─── Advanced: Search Index ───────────────────────────────────────────────────

    public async Task<List<PersonSearchIndexItemDto>> GetSearchIndexAsync(Guid userId, CancellationToken ct = default)
    {
        var people = await _db.People
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Emails)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.CustomFields)
            .Include(p => p.Groups).ThenInclude(pg => pg.Group)
            .Include(p => p.Vehicles.Where(v => v.DeletedAt == null))
            .Include(p => p.PhysicalMarks.Where(m => m.DeletedAt == null))
            .Include(p => p.CriminalRecords.Where(r => r.DeletedAt == null))
            .Include(p => p.BankAccounts.Where(b => b.DeletedAt == null))
            .Include(p => p.GangMemberships).ThenInclude(gm => gm.Gang)
            .Include(p => p.CustomFieldValues).ThenInclude(v => v.Template)
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

        return people.Select(p => new PersonSearchIndexItemDto
        {
            Id = p.Id,
            Name = p.Name,
            Surname = p.Surname,
            MiddleName = p.MiddleName,
            SecondLastName = p.SecondLastName,
            Nickname = p.Nickname,
            DisplayNameOverride = p.DisplayNameOverride,
            Organization = p.Organization,
            JobTitle = p.JobTitle,
            Notes = p.Notes,
            Photo = p.Photo,
            CitizenId = p.CitizenId,
            ModusOperandi = p.ModusOperandi,
            Vehicles = string.Join(", ", p.Vehicles.Select(v => $"{v.PlateNumber} {v.BrandModel} {v.Color}".Trim())),
            PhysicalMarks = string.Join(", ", p.PhysicalMarks.Select(m => $"{m.Type} {m.Location} {m.Description}".Trim())),
            CriminalRecords = string.Join(", ", p.CriminalRecords.Select(r => $"{r.Charge} {r.SentenceDetail}".Trim())),
            Gangs = string.Join(", ", p.GangMemberships.Where(gm => gm.Gang != null && gm.Gang.DeletedAt == null).Select(gm => $"{gm.Gang.Name} {gm.Gang.Turf}".Trim())),
            BankAccounts = string.Join(", ", p.BankAccounts.Select(b => $"{b.BankName} {b.AccountNumber} {b.AccountHolder}".Trim())),
            Phones = string.Join(" ", p.PhoneNumbers.Select(ph => ph.Number)),
            Emails = string.Join(" ", p.Emails.Select(e => e.Email)),
            Addresses = string.Join(" ", p.Addresses.Select(a => $"{a.StreetLine1} {a.StreetLine2} {a.Locality} {a.Region} {a.PostalCode} {a.Country}".Trim())),
            Urls = string.Join(" ", p.SocialProfiles.Where(s => !string.IsNullOrEmpty(s.Url)).Select(s => s.Url!)),
            ImHandles = string.Join(" ", p.SocialProfiles.Where(s => !string.IsNullOrEmpty(s.Username)).Select(s => s.Username!)),
            Groups = string.Join(" ", p.Groups.Where(pg => pg.Group != null && pg.Group.DeletedAt == null).Select(pg => pg.Group.Name)),
            CustomFields = string.Join(" ", p.CustomFields.Select(cf => $"{cf.Key} {cf.Value}").Concat(p.CustomFieldValues.Where(v => v.Template != null).Select(v => $"{v.Template.Name} {v.Value}")))
        }).ToList();
    }

    // ─── Advanced: Graph ──────────────────────────────────────────────────────────

    public async Task<PersonGraphResponse> GetPersonGraphAsync(
        Guid userId,
        Guid personId,
        bool hideUserNode,
        bool includeSolvedCases,
        bool includeRuledOut,
        CancellationToken ct = default)
    {
        var person = await _db.People
            .AsNoTracking()
            .Where(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null)
            .Include(p => p.Groups).ThenInclude(pg => pg.Group)
            .Include(p => p.Relationships).ThenInclude(r => r.RelatedPerson).ThenInclude(rp => rp.Groups).ThenInclude(rpg => rpg.Group)
            .Include(p => p.Relationships).ThenInclude(r => r.RelatedPerson).ThenInclude(rp => rp.Relationships)
            .Include(p => p.Relationships).ThenInclude(r => r.RelationshipType)
            .Include(p => p.RelatedRelationships).ThenInclude(r => r.Person).ThenInclude(rp => rp.Groups).ThenInclude(rpg => rpg.Group)
            .Include(p => p.RelatedRelationships).ThenInclude(r => r.RelationshipType)
            .FirstOrDefaultAsync(ct);

        if (person == null)
        {
            throw new NotFoundException("Person not found");
        }

        var nodes = new List<GraphNodeDto>();
        var edges = new List<GraphEdgeDto>();
        var nodeIds = new HashSet<string>();

        // Center node
        var centerNodeId = person.Id.ToString();
        nodes.Add(new GraphNodeDto
        {
            Id = centerNodeId,
            Label = FormatFullName(person.Name, person.Surname),
            Groups = person.Groups.Select(g => g.GroupId).ToList(),
            Colors = person.Groups.Select(g => g.Group?.Color ?? "#3B82F6").DefaultIfEmpty("#3B82F6").ToList(),
            IsCenter = true,
            Photo = person.Photo,
            NodeType = "person"
        });
        nodeIds.Add(centerNodeId);

        // User node
        var userNodeId = $"user-{userId}";
        if (!hideUserNode)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
            nodes.Add(new GraphNodeDto
            {
                Id = userNodeId,
                Label = user?.Name ?? "You",
                Colors = new List<string> { "#10B981" },
                IsCenter = false,
                Photo = user?.Photo,
                NodeType = "user"
            });
            nodeIds.Add(userNodeId);

            if (person.RelationshipToUserId.HasValue)
            {
                edges.Add(new GraphEdgeDto
                {
                    Source = userNodeId,
                    Target = centerNodeId,
                    Type = "Relationship",
                    Color = "#10B981",
                    SourceLabel = user?.Name ?? "You",
                    TargetLabel = person.Name
                });
            }
        }

        // Related people
        foreach (var rel in person.Relationships.Where(r => r.DeletedAt == null && r.RelatedPerson != null && r.RelatedPerson.DeletedAt == null))
        {
            var targetId = rel.RelatedPersonId.ToString();
            if (!nodeIds.Contains(targetId))
            {
                nodes.Add(new GraphNodeDto
                {
                    Id = targetId,
                    Label = FormatFullName(rel.RelatedPerson.Name, rel.RelatedPerson.Surname),
                    Groups = rel.RelatedPerson.Groups.Select(g => g.GroupId).ToList(),
                    Colors = rel.RelatedPerson.Groups.Select(g => g.Group?.Color ?? "#6B7280").DefaultIfEmpty("#6B7280").ToList(),
                    IsCenter = false,
                    Photo = rel.RelatedPerson.Photo,
                    NodeType = "person"
                });
                nodeIds.Add(targetId);
            }

            edges.Add(new GraphEdgeDto
            {
                Source = centerNodeId,
                Target = targetId,
                Type = rel.RelationshipType?.Label ?? "Relationship",
                Color = rel.RelationshipType?.Color ?? "#9CA3AF",
                SourceLabel = person.Name,
                TargetLabel = rel.RelatedPerson.Name
            });
        }

        foreach (var rel in person.RelatedRelationships.Where(r => r.DeletedAt == null && r.Person != null && r.Person.DeletedAt == null))
        {
            var sourceId = rel.PersonId.ToString();
            if (!nodeIds.Contains(sourceId))
            {
                nodes.Add(new GraphNodeDto
                {
                    Id = sourceId,
                    Label = FormatFullName(rel.Person.Name, rel.Person.Surname),
                    Groups = rel.Person.Groups.Select(g => g.GroupId).ToList(),
                    Colors = rel.Person.Groups.Select(g => g.Group?.Color ?? "#6B7280").DefaultIfEmpty("#6B7280").ToList(),
                    IsCenter = false,
                    Photo = rel.Person.Photo,
                    NodeType = "person"
                });
                nodeIds.Add(sourceId);
            }

            var edgeKeyExists = edges.Any(e => (e.Source == sourceId && e.Target == centerNodeId) || (e.Source == centerNodeId && e.Target == sourceId));
            if (!edgeKeyExists)
            {
                edges.Add(new GraphEdgeDto
                {
                    Source = sourceId,
                    Target = centerNodeId,
                    Type = rel.RelationshipType?.Label ?? "Relationship",
                    Color = rel.RelationshipType?.Color ?? "#9CA3AF",
                    SourceLabel = rel.Person.Name,
                    TargetLabel = person.Name
                });
            }
        }

        // Investigation events involving this person
        var personEvents = await _db.EventPersons
            .AsNoTracking()
            .Where(ep => ep.PersonId == personId && ep.DeletedAt == null)
            .Include(ep => ep.Event).ThenInclude(ev => ev.Groups).ThenInclude(eg => eg.Group)
            .Include(ep => ep.Event).ThenInclude(ev => ev.People).ThenInclude(pe => pe.Person)
            .ToListAsync(ct);

        foreach (var pe in personEvents)
        {
            var ev = pe.Event;
            if (ev == null || ev.DeletedAt == null) continue;
            if (!includeSolvedCases && (ev.Status == EventStatus.COMPLETED || ev.Status == EventStatus.CANCELLED)) continue;
            if (!includeRuledOut && pe.VerificationStatus == "RULED_OUT") continue;

            var eventNodeId = $"event-{ev.Id}";
            if (!nodeIds.Contains(eventNodeId))
            {
                nodes.Add(new GraphNodeDto
                {
                    Id = eventNodeId,
                    Label = $"📅 {ev.Title}",
                    Groups = ev.Groups.Select(g => g.GroupId).ToList(),
                    Colors = ev.Groups.Select(g => g.Group?.Color ?? "#F59E0B").DefaultIfEmpty("#F59E0B").ToList(),
                    IsCenter = false,
                    Photo = ev.Photo,
                    NodeType = "event",
                    EventStatus = ev.Status.ToString()
                });
                nodeIds.Add(eventNodeId);
            }

            edges.Add(new GraphEdgeDto
            {
                Source = centerNodeId,
                Target = eventNodeId,
                Type = string.IsNullOrEmpty(pe.Role) ? "Event" : pe.Role,
                Color = pe.VerificationStatus == "CONFIRMED" ? "#EF4444" : "#F59E0B",
                VerificationStatus = pe.VerificationStatus,
                InvolvementType = pe.InvolvementType,
                SourceLabel = person.Name,
                TargetLabel = ev.Title
            });
        }

        return new PersonGraphResponse
        {
            Nodes = nodes,
            Edges = edges
        };
    }

    private async Task EnsurePersonExistsAsync(Guid userId, Guid personId, CancellationToken ct)
    {
        var exists = await _db.People
            .AnyAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct);
        if (!exists)
        {
            throw new NotFoundException("Person not found");
        }
    }

    public async Task<string> UploadPersonPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken ct = default)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct)
            ?? throw new NotFoundException("Person not found");

        var filename = await _photoStorageService.SavePersonPhotoAsync(userId, personId, stream, ct);
        person.Photo = filename;
        await _db.SaveChangesAsync(ct);
        return filename;
    }

    public async Task DeletePersonPhotoAsync(Guid userId, Guid personId, CancellationToken ct = default)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct)
            ?? throw new NotFoundException("Person not found");

        await _photoStorageService.DeletePersonPhotoAsync(userId, personId, ct);
        person.Photo = null;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<(string photoUrl, string filename)> UploadPhysicalMarkPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken ct = default)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct)
            ?? throw new NotFoundException("Person not found");

        var filename = await _photoStorageService.SaveMarkPhotoAsync(userId, personId, stream, ct);
        var photoUrl = $"/api/photos/marks/{filename}";
        return (photoUrl, filename);
    }
}

