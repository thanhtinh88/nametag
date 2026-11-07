using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventMapRoute : BaseEntity
{
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public Guid? PersonId { get; set; }
    public Person? Person { get; set; }

    public string Label { get; set; } = string.Empty;
    public string RouteType { get; set; } = "CONFIRMED_PATH";
    public string Color { get; set; } = "#ef4444";
    public string Waypoints { get; set; } = "[]";
    public string? Notes { get; set; }
}

