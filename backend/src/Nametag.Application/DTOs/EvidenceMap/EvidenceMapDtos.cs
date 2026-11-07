using System.Text.Json.Serialization;

namespace Nametag.Application.DTOs.EvidenceMap;

public class LinkedPersonSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? Photo { get; set; }
}

public class DefaultCenterDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class EvidenceMapOverviewDto
{
    public List<EvidenceMapMarkerDto> Markers { get; set; } = new();
    public List<EvidenceMapRouteDto> Routes { get; set; } = new();
    public List<EvidenceMapDrawingDto> Drawings { get; set; } = new();
    public DefaultCenterDto? DefaultCenter { get; set; }
}

public class EvidenceMapMarkerDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid? PersonId { get; set; }
    public LinkedPersonSummaryDto? Person { get; set; }
    public string MarkerType { get; set; } = "CAMERA";
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? Color { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; } = "IMAGE";
    public int? CameraDirection { get; set; }
    public int? CameraFovDeg { get; set; } = 60;
    public string? CameraStatus { get; set; } = "CAPTURED";
    public string? RawTimeNote { get; set; }
    public string? BtsCode { get; set; }
    public string? BtsCarrier { get; set; }
    public int? BtsRadiusMeters { get; set; } = 300;
    public int? BtsAzimuthDeg { get; set; }
    public string? SubscriberInfo { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateMarkerRequest
{
    public string MarkerType { get; set; } = "CAMERA";
    public Guid? PersonId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? Color { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; } = "IMAGE";
    public int? CameraDirection { get; set; }
    public int? CameraFovDeg { get; set; } = 60;
    public string? CameraStatus { get; set; } = "CAPTURED";
    public string? RawTimeNote { get; set; }
    public string? BtsCode { get; set; }
    public string? BtsCarrier { get; set; }
    public int? BtsRadiusMeters { get; set; } = 300;
    public int? BtsAzimuthDeg { get; set; }
    public string? SubscriberInfo { get; set; }
}

public class UpdateMarkerRequest
{
    public string? MarkerType { get; set; }
    public Guid? PersonId { get; set; }
    public string? Label { get; set; }
    public string? Description { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? Color { get; set; }
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; }
    public int? CameraDirection { get; set; }
    public int? CameraFovDeg { get; set; }
    public string? CameraStatus { get; set; }
    public string? RawTimeNote { get; set; }
    public string? BtsCode { get; set; }
    public string? BtsCarrier { get; set; }
    public int? BtsRadiusMeters { get; set; }
    public int? BtsAzimuthDeg { get; set; }
    public string? SubscriberInfo { get; set; }
}

public class RouteWaypointDto
{
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string? MarkerId { get; set; }
    public string? Timestamp { get; set; }
    public string? Label { get; set; }
}

public class EvidenceMapRouteDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid? PersonId { get; set; }
    public LinkedPersonSummaryDto? Person { get; set; }
    public string Label { get; set; } = string.Empty;
    public string RouteType { get; set; } = "CONFIRMED_PATH";
    public string Color { get; set; } = "#ef4444";
    public List<RouteWaypointDto> Waypoints { get; set; } = new();
    public string? Notes { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateRouteRequest
{
    public Guid? PersonId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string RouteType { get; set; } = "CONFIRMED_PATH";
    public string Color { get; set; } = "#ef4444";
    public List<RouteWaypointDto> Waypoints { get; set; } = new();
    public string? Notes { get; set; }
}

public class UpdateRouteRequest
{
    public Guid? PersonId { get; set; }
    public string? Label { get; set; }
    public string? RouteType { get; set; }
    public string? Color { get; set; }
    public List<RouteWaypointDto>? Waypoints { get; set; }
    public string? Notes { get; set; }
}

public class DrawingCoordDto
{
    public double Lat { get; set; }
    public double Lng { get; set; }
}

public class EvidenceMapDrawingDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string DrawingType { get; set; } = "POLYGON";
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public string StrokeColor { get; set; } = "#f59e0b";
    public int StrokeWidth { get; set; } = 3;
    public string StrokeStyle { get; set; } = "SOLID";
    public string? FillColor { get; set; }
    public double FillOpacity { get; set; } = 0.2;
    public List<DrawingCoordDto> Coordinates { get; set; } = new();
    public double? RadiusMeters { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateDrawingRequest
{
    public string DrawingType { get; set; } = "POLYGON";
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public string StrokeColor { get; set; } = "#f59e0b";
    public int StrokeWidth { get; set; } = 3;
    public string StrokeStyle { get; set; } = "SOLID";
    public string? FillColor { get; set; }
    public double FillOpacity { get; set; } = 0.2;
    public List<DrawingCoordDto> Coordinates { get; set; } = new();
    public double? RadiusMeters { get; set; }
}

public class UpdateDrawingRequest
{
    public string? DrawingType { get; set; }
    public string? Label { get; set; }
    public string? Notes { get; set; }
    public string? StrokeColor { get; set; }
    public int? StrokeWidth { get; set; }
    public string? StrokeStyle { get; set; }
    public string? FillColor { get; set; }
    public double? FillOpacity { get; set; }
    public List<DrawingCoordDto>? Coordinates { get; set; }
    public double? RadiusMeters { get; set; }
}

