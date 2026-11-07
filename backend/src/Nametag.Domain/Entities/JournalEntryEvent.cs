using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class JournalEntryEvent : BaseEntity
{
    public Guid JournalEntryId { get; set; }
    public Guid EventId { get; set; }

    // Navigation
    public JournalEntry? JournalEntry { get; set; }
    public Event? Event { get; set; }
}

