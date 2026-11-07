using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PhysicalMark : BaseEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string Type { get; set; } = string.Empty; // "TATTOO" | "SCAR" | "DEFORMITY" | "MOLE" | "OTHER"
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }

    public DateTime? DeletedAt { get; set; }
}

