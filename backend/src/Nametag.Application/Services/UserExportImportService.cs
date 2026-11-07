using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.User;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public class UserExportImportService : IUserExportImportService
{
    private readonly IAppDbContext _context;

    public UserExportImportService(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<UserExportDataDto> ExportUserDataAsync(Guid userId, string? groupIdsParam, CancellationToken ct = default)
    {
        var filterByGroups = (groupIdsParam ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToHashSet();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        var peopleQuery = _context.People
            .Include(p => p.RelationshipToUser)
            .Include(p => p.Groups).ThenInclude(pg => pg.Group)
            .Include(p => p.Relationships).ThenInclude(r => r.RelatedPerson)
            .Include(p => p.Relationships).ThenInclude(r => r.RelationshipType)
            .Include(p => p.ImportantDates)
            .Include(p => p.PhoneNumbers)
            .Include(p => p.Emails)
            .Include(p => p.Addresses)
            .Include(p => p.SocialProfiles)
            .Include(p => p.Locations)
            .Include(p => p.CustomFields)
            .Include(p => p.CustomFieldValues).ThenInclude(cfv => cfv.Template)
            .Where(p => p.UserId == userId && p.DeletedAt == null);

        if (filterByGroups.Count > 0)
        {
            peopleQuery = peopleQuery.Where(p => p.Groups.Any(g => filterByGroups.Contains(g.GroupId)));
        }

        var allPeople = await peopleQuery.ToListAsync(ct);
        var allGroups = await _context.Groups
            .Where(g => g.UserId == userId && g.DeletedAt == null)
            .ToListAsync(ct);

        var relationshipTypes = await _context.RelationshipTypes
            .Where(rt => rt.UserId == userId && rt.DeletedAt == null)
            .ToListAsync(ct);

        var journalEntries = await _context.JournalEntries
            .Include(je => je.People).ThenInclude(jep => jep.Person)
            .Where(je => je.UserId == userId && je.DeletedAt == null)
            .OrderByDescending(je => je.Date)
            .ToListAsync(ct);

        var customFieldTemplates = await _context.CustomFieldTemplates
            .Where(t => t.UserId == userId && t.DeletedAt == null)
            .OrderBy(t => t.Order)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);

        var exportedPersonIds = allPeople.Select(p => p.Id).ToHashSet();
        var exportedGroupIds = filterByGroups.Count > 0
            ? filterByGroups
            : allPeople.SelectMany(p => p.Groups.Select(g => g.GroupId)).ToHashSet();

        var groups = allGroups.Where(g => exportedGroupIds.Contains(g.Id)).ToList();

        var exportedPeople = allPeople.Select(p =>
        {
            var pGroups = p.Groups.Where(g => exportedGroupIds.Contains(g.GroupId)).Select(g => g.Group.Name).ToList();
            var pRelationships = p.Relationships
                .Where(r => r.DeletedAt == null && exportedPersonIds.Contains(r.RelatedPersonId))
                .Select(r => new ExportPersonRelationshipDto
                {
                    RelatedPersonId = r.RelatedPersonId,
                    RelatedPersonName = NameUtils.FormatFullName(r.RelatedPerson),
                    RelationshipType = r.RelationshipType != null ? new ExportRelationshipTypeDto
                    {
                        Name = r.RelationshipType.Name,
                        Label = r.RelationshipType.Label
                    } : null,
                    Notes = r.Notes
                }).ToList();

            return new ExportPersonDto
            {
                Id = p.Id,
                Name = p.Name,
                MiddleName = p.MiddleName,
                SecondLastName = p.SecondLastName,
                Surname = p.Surname,
                Nickname = p.Nickname,
                DisplayNameOverride = p.DisplayNameOverride,
                Prefix = p.Prefix,
                Suffix = p.Suffix,
                Organization = p.Organization,
                JobTitle = p.JobTitle,
                Photo = p.Photo,
                Gender = p.Gender,
                Anniversary = p.Anniversary,
                LastContact = p.LastContact,
                Notes = p.Notes,
                ContactReminderEnabled = p.ContactReminderEnabled,
                ContactReminderInterval = p.ContactReminderInterval,
                ContactReminderIntervalUnit = p.ContactReminderIntervalUnit?.ToString(),
                ImportantDates = p.ImportantDates.Where(d => d.DeletedAt == null).Select(d => new ExportImportantDateDto
                {
                    Title = d.Title,
                    Date = d.Date
                }).ToList(),
                PhoneNumbers = p.PhoneNumbers.Select(ph => new ExportContactFieldDto { Type = ph.Type, Number = ph.Number }).ToList(),
                Emails = p.Emails.Select(e => new ExportContactFieldDto { Type = e.Type, Email = e.Email }).ToList(),
                Addresses = p.Addresses.Select(a => new ExportAddressDto
                {
                    Type = a.Type,
                    StreetLine1 = a.StreetLine1,
                    StreetLine2 = a.StreetLine2,
                    Locality = a.Locality,
                    Region = a.Region,
                    PostalCode = a.PostalCode,
                    Country = a.Country
                }).ToList(),
                Urls = p.SocialProfiles.Where(s => s.Type == "url" && !string.IsNullOrEmpty(s.Url)).Select(s => new ExportContactFieldDto { Type = s.Type, Url = s.Url }).ToList(),
                ImHandles = p.SocialProfiles.Where(s => s.Type != "url").Select(s => new ExportContactFieldDto { Protocol = s.Network ?? s.Type, Handle = s.Username }).ToList(),
                Locations = p.Locations.Select(l => new ExportLocationDto
                {
                    Type = l.Type,
                    Latitude = l.Latitude,
                    Longitude = l.Longitude,
                    Label = l.Label
                }).ToList(),
                CustomFields = p.CustomFields.Select(cf => new ExportCustomFieldDto { Key = cf.Key, Value = cf.Value, Type = cf.Type }).ToList(),
                CustomFieldValues = p.CustomFieldValues.Where(cfv => cfv.Template.DeletedAt == null).Select(cfv => new ExportCustomFieldValueDto
                {
                    Slug = cfv.Template.Slug,
                    Value = cfv.Value
                }).ToList(),
                RelationshipToUser = p.RelationshipToUser != null ? new ExportRelationshipTypeDto
                {
                    Name = p.RelationshipToUser.Name,
                    Label = p.RelationshipToUser.Label
                } : null,
                Groups = pGroups,
                Relationships = pRelationships
            };
        }).ToList();

        return new UserExportDataDto
        {
            Version = "1.2",
            ExportDate = DateTime.UtcNow.ToString("o"),
            User = new ExportUserInfoDto
            {
                Email = user?.Email,
                Name = user?.Name,
                Theme = user?.Theme.ToString(),
                DateFormat = user?.DateFormat.ToString(),
                AccountCreated = user?.CreatedAt
            },
            Groups = groups.Select(g => new ExportGroupDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                Color = g.Color
            }).ToList(),
            People = exportedPeople,
            RelationshipTypes = relationshipTypes.Select(rt => new FullRelationshipTypeExportDto
            {
                Id = rt.Id,
                Name = rt.Name,
                Label = rt.Label,
                Color = rt.Color,
                InverseId = rt.InverseId
            }).ToList(),
            JournalEntries = journalEntries.Select(je => new ExportJournalEntryDto
            {
                Id = je.Id,
                Title = je.Title,
                Date = je.Date.ToString("o"),
                Body = je.Body,
                People = je.People.Select(jep => NameUtils.FormatCanonicalName(jep.Person)).ToList(),
                PeopleIds = je.People.Select(jep => jep.PersonId).ToList()
            }).ToList(),
            CustomFieldTemplates = customFieldTemplates.Select(t => new ExportCustomFieldTemplateDto
            {
                Name = t.Name,
                Slug = t.Slug,
                Type = t.Type.ToString(),
                Options = t.Options,
                Order = t.Order
            }).ToList()
        };
    }

    public async Task<ImportValidateResponseDto> ValidateImportDataAsync(Guid userId, ImportDataRequest request, CancellationToken ct = default)
    {
        var existingPeople = await _context.People
            .Where(p => p.UserId == userId && p.DeletedAt == null)
            .Select(p => new { p.Name, p.Surname })
            .ToListAsync(ct);

        var newPeopleCount = 0;
        foreach (var p in request.People)
        {
            var exists = existingPeople.Any(ep =>
                string.Equals(ep.Name, p.Name, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(ep.Surname ?? "", p.Surname ?? "", StringComparison.OrdinalIgnoreCase));

            if (!exists) newPeopleCount++;
        }

        var existingGroups = await _context.Groups
            .Where(g => g.UserId == userId && g.DeletedAt == null)
            .Select(g => g.Name)
            .ToListAsync(ct);

        var newGroupsCount = 0;
        foreach (var g in request.Groups)
        {
            var exists = existingGroups.Any(eg => string.Equals(eg, g.Name, StringComparison.OrdinalIgnoreCase));
            if (!exists) newGroupsCount++;
        }

        var currentPeople = await _context.People.CountAsync(p => p.UserId == userId && p.DeletedAt == null, ct);
        var currentGroups = await _context.Groups.CountAsync(g => g.UserId == userId && g.DeletedAt == null, ct);

        return new ImportValidateResponseDto
        {
            Valid = true,
            NewPeopleCount = newPeopleCount,
            NewGroupsCount = newGroupsCount,
            JournalEntries = request.JournalEntries?.Count ?? 0,
            CurrentPeople = currentPeople,
            CurrentGroups = currentGroups
        };
    }

    public async Task<ImportResponseDto> ImportUserDataAsync(Guid userId, ImportDataRequest request, CancellationToken ct = default)
    {
        var filteredData = request;

        if (request.GroupIds != null && request.GroupIds.Count > 0)
        {
            var selectedGroups = request.Groups.Where(g => request.GroupIds.Contains(g.Id)).ToList();
            var selectedGroupNames = selectedGroups.Select(g => g.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var filteredPeople = request.People
                .Where(p => p.Groups.Any(gn => selectedGroupNames.Contains(gn)))
                .ToList();

            var filteredPeopleIds = filteredPeople.Select(p => p.Id).ToHashSet();

            var peopleWithFilteredRels = filteredPeople.Select(p => new ExportPersonDto
            {
                Id = p.Id,
                Name = p.Name,
                MiddleName = p.MiddleName,
                SecondLastName = p.SecondLastName,
                Surname = p.Surname,
                Nickname = p.Nickname,
                DisplayNameOverride = p.DisplayNameOverride,
                Prefix = p.Prefix,
                Suffix = p.Suffix,
                Organization = p.Organization,
                JobTitle = p.JobTitle,
                Photo = p.Photo,
                Gender = p.Gender,
                Anniversary = p.Anniversary,
                LastContact = p.LastContact,
                Notes = p.Notes,
                ContactReminderEnabled = p.ContactReminderEnabled,
                ContactReminderInterval = p.ContactReminderInterval,
                ContactReminderIntervalUnit = p.ContactReminderIntervalUnit,
                ImportantDates = p.ImportantDates,
                PhoneNumbers = p.PhoneNumbers,
                Emails = p.Emails,
                Addresses = p.Addresses,
                Urls = p.Urls,
                ImHandles = p.ImHandles,
                Locations = p.Locations,
                CustomFields = p.CustomFields,
                CustomFieldValues = p.CustomFieldValues,
                RelationshipToUser = p.RelationshipToUser,
                Groups = p.Groups,
                Relationships = p.Relationships.Where(r => filteredPeopleIds.Contains(r.RelatedPersonId)).ToList()
            }).ToList();

            filteredData = new ImportDataRequest
            {
                Groups = selectedGroups,
                People = peopleWithFilteredRels,
                RelationshipTypes = request.RelationshipTypes,
                CustomRelationshipTypes = request.CustomRelationshipTypes,
                CustomFieldTemplates = request.CustomFieldTemplates,
                JournalEntries = request.JournalEntries
            };
        }

        var groupIdMap = new Dictionary<Guid, Guid>();
        var personIdMap = new Dictionary<Guid, Guid>();
        var relationshipTypeIdMap = new Dictionary<Guid, Guid>();
        var slugToTemplate = new Dictionary<string, CustomFieldTemplate>(StringComparer.OrdinalIgnoreCase);

        // 1. Import relationship types
        var importRelationshipTypes = filteredData.RelationshipTypes ?? filteredData.CustomRelationshipTypes ?? new();
        foreach (var relType in importRelationshipTypes)
        {
            var existing = await _context.RelationshipTypes
                .FirstOrDefaultAsync(rt => rt.UserId == userId && rt.DeletedAt == null && rt.Name.ToLower() == relType.Name.ToLower(), ct);

            if (existing != null)
            {
                relationshipTypeIdMap[relType.Id] = existing.Id;
            }
            else
            {
                var newRt = new RelationshipType
                {
                    UserId = userId,
                    Name = relType.Name,
                    Label = relType.Label,
                    Color = relType.Color
                };
                _context.RelationshipTypes.Add(newRt);
                await _context.SaveChangesAsync(ct);
                relationshipTypeIdMap[relType.Id] = newRt.Id;
            }
        }

        // Link inverses
        foreach (var relType in importRelationshipTypes)
        {
            if (relType.InverseId.HasValue &&
                relationshipTypeIdMap.TryGetValue(relType.Id, out var newId) &&
                relationshipTypeIdMap.TryGetValue(relType.InverseId.Value, out var newInverseId))
            {
                var rtEntity = await _context.RelationshipTypes.FirstOrDefaultAsync(rt => rt.Id == newId, ct);
                if (rtEntity != null)
                {
                    rtEntity.InverseId = newInverseId;
                }
            }
        }
        await _context.SaveChangesAsync(ct);

        // 2. Import custom field templates
        foreach (var tpl in filteredData.CustomFieldTemplates ?? new())
        {
            var existing = await _context.CustomFieldTemplates
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Slug.ToLower() == tpl.Slug.ToLower() && t.DeletedAt == null, ct);

            if (existing != null)
            {
                slugToTemplate[tpl.Slug] = existing;
            }
            else
            {
                Enum.TryParse<CustomFieldType>(tpl.Type, true, out var cft);
                var newTpl = new CustomFieldTemplate
                {
                    UserId = userId,
                    Name = tpl.Name,
                    Slug = tpl.Slug,
                    Type = cft,
                    Options = tpl.Options ?? new(),
                    Order = tpl.Order
                };
                _context.CustomFieldTemplates.Add(newTpl);
                await _context.SaveChangesAsync(ct);
                slugToTemplate[tpl.Slug] = newTpl;
            }
        }

        // 3. Import groups
        foreach (var group in filteredData.Groups)
        {
            var existing = await _context.Groups
                .FirstOrDefaultAsync(g => g.UserId == userId && g.DeletedAt == null && g.Name.ToLower() == group.Name.ToLower(), ct);

            if (existing != null)
            {
                groupIdMap[group.Id] = existing.Id;
            }
            else
            {
                var newGroup = new Group
                {
                    UserId = userId,
                    Name = group.Name,
                    Description = group.Description,
                    Color = group.Color
                };
                _context.Groups.Add(newGroup);
                await _context.SaveChangesAsync(ct);
                groupIdMap[group.Id] = newGroup.Id;
            }
        }

        // 4. Import people
        foreach (var p in filteredData.People)
        {
            var existing = await _context.People
                .FirstOrDefaultAsync(ep => ep.UserId == userId && ep.DeletedAt == null &&
                    ep.Name.ToLower() == p.Name.ToLower() &&
                    ((ep.Surname == null && p.Surname == null) || (ep.Surname != null && p.Surname != null && ep.Surname.ToLower() == p.Surname.ToLower())), ct);

            Guid personId;
            bool isNew = false;

            if (existing != null)
            {
                personId = existing.Id;
                personIdMap[p.Id] = existing.Id;
            }
            else
            {
                isNew = true;
                Guid? relToUserId = null;
                if (p.RelationshipToUser != null)
                {
                    var rt = await _context.RelationshipTypes
                        .FirstOrDefaultAsync(r => r.UserId == userId && r.DeletedAt == null && r.Name.ToLower() == p.RelationshipToUser.Name.ToLower(), ct);
                    relToUserId = rt?.Id;
                }

                Enum.TryParse<ReminderIntervalUnit>(p.ContactReminderIntervalUnit, true, out var intervalUnit);

                var newPerson = new Person
                {
                    UserId = userId,
                    Name = p.Name,
                    Surname = p.Surname,
                    MiddleName = p.MiddleName,
                    SecondLastName = p.SecondLastName,
                    Nickname = p.Nickname,
                    DisplayNameOverride = p.DisplayNameOverride,
                    Prefix = p.Prefix,
                    Suffix = p.Suffix,
                    Organization = p.Organization,
                    JobTitle = p.JobTitle,
                    Photo = p.Photo,
                    Gender = p.Gender,
                    Anniversary = p.Anniversary,
                    LastContact = p.LastContact,
                    Notes = p.Notes,
                    ContactReminderEnabled = p.ContactReminderEnabled,
                    ContactReminderInterval = p.ContactReminderInterval,
                    ContactReminderIntervalUnit = p.ContactReminderInterval.HasValue ? intervalUnit : null,
                    RelationshipToUserId = relToUserId
                };

                _context.People.Add(newPerson);
                await _context.SaveChangesAsync(ct);

                personId = newPerson.Id;
                personIdMap[p.Id] = newPerson.Id;
            }

            // Assign groups
            foreach (var groupName in p.Groups)
            {
                var oldGroup = filteredData.Groups.FirstOrDefault(g => string.Equals(g.Name, groupName, StringComparison.OrdinalIgnoreCase));
                if (oldGroup != null && groupIdMap.TryGetValue(oldGroup.Id, out var newGId))
                {
                    var existsPg = await _context.PersonGroups.AnyAsync(pg => pg.PersonId == personId && pg.GroupId == newGId, ct);
                    if (!existsPg)
                    {
                        _context.PersonGroups.Add(new PersonGroup { PersonId = personId, GroupId = newGId });
                    }
                }
            }

            // Sub-resources for new people
            if (isNew)
            {
                foreach (var ph in p.PhoneNumbers)
                {
                    if (!string.IsNullOrEmpty(ph.Number))
                        _context.PersonPhones.Add(new PersonPhone { PersonId = personId, Type = ph.Type, Number = ph.Number });
                }

                foreach (var em in p.Emails)
                {
                    if (!string.IsNullOrEmpty(em.Email))
                        _context.PersonEmails.Add(new PersonEmail { PersonId = personId, Type = em.Type, Email = em.Email });
                }

                foreach (var ad in p.Addresses)
                {
                    _context.PersonAddresses.Add(new PersonAddress
                    {
                        PersonId = personId,
                        Type = ad.Type,
                        StreetLine1 = ad.StreetLine1,
                        StreetLine2 = ad.StreetLine2,
                        Locality = ad.Locality,
                        Region = ad.Region,
                        PostalCode = ad.PostalCode,
                        Country = ad.Country
                    });
                }

                foreach (var loc in p.Locations)
                {
                    _context.PersonLocations.Add(new PersonLocation
                    {
                        PersonId = personId,
                        Type = loc.Type,
                        Latitude = loc.Latitude,
                        Longitude = loc.Longitude,
                        Label = loc.Label
                    });
                }

                foreach (var d in p.ImportantDates)
                {
                    _context.ImportantDates.Add(new ImportantDate
                    {
                        UserId = userId,
                        PersonId = personId,
                        Title = d.Title,
                        Date = d.Date
                    });
                }

                foreach (var cf in p.CustomFields)
                {
                    _context.PersonCustomFields.Add(new PersonCustomField
                    {
                        PersonId = personId,
                        Key = cf.Key,
                        Value = cf.Value,
                        Type = cf.Type ?? "text"
                    });
                }
            }
        }
        await _context.SaveChangesAsync(ct);

        // 5. Import relationships
        foreach (var p in filteredData.People)
        {
            if (!personIdMap.TryGetValue(p.Id, out var newPersonId)) continue;

            foreach (var r in p.Relationships)
            {
                if (!personIdMap.TryGetValue(r.RelatedPersonId, out var newRelatedId)) continue;

                Guid? relTypeId = null;
                if (r.RelationshipType != null)
                {
                    var rt = await _context.RelationshipTypes
                        .FirstOrDefaultAsync(rt => rt.UserId == userId && rt.DeletedAt == null && rt.Name.ToLower() == r.RelationshipType.Name.ToLower(), ct);
                    relTypeId = rt?.Id;
                }

                var exists = await _context.Relationships
                    .AnyAsync(rel => rel.PersonId == newPersonId && rel.RelatedPersonId == newRelatedId && rel.RelationshipTypeId == relTypeId && rel.DeletedAt == null, ct);

                if (!exists)
                {
                    _context.Relationships.Add(new Relationship
                    {
                        PersonId = newPersonId,
                        RelatedPersonId = newRelatedId,
                        RelationshipTypeId = relTypeId,
                        Notes = r.Notes
                    });
                }
            }
        }
        await _context.SaveChangesAsync(ct);

        // 6. Import custom field values
        foreach (var p in filteredData.People)
        {
            if (!personIdMap.TryGetValue(p.Id, out var newPersonId)) continue;

            foreach (var cfv in p.CustomFieldValues)
            {
                if (slugToTemplate.TryGetValue(cfv.Slug, out var template))
                {
                    var existingVal = await _context.PersonCustomFieldValues
                        .FirstOrDefaultAsync(v => v.PersonId == newPersonId && v.TemplateId == template.Id, ct);

                    if (existingVal != null)
                    {
                        existingVal.Value = cfv.Value;
                    }
                    else
                    {
                        _context.PersonCustomFieldValues.Add(new PersonCustomFieldValue
                        {
                            PersonId = newPersonId,
                            TemplateId = template.Id,
                            Value = cfv.Value
                        });
                    }
                }
            }
        }
        await _context.SaveChangesAsync(ct);

        // 7. Import journal entries
        int journalEntriesImported = 0;
        if (filteredData.JournalEntries != null && filteredData.JournalEntries.Count > 0)
        {
            var allPeople = await _context.People
                .Where(p => p.UserId == userId && p.DeletedAt == null)
                .ToListAsync(ct);

            var validPersonIds = allPeople.Select(p => p.Id).ToHashSet();
            var nameToId = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in allPeople)
            {
                nameToId[NameUtils.FormatCanonicalName(p)] = p.Id;
            }

            foreach (var entry in filteredData.JournalEntries)
            {
                if (!DateTime.TryParse(entry.Date, out var entryDate))
                {
                    entryDate = DateTime.UtcNow;
                }

                var exists = await _context.JournalEntries
                    .AnyAsync(je => je.UserId == userId && je.Title == entry.Title && je.Date == entryDate && je.DeletedAt == null, ct);

                if (exists) continue;

                var resolvedPersonIds = new List<Guid>();
                if (entry.PeopleIds != null && entry.PeopleIds.Count > 0)
                {
                    foreach (var oldId in entry.PeopleIds)
                    {
                        if (personIdMap.TryGetValue(oldId, out var newId))
                        {
                            resolvedPersonIds.Add(newId);
                        }
                        else if (validPersonIds.Contains(oldId))
                        {
                            resolvedPersonIds.Add(oldId);
                        }
                    }
                }
                else if (entry.People != null)
                {
                    foreach (var name in entry.People)
                    {
                        if (nameToId.TryGetValue(name, out var id))
                        {
                            resolvedPersonIds.Add(id);
                        }
                    }
                }

                var jeEntity = new JournalEntry
                {
                    UserId = userId,
                    Title = entry.Title,
                    Date = entryDate,
                    Body = entry.Body
                };

                _context.JournalEntries.Add(jeEntity);
                await _context.SaveChangesAsync(ct);

                foreach (var pid in resolvedPersonIds.Distinct())
                {
                    _context.JournalEntryPeople.Add(new JournalEntryPerson
                    {
                        JournalEntryId = jeEntity.Id,
                        PersonId = pid
                    });
                }
                await _context.SaveChangesAsync(ct);

                journalEntriesImported++;
            }
        }

        return new ImportResponseDto
        {
            Success = true,
            Imported = new ImportCountsDto
            {
                Groups = groupIdMap.Count,
                People = personIdMap.Count,
                RelationshipTypes = relationshipTypeIdMap.Count,
                JournalEntries = journalEntriesImported,
                CustomFieldTemplates = slugToTemplate.Count
            }
        };
    }
}

