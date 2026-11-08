using Nametag.Domain.Common;
using Nametag.Domain.Enums;

namespace Nametag.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public Theme Theme { get; set; } = Theme.DARK;
    public DateFormat DateFormat { get; set; } = DateFormat.MDY;
    public NameOrder NameOrder { get; set; } = NameOrder.WESTERN;
    public NameDisplayFormat NameDisplayFormat { get; set; } = NameDisplayFormat.FULL;
    public string? GraphMode { get; set; }
    public bool GeocodingEnabled { get; set; } = true;
    public int DefaultReminderLeadDays { get; set; } = 0;
    public bool WeeklyDigestEnabled { get; set; } = false;
    public int WeeklyDigestWeekday { get; set; } = 1;
    public DateTime? LastWeeklyDigestSent { get; set; }
    public bool EmailRemindersEnabled { get; set; } = true;
    public string Language { get; set; } = "en";
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
    public string? Photo { get; set; }

    // Refresh Tokens
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    // People
    public ICollection<Person> People { get; set; } = new List<Person>();

    // Groups
    public ICollection<Group> Groups { get; set; } = new List<Group>();

    // Relationship Types
    public ICollection<RelationshipType> RelationshipTypes { get; set; } = new List<RelationshipType>();

    // Events
    public ICollection<Event> Events { get; set; } = new List<Event>();

    // Journal Entries
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();

    // Gangs
    public ICollection<Gang> Gangs { get; set; } = new List<Gang>();

    // Custom Field Templates
    public ICollection<CustomFieldTemplate> CustomFieldTemplates { get; set; } = new List<CustomFieldTemplate>();

    // Duplicate Dismissals
    public ICollection<DuplicateDismissal> DuplicateDismissals { get; set; } = new List<DuplicateDismissal>();

    // Immich Connection
    public ImmichConnection? ImmichConnection { get; set; }
}
