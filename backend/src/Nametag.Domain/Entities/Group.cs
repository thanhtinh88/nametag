using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class Group : BaseAuditableEntity, ISoftDeletable
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public ICollection<PersonGroup> People { get; set; } = new List<PersonGroup>();
    public ICollection<EventGroup> Events { get; set; } = new List<EventGroup>();
}

