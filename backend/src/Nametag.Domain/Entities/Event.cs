using Nametag.Domain.Common;
using Nametag.Domain.Enums;

namespace Nametag.Domain.Entities;

public class Event : BaseAuditableEntity, ISoftDeletable
{
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public EventStatus Status { get; set; } = EventStatus.PLANNED;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool HasTime { get; set; } = false;
    public string? Description { get; set; }
    public string? Photo { get; set; }
    public string? ImmichAlbumId { get; set; }

    // Investigation & Case Management Fields
    public string? CaseCode { get; set; }
    public string? CrimeType { get; set; }
    public string? CaseStatus { get; set; } = "UNRESOLVED";
    public string? IncidentTimeNotes { get; set; }
    public string? DamageAssessment { get; set; }

    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public ICollection<EventGroup> Groups { get; set; } = new List<EventGroup>();
    public ICollection<EventPerson> People { get; set; } = new List<EventPerson>();
    public ICollection<EventLocation> Addresses { get; set; } = new List<EventLocation>();
    public ICollection<EventUrl> Urls { get; set; } = new List<EventUrl>();
    public ICollection<EventCustomField> CustomFields { get; set; } = new List<EventCustomField>();
    public ICollection<JournalEntryEvent> JournalEntries { get; set; } = new List<JournalEntryEvent>();
    public ICollection<EventMapMarker> Markers { get; set; } = new List<EventMapMarker>();
    public ICollection<EventMapRoute> Routes { get; set; } = new List<EventMapRoute>();
    public ICollection<EventMapDrawing> Drawings { get; set; } = new List<EventMapDrawing>();
}

