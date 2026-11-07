using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class Gang : BaseAuditableEntity, ISoftDeletable
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Turf { get; set; }
    public string? Color { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<GangMembership> Members { get; set; } = new List<GangMembership>();
}

