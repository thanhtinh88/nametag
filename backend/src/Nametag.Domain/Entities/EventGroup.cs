namespace Nametag.Domain.Entities;

public class EventGroup
{
    public Guid EventId { get; set; }
    public Guid GroupId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Event? Event { get; set; }
    public Group? Group { get; set; }
}

