using Nametag.Application.DTOs.Person;
using Nametag.Domain.Enums;

namespace Nametag.Application.DTOs.Event;

public class GroupSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
}

public class EventGroupItemDto
{
    public Guid EventId { get; set; }
    public Guid GroupId { get; set; }
    public DateTime AddedAt { get; set; }
    public GroupSummaryDto? Group { get; set; }
}

public class EventLocationDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? GeocodeStatus { get; set; }
    public DateTime? GeocodedAt { get; set; }
    public string? GeocodeHash { get; set; }
}

public class EventUrlDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class EventCustomFieldDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Type { get; set; }
}

public class EventParticipantDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public Guid EventId { get; set; }
    public string? Role { get; set; }
    public string InvolvementType { get; set; } = "SUSPECT";
    public string VerificationStatus { get; set; } = "HYPOTHESIS";
    public string? Confidence { get; set; }
    public string? ReasonForSuspicion { get; set; }
    public string? Alibi { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public PersonSummaryDto? Person { get; set; }
}

public class JournalEntryEventItemDto
{
    public Guid Id { get; set; }
    public Guid JournalEntryId { get; set; }
    public Guid EventId { get; set; }
    public JournalEntryInEventDto? JournalEntry { get; set; }
}

public class JournalEntryInEventDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Body { get; set; } = string.Empty;
    public List<JournalEntryPersonInEventDto> People { get; set; } = new();
}

public class JournalEntryPersonInEventDto
{
    public PersonSummaryDto? Person { get; set; }
}

public class EventDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public EventStatus Status { get; set; } = EventStatus.PLANNED;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool HasTime { get; set; }
    public string? Description { get; set; }
    public string? Photo { get; set; }
    public string? ImmichAlbumId { get; set; }
    public string? CaseCode { get; set; }
    public string? CrimeType { get; set; }
    public string? CaseStatus { get; set; }
    public string? IncidentTimeNotes { get; set; }
    public string? DamageAssessment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public List<EventGroupItemDto> Groups { get; set; } = new();
    public List<EventLocationDto> Addresses { get; set; } = new();
    public List<EventUrlDto> Urls { get; set; } = new();
    public List<EventCustomFieldDto> CustomFields { get; set; } = new();
    public List<EventParticipantDto> People { get; set; } = new();
    public List<JournalEntryEventItemDto> JournalEntries { get; set; } = new();
}

public class EventAddressInputDto
{
    public string Type { get; set; } = string.Empty;
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
}

public class EventUrlInputDto
{
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class EventCustomFieldInputDto
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Type { get; set; }
}

public class EventParticipantInputDto
{
    public Guid PersonId { get; set; }
    public string? Role { get; set; }
    public string? InvolvementType { get; set; }
    public string? VerificationStatus { get; set; }
    public string? Confidence { get; set; }
    public string? ReasonForSuspicion { get; set; }
    public string? Alibi { get; set; }
    public string? Notes { get; set; }
}

public class CreateEventRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public EventStatus? Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? HasTime { get; set; }
    public string? Description { get; set; }
    public string? Photo { get; set; }
    public string? CaseCode { get; set; }
    public string? CrimeType { get; set; }
    public string? CaseStatus { get; set; }
    public string? IncidentTimeNotes { get; set; }
    public string? DamageAssessment { get; set; }

    public List<Guid>? GroupIds { get; set; }
    public List<EventAddressInputDto>? Addresses { get; set; }
    public List<EventUrlInputDto>? Urls { get; set; }
    public List<EventCustomFieldInputDto>? CustomFields { get; set; }
    public List<EventParticipantInputDto>? Participants { get; set; }
}

public class UpdateEventRequest
{
    public string? Title { get; set; }
    public string? Category { get; set; }
    public EventStatus? Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? HasTime { get; set; }
    public string? Description { get; set; }
    public string? Photo { get; set; }
    public string? CaseCode { get; set; }
    public string? CrimeType { get; set; }
    public string? CaseStatus { get; set; }
    public string? IncidentTimeNotes { get; set; }
    public string? DamageAssessment { get; set; }

    public List<Guid>? GroupIds { get; set; }
    public List<EventAddressInputDto>? Addresses { get; set; }
    public List<EventUrlInputDto>? Urls { get; set; }
    public List<EventCustomFieldInputDto>? CustomFields { get; set; }
    public List<EventParticipantInputDto>? Participants { get; set; }
}

public class AddEventPersonRequest
{
    public Guid PersonId { get; set; }
    public string? Role { get; set; }
    public string? InvolvementType { get; set; } = "SUSPECT";
    public string? VerificationStatus { get; set; } = "HYPOTHESIS";
    public string? Confidence { get; set; }
    public string? ReasonForSuspicion { get; set; }
    public string? Alibi { get; set; }
    public string? Notes { get; set; }
}

public class UpdateEventPersonRequest
{
    public Guid? Id { get; set; }
    public Guid? PersonId { get; set; }
    public string? Role { get; set; }
    public string? InvolvementType { get; set; }
    public string? VerificationStatus { get; set; }
    public string? Confidence { get; set; }
    public string? ReasonForSuspicion { get; set; }
    public string? Alibi { get; set; }
    public string? Notes { get; set; }
}

public class BulkEventActionRequest
{
    public List<Guid>? EventIds { get; set; }
    public bool? SelectAll { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? CaseStatus { get; set; }
    public EventStatus? Status { get; set; }
    public List<Guid>? GroupIds { get; set; }
}

public class BulkActionResultDto
{
    public bool Success { get; set; } = true;
    public int AffectedCount { get; set; }
}

public class EventListQuery
{
    public EventStatus? Status { get; set; }
    public string? Category { get; set; }
    public Guid? PersonId { get; set; }
    public Guid? GroupId { get; set; }
    public string? Q { get; set; }
}

