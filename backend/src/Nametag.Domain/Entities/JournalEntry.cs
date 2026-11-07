using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class JournalEntry : BaseAuditableEntity, ISoftDeletable
{
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public bool HasTime { get; set; } = false;
    public string Body { get; set; } = string.Empty;
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public ICollection<JournalEntryPerson> People { get; set; } = new List<JournalEntryPerson>();
    public ICollection<JournalEntryEvent> Events { get; set; } = new List<JournalEntryEvent>();
}

