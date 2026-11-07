using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventUrl : BaseEntity
{
    public Guid EventId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    // Navigation
    public Event? Event { get; set; }
}

