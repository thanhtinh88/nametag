using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class JournalEntryPerson : BaseEntity
{
    public Guid JournalEntryId { get; set; }
    public Guid PersonId { get; set; }

    // Navigation
    public JournalEntry? JournalEntry { get; set; }
    public Person? Person { get; set; }
}

