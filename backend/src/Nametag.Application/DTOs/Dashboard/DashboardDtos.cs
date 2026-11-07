namespace Nametag.Application.DTOs.Dashboard;

public class UpcomingEventDto
{
    public string Id { get; set; } = string.Empty;
    public Guid PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public string Type { get; set; } = "important_date"; // "important_date" | "contact_reminder"
    public string? Title { get; set; }
    public string? TitleKey { get; set; }
    public DateTime Date { get; set; }
    public int DaysUntil { get; set; }
    public bool IsYearUnknown { get; set; }
    public string? PersonPhoto { get; set; }
}

public class DashboardStatsDto
{
    public List<UpcomingEventDto> UpcomingEvents { get; set; } = new();
    public int PeopleCount { get; set; }
    public int GroupsCount { get; set; }
}

public class DashboardGraphQuery
{
    public string? IncludeGroupIds { get; set; }
    public string? ExcludeGroupIds { get; set; }
    public int? Limit { get; set; }
    public bool? HideUserNode { get; set; }
    public string? CaseId { get; set; }
    public bool? IncludeHop { get; set; }
    public bool? IncludeSolvedCases { get; set; }
    public bool? IncludeRuledOut { get; set; }
    public string? Cf { get; set; }
    public string? GroupMatchOperator { get; set; }
}

public class CaseLinkDto
{
    public Guid EventId { get; set; }
    public string? EventTitle { get; set; }
    public string? EventStatus { get; set; }
    public string? InvolvementType { get; set; }
    public string? VerificationStatus { get; set; }
    public string? Confidence { get; set; }
    public string? Role { get; set; }
}

public class GraphNodeDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<string> Groups { get; set; } = new();
    public List<string> Colors { get; set; } = new();
    public bool IsCenter { get; set; }
    public string? Photo { get; set; }
    public string? NodeType { get; set; }
    public string? EventStatus { get; set; }

    // Tactical fields
    public string? ManagementLevel { get; set; }
    public string? ThreatLevel { get; set; }
    public string? ResidenceStatus { get; set; }
    public string? Gender { get; set; }
    public bool HasCriminalRecord { get; set; }
    public List<string> CriminalRecordCharges { get; set; } = new();
    public bool HasActiveConviction { get; set; }
    public List<string> GangIds { get; set; } = new();
    public List<string> GangRoles { get; set; } = new();
    public bool HasSuspiciousVehicle { get; set; }
    public List<string> VehicleTypes { get; set; } = new();
    public List<string> MarkTypes { get; set; } = new();
    public bool HasMuleAccount { get; set; }
    public List<CaseLinkDto> CaseLinks { get; set; } = new();
}

public class GraphEdgeDto
{
    public string Source { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Color { get; set; } = "#9CA3AF";
    public string? SourceLabel { get; set; }
    public string? TargetLabel { get; set; }
    public string? LineStyle { get; set; }
    public string? VerificationStatus { get; set; }
    public string? Confidence { get; set; }
    public string? Category { get; set; }
    public string? DirectionType { get; set; }
    public string? InvolvementType { get; set; }
}

public class DashboardGraphDto
{
    public List<GraphNodeDto> Nodes { get; set; } = new();
    public List<GraphEdgeDto> Edges { get; set; } = new();
}

