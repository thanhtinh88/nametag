using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventCustomField : BaseEntity
{
    public Guid EventId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Type { get; set; }

    // Navigation
    public Event? Event { get; set; }
}

