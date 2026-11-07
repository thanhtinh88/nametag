using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventMapDrawing : BaseEntity
{
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public string DrawingType { get; set; } = "POLYGON";
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public string StrokeColor { get; set; } = "#f59e0b";
    public int StrokeWidth { get; set; } = 3;
    public string StrokeStyle { get; set; } = "SOLID";
    public string? FillColor { get; set; } = "#f59e0b";
    public double FillOpacity { get; set; } = 0.2;
    public string Coordinates { get; set; } = "[]";
    public double? RadiusMeters { get; set; }
}

