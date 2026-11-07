using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Dashboard;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IAppDbContext _context;

    public DashboardService(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDto> GetStatsAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        var nameOrder = user?.NameOrder ?? NameOrder.WESTERN;
        var nameDisplayFormat = user?.NameDisplayFormat ?? NameDisplayFormat.FULL;

        var today = DateTime.UtcNow.Date;

        var importantDates = await _context.ImportantDates
            .Include(d => d.Person)
            .Where(d => d.Person.UserId == userId && d.Person.DeletedAt == null && d.ReminderEnabled && d.DeletedAt == null)
            .ToListAsync(ct);

        var peopleWithContactReminders = await _context.People
            .Where(p => p.UserId == userId && p.DeletedAt == null && p.ContactReminderEnabled && p.LastContact != null)
            .ToListAsync(ct);

        var peopleCount = await _context.People
            .CountAsync(p => p.UserId == userId && p.DeletedAt == null, ct);

        var groupsCount = await _context.Groups
            .CountAsync(g => g.UserId == userId && g.DeletedAt == null, ct);

        var upcomingEvents = new List<UpcomingEventDto>();

        foreach (var impDate in importantDates)
        {
            var eventDate = GetNextImportantDateOccurrence(impDate.Date, today, impDate.ReminderInterval ?? 1, impDate.ReminderIntervalUnit?.ToString() ?? "YEARS", impDate.LastReminderSent);
            var daysUntil = (int)(eventDate - today).TotalDays;

            if (daysUntil >= 0 && daysUntil <= 30)
            {
                upcomingEvents.Add(new UpcomingEventDto
                {
                    Id = $"important-{impDate.Id}",
                    PersonId = impDate.PersonId,
                    PersonName = NameUtils.FormatGraphName(impDate.Person, nameOrder, nameDisplayFormat),
                    Type = "important_date",
                    Title = impDate.Title,
                    TitleKey = null,
                    Date = eventDate,
                    DaysUntil = daysUntil,
                    IsYearUnknown = impDate.Date.Year <= 1000,
                    PersonPhoto = impDate.Person.Photo
                });
            }
        }

        foreach (var person in peopleWithContactReminders)
        {
            var interval = person.ContactReminderInterval ?? 1;
            var unit = person.ContactReminderIntervalUnit?.ToString() ?? "MONTHS";
            var nextDue = CalculateNextContactDue(person.LastContact!.Value.Date, interval, unit);
            var daysUntil = (int)(nextDue - today).TotalDays;

            if (daysUntil <= 30)
            {
                upcomingEvents.Add(new UpcomingEventDto
                {
                    Id = $"contact-{person.Id}",
                    PersonId = person.Id,
                    PersonName = NameUtils.FormatGraphName(person, nameOrder, nameDisplayFormat),
                    Type = "contact_reminder",
                    Title = null,
                    TitleKey = "timeToCatchUp",
                    Date = nextDue,
                    DaysUntil = daysUntil,
                    IsYearUnknown = false,
                    PersonPhoto = person.Photo
                });
            }
        }

        upcomingEvents.Sort((a, b) => a.DaysUntil.CompareTo(b.DaysUntil));

        return new DashboardStatsDto
        {
            UpcomingEvents = upcomingEvents,
            PeopleCount = peopleCount,
            GroupsCount = groupsCount
        };
    }

    private static DateTime GetNextImportantDateOccurrence(DateTime eventDate, DateTime today, int interval, string unit, DateTime? lastSent)
    {
        if (unit.Equals("YEARS", StringComparison.OrdinalIgnoreCase))
        {
            var isUnknownYear = eventDate.Year <= 1000;
            var anchorYear = isUnknownYear ? (lastSent?.Year ?? today.Year) : eventDate.Year;

            var thisYearOccurrence = new DateTime(today.Year, eventDate.Month, Math.Min(eventDate.Day, DateTime.DaysInMonth(today.Year, eventDate.Month)));
            var candidateYear = thisYearOccurrence >= today ? today.Year : today.Year + 1;

            if (lastSent.HasValue)
            {
                var minYear = lastSent.Value.Year + interval;
                if (candidateYear < minYear) candidateYear = minYear;
            }

            var yearsSinceAnchor = candidateYear - anchorYear;
            var rem = ((yearsSinceAnchor % interval) + interval) % interval;
            if (rem != 0) candidateYear += interval - rem;

            if (!isUnknownYear && candidateYear < eventDate.Year) candidateYear = eventDate.Year;

            return new DateTime(candidateYear, eventDate.Month, Math.Min(eventDate.Day, DateTime.DaysInMonth(candidateYear, eventDate.Month)));
        }

        var refDate = lastSent ?? eventDate;
        var intervalDays = unit.ToUpperInvariant() switch
        {
            "DAYS" => interval,
            "WEEKS" => interval * 7,
            "MONTHS" => interval * 30,
            _ => interval * 30
        };

        if (refDate >= today) return refDate;

        var daysDiff = (int)(today - refDate).TotalDays;
        var nextStep = ((daysDiff / intervalDays) + 1) * intervalDays;
        return refDate.AddDays(nextStep);
    }

    private static DateTime CalculateNextContactDue(DateTime lastContact, int interval, string unit)
    {
        return unit.ToUpperInvariant() switch
        {
            "DAYS" => lastContact.AddDays(interval),
            "WEEKS" => lastContact.AddDays(interval * 7),
            "MONTHS" => lastContact.AddMonths(interval),
            "YEARS" => lastContact.AddYears(interval),
            _ => lastContact.AddMonths(interval)
        };
    }

    public async Task<DashboardGraphDto> GetGraphAsync(Guid userId, DashboardGraphQuery query, CancellationToken ct = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        var nameOrder = user?.NameOrder ?? NameOrder.WESTERN;
        var nameDisplayFormat = user?.NameDisplayFormat ?? NameDisplayFormat.FULL;

        var includeGroupIds = (query.IncludeGroupIds ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToHashSet();

        var excludeGroupIds = (query.ExcludeGroupIds ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToHashSet();

        var hideUserNode = query.HideUserNode ?? true;
        var caseIdStr = query.CaseId?.Trim() ?? "";
        Guid.TryParse(caseIdStr, out var focusCaseId);
        var includeHop = query.IncludeHop ?? true;
        var includeSolvedCases = query.IncludeSolvedCases ?? true;
        var includeRuledOut = query.IncludeRuledOut ?? true;
        var customFieldFilter = query.Cf?.Trim() ?? "";
        var isAndMatch = query.GroupMatchOperator?.Equals("and", StringComparison.OrdinalIgnoreCase) ?? false;

        var peopleQuery = _context.People
            .Include(p => p.RelationshipToUser)
            .Include(p => p.Groups).ThenInclude(pg => pg.Group)
            .Include(p => p.Relationships).ThenInclude(r => r.RelationshipType)
            .Include(p => p.CriminalRecords)
            .Include(p => p.GangMemberships).ThenInclude(gm => gm.Gang)
            .Include(p => p.Vehicles)
            .Include(p => p.PhysicalMarks)
            .Include(p => p.BankAccounts)
            .Include(p => p.Events).ThenInclude(ep => ep.Event)
            .Include(p => p.CustomFieldValues).ThenInclude(cfv => cfv.Template)
            .Where(p => p.UserId == userId && p.DeletedAt == null);

        var allPeople = await peopleQuery.ToListAsync(ct);

        // Filter people by include/exclude groups
        var filteredPeople = allPeople.Where(p =>
        {
            var pGroupIds = p.Groups.Where(g => g.Group.DeletedAt == null).Select(g => g.GroupId).ToHashSet();

            if (excludeGroupIds.Count > 0 && pGroupIds.Overlaps(excludeGroupIds))
            {
                return false;
            }

            if (includeGroupIds.Count > 0)
            {
                if (isAndMatch)
                {
                    if (!includeGroupIds.IsSubsetOf(pGroupIds)) return false;
                }
                else
                {
                    if (!pGroupIds.Overlaps(includeGroupIds)) return false;
                }
            }

            if (!string.IsNullOrEmpty(customFieldFilter))
            {
                var colonIdx = customFieldFilter.IndexOf(':');
                var cfSlug = colonIdx >= 0 ? customFieldFilter[..colonIdx].Trim() : customFieldFilter;
                var cfVal = colonIdx >= 0 ? customFieldFilter[(colonIdx + 1)..].Trim() : "";

                var hasCf = p.CustomFieldValues.Any(cfv =>
                    cfv.Template.DeletedAt == null &&
                    string.Equals(cfv.Template.Slug, cfSlug, StringComparison.OrdinalIgnoreCase) &&
                    (string.IsNullOrEmpty(cfVal) || cfv.Value.Contains(cfVal, StringComparison.OrdinalIgnoreCase)));

                if (!hasCf) return false;
            }

            return true;
        }).ToList();

        // Query events
        var eventsQuery = _context.Events
            .Include(e => e.Groups).ThenInclude(eg => eg.Group)
            .Include(e => e.People)
            .Where(e => e.UserId == userId && e.DeletedAt == null);

        if (focusCaseId != Guid.Empty)
        {
            eventsQuery = eventsQuery.Where(e => e.Id == focusCaseId);
        }
        else if (!includeSolvedCases)
        {
            eventsQuery = eventsQuery.Where(e => e.Status == EventStatus.PLANNED || e.Status == EventStatus.ONGOING);
        }

        var events = await eventsQuery.ToListAsync(ct);

        // Filter people when a specific case is focused
        var finalPeople = filteredPeople;
        if (focusCaseId != Guid.Empty && events.Count > 0)
        {
            var directPersonIds = events.SelectMany(e => e.People.Select(p => p.PersonId)).ToHashSet();
            var allowedPersonIds = new HashSet<Guid>(directPersonIds);

            if (includeHop)
            {
                foreach (var p in filteredPeople)
                {
                    if (directPersonIds.Contains(p.Id))
                    {
                        foreach (var rel in p.Relationships.Where(r => r.DeletedAt == null))
                        {
                            allowedPersonIds.Add(rel.RelatedPersonId);
                        }
                    }
                    else
                    {
                        foreach (var rel in p.Relationships.Where(r => r.DeletedAt == null))
                        {
                            if (directPersonIds.Contains(rel.RelatedPersonId))
                            {
                                allowedPersonIds.Add(p.Id);
                            }
                        }
                    }
                }
            }

            finalPeople = filteredPeople.Where(p => allowedPersonIds.Contains(p.Id)).ToList();
        }

        if (query.Limit.HasValue && query.Limit.Value > 0)
        {
            finalPeople = finalPeople.Take(query.Limit.Value).ToList();
        }

        var nodes = new List<GraphNodeDto>();
        var edges = new List<GraphEdgeDto>();
        var nodeIds = new HashSet<string>();

        var userNodeId = $"user-{userId}";
        if (!hideUserNode)
        {
            nodes.Add(new GraphNodeDto
            {
                Id = userNodeId,
                Label = "You",
                IsCenter = true,
                Photo = user?.Photo,
                NodeType = "user"
            });
            nodeIds.Add(userNodeId);
        }

        foreach (var p in finalPeople)
        {
            var pNodeId = p.Id.ToString();
            var activeGroups = p.Groups.Where(g => g.Group.DeletedAt == null).ToList();

            var node = new GraphNodeDto
            {
                Id = pNodeId,
                Label = NameUtils.FormatGraphName(p, nameOrder, nameDisplayFormat),
                Groups = activeGroups.Select(g => g.GroupId.ToString()).ToList(),
                Colors = activeGroups.Select(g => g.Group.Color ?? "#3B82F6").DefaultIfEmpty("#3B82F6").ToList(),
                IsCenter = false,
                Photo = p.Photo,
                NodeType = "person",
                ManagementLevel = p.ManagementLevel,
                ThreatLevel = p.ThreatLevel,
                ResidenceStatus = p.ResidenceStatus,
                Gender = p.Gender,
                HasCriminalRecord = p.CriminalRecords.Any(c => c.DeletedAt == null),
                CriminalRecordCharges = p.CriminalRecords.Where(c => c.DeletedAt == null).Select(c => c.Charge).ToList(),
                HasActiveConviction = p.CriminalRecords.Any(c => c.DeletedAt == null && c.RecordType == "CONVICTION" && !c.IsPardoned),
                GangIds = p.GangMemberships.Select(g => g.GangId.ToString()).ToList(),
                GangRoles = p.GangMemberships.Select(g => g.Role).ToList(),
                HasSuspiciousVehicle = p.Vehicles.Any(v => v.DeletedAt == null && v.IsSuspicious),
                VehicleTypes = p.Vehicles.Where(v => v.DeletedAt == null).Select(v => v.VehicleType).ToList(),
                MarkTypes = p.PhysicalMarks.Where(m => m.DeletedAt == null).Select(m => m.Type).ToList(),
                HasMuleAccount = p.BankAccounts.Any(b => b.DeletedAt == null && (b.AccountType == "MULE" || b.AccountType == "SUSPICIOUS")),
                CaseLinks = p.Events.Where(e => e.DeletedAt == null && e.Event.DeletedAt == null).Select(e => new CaseLinkDto
                {
                    EventId = e.EventId,
                    EventTitle = e.Event.Title,
                    EventStatus = e.Event.Status.ToString(),
                    InvolvementType = e.InvolvementType,
                    VerificationStatus = e.VerificationStatus,
                    Confidence = e.Confidence,
                    Role = e.Role
                }).ToList()
            };

            nodes.Add(node);
            nodeIds.Add(pNodeId);

            if (!hideUserNode && p.RelationshipToUser != null && p.RelationshipToUser.DeletedAt == null)
            {
                edges.Add(new GraphEdgeDto
                {
                    Source = pNodeId,
                    Target = userNodeId,
                    Type = p.RelationshipToUser.Label,
                    Color = p.RelationshipToUser.Color ?? "#9CA3AF"
                });

                edges.Add(new GraphEdgeDto
                {
                    Source = userNodeId,
                    Target = pNodeId,
                    Type = p.RelationshipToUser.Label,
                    Color = p.RelationshipToUser.Color ?? "#9CA3AF"
                });
            }
        }

        // Add person-to-person edges
        var dedupedEdges = new Dictionary<string, GraphEdgeDto>();

        foreach (var p in finalPeople)
        {
            var pNodeId = p.Id.ToString();

            foreach (var r in p.Relationships.Where(rel => rel.DeletedAt == null && rel.RelationshipType != null && rel.RelationshipType.DeletedAt == null))
            {
                var targetId = r.RelatedPersonId.ToString();
                if (!nodeIds.Contains(targetId)) continue;

                var relType = r.RelationshipType!;
                var lineStyle = r.VerificationStatus is "UNVERIFIED" or "INVESTIGATING" ? "dashed"
                    : r.VerificationStatus == "RULED_OUT" ? "dotted"
                    : relType.LineStyle ?? "solid";

                var edge = new GraphEdgeDto
                {
                    Source = pNodeId,
                    Target = targetId,
                    Type = relType.Label,
                    Color = relType.Color ?? "#999999",
                    LineStyle = lineStyle,
                    VerificationStatus = r.VerificationStatus,
                    Confidence = r.Confidence,
                    Category = relType.Category,
                    DirectionType = relType.DirectionType == "DIRECTED" ? "DIRECTED" : "BIDIRECTIONAL"
                };

                dedupedEdges[$"{edge.Source}-{edge.Target}"] = edge;

                if (relType.DirectionType != "DIRECTED")
                {
                    var inverseEdge = new GraphEdgeDto
                    {
                        Source = targetId,
                        Target = pNodeId,
                        Type = relType.Label,
                        Color = relType.Color ?? "#999999",
                        LineStyle = lineStyle,
                        VerificationStatus = r.VerificationStatus,
                        Confidence = r.Confidence,
                        Category = relType.Category,
                        DirectionType = "BIDIRECTIONAL"
                    };
                    dedupedEdges[$"{inverseEdge.Source}-{inverseEdge.Target}"] = inverseEdge;
                }
            }
        }

        edges.AddRange(dedupedEdges.Values);

        // Add event nodes and event-to-person edges
        foreach (var ev in events)
        {
            var evNodeId = $"event-{ev.Id}";
            var activeGroups = ev.Groups.Where(g => g.Group.DeletedAt == null).ToList();

            nodes.Add(new GraphNodeDto
            {
                Id = evNodeId,
                Label = $"📅 {ev.Title}",
                Groups = activeGroups.Select(g => g.GroupId.ToString()).ToList(),
                Colors = activeGroups.Select(g => g.Group.Color ?? "#F59E0B").DefaultIfEmpty("#F59E0B").ToList(),
                IsCenter = focusCaseId == ev.Id,
                Photo = ev.Photo,
                NodeType = "event",
                EventStatus = ev.Status.ToString()
            });

            nodeIds.Add(evNodeId);

            foreach (var pe in ev.People.Where(p => p.DeletedAt == null))
            {
                if (!includeRuledOut && pe.VerificationStatus == "RULED_OUT") continue;

                var personNodeId = pe.PersonId.ToString();
                if (!nodeIds.Contains(personNodeId)) continue;

                var (color, lineStyle) = pe.VerificationStatus switch
                {
                    "CONFIRMED" => ("#EF4444", "solid"),
                    "INVESTIGATING" => ("#F97316", "dashed"),
                    "HYPOTHESIS" => ("#EAB308", "dashed"),
                    "RULED_OUT" => ("#6B7280", "dotted"),
                    _ => ("#F59E0B", "solid")
                };

                var labelParts = new List<string>();
                if (!string.IsNullOrEmpty(pe.Role)) labelParts.Add(pe.Role);
                if (!string.IsNullOrEmpty(pe.InvolvementType) && pe.InvolvementType != "OTHER") labelParts.Add(pe.InvolvementType);
                var edgeLabel = labelParts.Count > 0 ? string.Join(" · ", labelParts) : "Event";

                edges.Add(new GraphEdgeDto
                {
                    Source = personNodeId,
                    Target = evNodeId,
                    Type = edgeLabel,
                    Color = color,
                    LineStyle = lineStyle,
                    VerificationStatus = pe.VerificationStatus,
                    InvolvementType = pe.InvolvementType
                });
            }
        }

        // Enrich edges with labels
        var nodeLabels = nodes.ToDictionary(n => n.Id, n => n.Label);
        foreach (var edge in edges)
        {
            edge.SourceLabel = nodeLabels.GetValueOrDefault(edge.Source, "");
            edge.TargetLabel = nodeLabels.GetValueOrDefault(edge.Target, "");
        }

        return new DashboardGraphDto
        {
            Nodes = nodes,
            Edges = edges
        };
    }
}

