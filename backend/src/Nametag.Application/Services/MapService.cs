using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Dashboard;
using Nametag.Application.DTOs.Map;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public class MapService : IMapService
{
    private readonly IAppDbContext _context;

    public MapService(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<MapMarkersResponseDto> GetMarkersAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        var nameOrder = user?.NameOrder ?? NameOrder.WESTERN;
        var nameDisplayFormat = user?.NameDisplayFormat ?? NameDisplayFormat.FULL;
        var geocodingEnabled = user?.GeocodingEnabled ?? true;

        var people = await _context.People
            .Include(p => p.Groups).ThenInclude(pg => pg.Group)
            .Include(p => p.Addresses)
            .Include(p => p.Locations)
            .Include(p => p.CriminalRecords)
            .Include(p => p.GangMemberships).ThenInclude(gm => gm.Gang)
            .Include(p => p.Vehicles)
            .Include(p => p.PhysicalMarks)
            .Include(p => p.BankAccounts)
            .Where(p => p.UserId == userId && p.DeletedAt == null)
            .ToListAsync(ct);

        var pendingCount = await _context.PersonAddresses
            .CountAsync(a => a.Person.UserId == userId && a.Person.DeletedAt == null && (a.GeocodeStatus == null || a.GeocodeStatus == "pending"), ct);

        var failedCount = await _context.PersonAddresses
            .CountAsync(a => a.Person.UserId == userId && a.Person.DeletedAt == null && a.GeocodeStatus == "failed", ct);

        var allGangs = await _context.Gangs
            .Where(g => g.UserId == userId && g.DeletedAt == null)
            .OrderBy(g => g.Name)
            .Select(g => new MapGangDto { Id = g.Id, Name = g.Name, Color = g.Color })
            .ToListAsync(ct);

        var groupsById = new Dictionary<Guid, MapGroupDto>();
        var markers = new List<MapMarkerDto>();
        var unlocatedPeople = new List<UnlocatedPersonDto>();
        var locatedPersonIds = new HashSet<Guid>();

        var personSummaryList = new List<(Guid PersonId, string PersonName, List<string> GroupIds, string? GroupColor)>();

        foreach (var person in people)
        {
            var personName = NameUtils.FormatGraphName(person, nameOrder, nameDisplayFormat);
            var activeGroups = person.Groups.Where(g => g.Group.DeletedAt == null).ToList();
            var groupIds = activeGroups.Select(g => g.GroupId.ToString()).ToList();

            foreach (var ag in activeGroups)
            {
                groupsById[ag.GroupId] = new MapGroupDto { Id = ag.Group.Id, Name = ag.Group.Name, Color = ag.Group.Color };
            }

            var groupColor = activeGroups.FirstOrDefault(g => !string.IsNullOrEmpty(g.Group.Color))?.Group.Color;
            var hasPhoto = !string.IsNullOrEmpty(person.Photo);

            personSummaryList.Add((person.Id, personName, groupIds, groupColor));

            var personFailed = person.Addresses.Count(a => a.GeocodeStatus == "failed");
            if (personFailed > 0)
            {
                unlocatedPeople.Add(new UnlocatedPersonDto
                {
                    PersonId = person.Id,
                    PersonName = personName,
                    FailedCount = personFailed
                });
            }

            foreach (var addr in person.Addresses)
            {
                if (addr.GeocodeStatus != "success" || !addr.Latitude.HasValue || !addr.Longitude.HasValue)
                {
                    continue;
                }

                locatedPersonIds.Add(person.Id);

                var parts = new[] { addr.StreetLine1, addr.StreetLine2, addr.Locality, addr.Region, addr.PostalCode, addr.Country }
                    .Where(p => !string.IsNullOrWhiteSpace(p));
                var addrText = string.Join(", ", parts);

                markers.Add(new MapMarkerDto
                {
                    Id = $"addr_{addr.Id}",
                    Source = "address",
                    PersonId = person.Id.ToString(),
                    PersonName = personName,
                    Latitude = addr.Latitude.Value,
                    Longitude = addr.Longitude.Value,
                    Label = addr.Type,
                    City = addr.Locality,
                    Region = addr.Region,
                    Country = addr.Country,
                    AddressText = !string.IsNullOrEmpty(addrText) ? addrText : null,
                    GroupIds = groupIds,
                    HasPhoto = hasPhoto,
                    GroupColor = groupColor,
                    ManagementLevel = person.ManagementLevel,
                    ThreatLevel = person.ThreatLevel,
                    ResidenceStatus = person.ResidenceStatus,
                    Gender = person.Gender,
                    HasCriminalRecord = person.CriminalRecords.Any(c => c.DeletedAt == null),
                    CriminalRecordCharges = person.CriminalRecords.Where(c => c.DeletedAt == null).Select(c => c.Charge).ToList(),
                    HasActiveConviction = person.CriminalRecords.Any(c => c.DeletedAt == null && c.RecordType == "CONVICTION" && !c.IsPardoned),
                    GangIds = person.GangMemberships.Select(g => g.GangId.ToString()).ToList(),
                    GangRoles = person.GangMemberships.Select(g => g.Role).ToList(),
                    HasSuspiciousVehicle = person.Vehicles.Any(v => v.DeletedAt == null && v.IsSuspicious),
                    VehicleTypes = person.Vehicles.Where(v => v.DeletedAt == null).Select(v => v.VehicleType).ToList(),
                    MarkTypes = person.PhysicalMarks.Where(m => m.DeletedAt == null).Select(m => m.Type).ToList(),
                    HasMuleAccount = person.BankAccounts.Any(b => b.DeletedAt == null && (b.AccountType == "MULE" || b.AccountType == "SUSPICIOUS"))
                });
            }

            foreach (var loc in person.Locations)
            {
                if (!loc.Latitude.HasValue || !loc.Longitude.HasValue) continue;

                locatedPersonIds.Add(person.Id);

                markers.Add(new MapMarkerDto
                {
                    Id = $"loc_{loc.Id}",
                    Source = "location",
                    PersonId = person.Id.ToString(),
                    PersonName = personName,
                    Latitude = loc.Latitude.Value,
                    Longitude = loc.Longitude.Value,
                    Label = !string.IsNullOrEmpty(loc.Label) ? loc.Label : loc.Type,
                    GroupIds = groupIds,
                    HasPhoto = hasPhoto,
                    GroupColor = groupColor,
                    ManagementLevel = person.ManagementLevel,
                    ThreatLevel = person.ThreatLevel,
                    ResidenceStatus = person.ResidenceStatus,
                    Gender = person.Gender,
                    HasCriminalRecord = person.CriminalRecords.Any(c => c.DeletedAt == null),
                    CriminalRecordCharges = person.CriminalRecords.Where(c => c.DeletedAt == null).Select(c => c.Charge).ToList(),
                    HasActiveConviction = person.CriminalRecords.Any(c => c.DeletedAt == null && c.RecordType == "CONVICTION" && !c.IsPardoned),
                    GangIds = person.GangMemberships.Select(g => g.GangId.ToString()).ToList(),
                    GangRoles = person.GangMemberships.Select(g => g.Role).ToList(),
                    HasSuspiciousVehicle = person.Vehicles.Any(v => v.DeletedAt == null && v.IsSuspicious),
                    VehicleTypes = person.Vehicles.Where(v => v.DeletedAt == null).Select(v => v.VehicleType).ToList(),
                    MarkTypes = person.PhysicalMarks.Where(m => m.DeletedAt == null).Select(m => m.Type).ToList(),
                    HasMuleAccount = person.BankAccounts.Any(b => b.DeletedAt == null && (b.AccountType == "MULE" || b.AccountType == "SUSPICIOUS"))
                });
            }
        }

        var cases = new List<MapCaseDto>();
        var unmappedSubjects = new List<UnmappedSubjectDto>();

        var events = await _context.Events
            .Include(e => e.Addresses)
            .Include(e => e.People)
            .Include(e => e.Groups).ThenInclude(eg => eg.Group)
            .Where(e => e.UserId == userId && e.DeletedAt == null)
            .ToListAsync(ct);

        var caseLinksByPersonId = new Dictionary<Guid, List<CaseLinkDto>>();

        foreach (var ev in events)
        {
            foreach (var pe in ev.People.Where(p => p.DeletedAt == null))
            {
                if (!caseLinksByPersonId.TryGetValue(pe.PersonId, out var existing))
                {
                    existing = new List<CaseLinkDto>();
                    caseLinksByPersonId[pe.PersonId] = existing;
                }

                existing.Add(new CaseLinkDto
                {
                    EventId = ev.Id,
                    EventTitle = ev.Title,
                    EventStatus = ev.Status.ToString(),
                    Role = pe.Role,
                    InvolvementType = pe.InvolvementType,
                    VerificationStatus = pe.VerificationStatus,
                    Confidence = pe.Confidence
                });
            }

            var activeEvGroups = ev.Groups.Where(g => g.Group.DeletedAt == null).ToList();
            var evGroupIds = activeEvGroups.Select(g => g.GroupId.ToString()).ToList();
            foreach (var eg in activeEvGroups)
            {
                groupsById[eg.GroupId] = new MapGroupDto { Id = eg.Group.Id, Name = eg.Group.Name, Color = eg.Group.Color };
            }

            var evGroupColor = activeEvGroups.FirstOrDefault(g => !string.IsNullOrEmpty(g.Group.Color))?.Group.Color ?? "#ef4444";

            double? firstLat = null;
            double? firstLng = null;

            foreach (var ea in ev.Addresses)
            {
                if (ea.GeocodeStatus != "success" || !ea.Latitude.HasValue || !ea.Longitude.HasValue)
                {
                    continue;
                }

                var lat = (double)ea.Latitude.Value;
                var lng = (double)ea.Longitude.Value;

                firstLat ??= lat;
                firstLng ??= lng;

                var parts = new[] { ea.StreetLine1, ea.StreetLine2, ea.Locality, ea.Region, ea.PostalCode, ea.Country }
                    .Where(p => !string.IsNullOrWhiteSpace(p));
                var addrText = string.Join(", ", parts);

                markers.Add(new MapMarkerDto
                {
                    Id = $"evaddr_{ea.Id}",
                    Source = "event_address",
                    PersonId = ev.Id.ToString(),
                    PersonName = $"🚨 {ev.Title}",
                    Latitude = lat,
                    Longitude = lng,
                    Label = ea.Type ?? "crime scene",
                    City = ea.Locality,
                    Region = ea.Region,
                    Country = ea.Country,
                    AddressText = !string.IsNullOrEmpty(addrText) ? addrText : null,
                    GroupIds = evGroupIds,
                    HasPhoto = false,
                    GroupColor = evGroupColor,
                    MarkerType = "crime_scene",
                    EventStatus = ev.Status.ToString()
                });
            }

            cases.Add(new MapCaseDto
            {
                Id = ev.Id,
                Title = ev.Title,
                Status = ev.Status.ToString(),
                Latitude = firstLat,
                Longitude = firstLng
            });
        }

        // Attach caseLinks to person markers
        foreach (var marker in markers)
        {
            if (marker.Source != "event_address" && Guid.TryParse(marker.PersonId, out var pId))
            {
                if (caseLinksByPersonId.TryGetValue(pId, out var links) && links.Count > 0)
                {
                    marker.CaseLinks = links;
                }
            }
        }

        // Unmapped subjects
        foreach (var summary in personSummaryList)
        {
            if (!locatedPersonIds.Contains(summary.PersonId))
            {
                caseLinksByPersonId.TryGetValue(summary.PersonId, out var links);
                unmappedSubjects.Add(new UnmappedSubjectDto
                {
                    PersonId = summary.PersonId,
                    PersonName = summary.PersonName,
                    GroupIds = summary.GroupIds,
                    GroupColor = summary.GroupColor,
                    CaseLinks = links != null && links.Count > 0 ? links : null
                });
            }
        }

        unmappedSubjects.Sort((a, b) => string.Compare(a.PersonName, b.PersonName, StringComparison.OrdinalIgnoreCase));
        unlocatedPeople.Sort((a, b) => string.Compare(a.PersonName, b.PersonName, StringComparison.OrdinalIgnoreCase));

        var groups = groupsById.Values.OrderBy(g => g.Name).ToList();

        return new MapMarkersResponseDto
        {
            Markers = markers,
            Groups = groups,
            Gangs = allGangs,
            Cases = cases.Count > 0 ? cases : null,
            UnmappedSubjects = unmappedSubjects.Count > 0 ? unmappedSubjects : null,
            PendingCount = pendingCount,
            FailedCount = failedCount,
            UnlocatedPeople = unlocatedPeople,
            GeocodingEnabled = geocodingEnabled
        };
    }

    public async Task<object> RetryGeocodeAsync(Guid userId, GeocodeRetryRequest request, CancellationToken ct = default)
    {
        var address = await _context.PersonAddresses
            .Include(a => a.Person)
            .FirstOrDefaultAsync(a => a.Id == request.AddressId && a.Person.UserId == userId && a.Person.DeletedAt == null, ct);

        if (address == null)
        {
            throw new NotFoundException("Address not found");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user?.GeocodingEnabled != true)
        {
            throw new BadRequestException("Geocoding is disabled in your settings");
        }

        address.GeocodeStatus = "pending";
        address.GeocodeHash = null;
        address.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        return new { outcome = new { status = "pending" } };
    }
}

