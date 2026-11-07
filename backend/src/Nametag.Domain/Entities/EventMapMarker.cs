using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventMapMarker : BaseEntity
{
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public Guid? PersonId { get; set; }
    public Person? Person { get; set; }

    public string MarkerType { get; set; } = "CAMERA";
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? Color { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; } = "IMAGE";

    // Camera fields
    public int? CameraDirection { get; set; }
    public int? CameraFovDeg { get; set; } = 60;
    public string? CameraStatus { get; set; } = "CAPTURED";
    public string? RawTimeNote { get; set; }

    // BTS fields
    public string? BtsCode { get; set; }
    public string? BtsCarrier { get; set; }
    public int? BtsRadiusMeters { get; set; } = 300;
    public int? BtsAzimuthDeg { get; set; }
    public string? SubscriberInfo { get; set; }
}

