using Nametag.Application.DTOs.Dashboard;

namespace Nametag.Application.DTOs.Map;

public class MapGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
}

public class MapGangDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
}

public class MapMarkerDto
{
    public string Id { get; set; } = string.Empty;
    public string Source { get; set; } = "address"; // "address" | "location" | "event_address"
    public string PersonId { get; set; } = string.Empty;
    public string PersonName { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? Label { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? AddressText { get; set; }
    public List<string> GroupIds { get; set; } = new();
    public bool HasPhoto { get; set; }
    public string? GroupColor { get; set; }
    public string? MarkerType { get; set; }
    public string? EventStatus { get; set; }

    // Tactical Fields
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
    public List<CaseLinkDto>? CaseLinks { get; set; }
}

public class UnlocatedPersonDto
{
    public Guid PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public int FailedCount { get; set; }
}

public class UnmappedSubjectDto
{
    public Guid PersonId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public List<string> GroupIds { get; set; } = new();
    public string? GroupColor { get; set; }
    public List<CaseLinkDto>? CaseLinks { get; set; }
}

public class MapCaseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "PLANNED";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class MapMarkersResponseDto
{
    public List<MapMarkerDto> Markers { get; set; } = new();
    public List<MapGroupDto> Groups { get; set; } = new();
    public List<MapGangDto> Gangs { get; set; } = new();
    public List<MapCaseDto>? Cases { get; set; }
    public List<UnmappedSubjectDto>? UnmappedSubjects { get; set; }
    public int PendingCount { get; set; }
    public int FailedCount { get; set; }
    public List<UnlocatedPersonDto> UnlocatedPeople { get; set; } = new();
    public bool GeocodingEnabled { get; set; } = true;
}

public class GeocodeRetryRequest
{
    public Guid AddressId { get; set; }
}

