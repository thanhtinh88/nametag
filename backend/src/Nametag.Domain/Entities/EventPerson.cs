using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventPerson : BaseEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Guid EventId { get; set; }
    public string InvolvementType { get; set; } = "SUSPECT";
    public string VerificationStatus { get; set; } = "HYPOTHESIS";
    public string? Confidence { get; set; }
    public string? Role { get; set; }
    public string? ReasonForSuspicion { get; set; }
    public string? Alibi { get; set; }
    public string? Notes { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public Person? Person { get; set; }
    public Event? Event { get; set; }
}

