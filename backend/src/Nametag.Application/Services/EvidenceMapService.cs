using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.EvidenceMap;
using Nametag.Domain.Entities;

namespace Nametag.Application.Services;

public class EvidenceMapService : IEvidenceMapService
{
    private readonly IAppDbContext _context;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public EvidenceMapService(IAppDbContext context)
    {
        _context = context;
    }

    private async Task<Event> VerifyEventOwnershipAsync(Guid userId, Guid eventId, CancellationToken ct)
    {
        var ev = await _context.Events
            .Include(e => e.Addresses)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId && e.DeletedAt == null, ct);

        if (ev == null)
        {
            throw new NotFoundException("Event not found");
        }

        return ev;
    }

    private async Task VerifyPersonOwnershipAsync(Guid userId, Guid personId, CancellationToken ct)
    {
        var person = await _context.People
            .FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct);

        if (person == null)
        {
            throw new BadRequestException("Invalid personId");
        }
    }

    private static LinkedPersonSummaryDto? MapPersonSummary(Person? p)
    {
        if (p == null) return null;
        return new LinkedPersonSummaryDto
        {
            Id = p.Id,
            Name = p.Name,
            Surname = p.Surname,
            Nickname = p.Nickname,
            DisplayNameOverride = p.DisplayNameOverride,
            Photo = p.Photo
        };
    }

    private static EvidenceMapMarkerDto MapMarker(EventMapMarker m) => new()
    {
        Id = m.Id,
        EventId = m.EventId,
        PersonId = m.PersonId,
        Person = MapPersonSummary(m.Person),
        MarkerType = m.MarkerType,
        Label = m.Label,
        Description = m.Description,
        Latitude = m.Latitude,
        Longitude = m.Longitude,
        OccurredAt = m.OccurredAt,
        Color = m.Color,
        MediaUrl = m.MediaUrl,
        MediaType = m.MediaType ?? "IMAGE",
        CameraDirection = m.CameraDirection,
        CameraFovDeg = m.CameraFovDeg ?? 60,
        CameraStatus = m.CameraStatus ?? "CAPTURED",
        RawTimeNote = m.RawTimeNote,
        BtsCode = m.BtsCode,
        BtsCarrier = m.BtsCarrier,
        BtsRadiusMeters = m.BtsRadiusMeters ?? 300,
        BtsAzimuthDeg = m.BtsAzimuthDeg,
        SubscriberInfo = m.SubscriberInfo,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt
    };

    private static EvidenceMapRouteDto MapRoute(EventMapRoute r)
    {
        List<RouteWaypointDto> waypoints;
        try
        {
            waypoints = !string.IsNullOrWhiteSpace(r.Waypoints)
                ? JsonSerializer.Deserialize<List<RouteWaypointDto>>(r.Waypoints, JsonOptions) ?? new()
                : new();
        }
        catch
        {
            waypoints = new();
        }

        return new EvidenceMapRouteDto
        {
            Id = r.Id,
            EventId = r.EventId,
            PersonId = r.PersonId,
            Person = MapPersonSummary(r.Person),
            Label = r.Label,
            RouteType = r.RouteType,
            Color = r.Color,
            Waypoints = waypoints,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        };
    }

    private static EvidenceMapDrawingDto MapDrawing(EventMapDrawing d)
    {
        List<DrawingCoordDto> coordinates;
        try
        {
            coordinates = !string.IsNullOrWhiteSpace(d.Coordinates)
                ? JsonSerializer.Deserialize<List<DrawingCoordDto>>(d.Coordinates, JsonOptions) ?? new()
                : new();
        }
        catch
        {
            coordinates = new();
        }

        return new EvidenceMapDrawingDto
        {
            Id = d.Id,
            EventId = d.EventId,
            DrawingType = d.DrawingType,
            Label = d.Label,
            Notes = d.Notes,
            StrokeColor = d.StrokeColor,
            StrokeWidth = d.StrokeWidth,
            StrokeStyle = d.StrokeStyle,
            FillColor = d.FillColor,
            FillOpacity = d.FillOpacity,
            Coordinates = coordinates,
            RadiusMeters = d.RadiusMeters,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<EvidenceMapOverviewDto> GetEvidenceMapAsync(Guid userId, Guid eventId, CancellationToken ct = default)
    {
        var ev = await VerifyEventOwnershipAsync(userId, eventId, ct);

        var markers = await _context.EventMapMarkers
            .Include(m => m.Person)
            .Where(m => m.EventId == eventId)
            .OrderBy(m => m.OccurredAt)
            .ThenBy(m => m.CreatedAt)
            .ToListAsync(ct);

        var routes = await _context.EventMapRoutes
            .Include(r => r.Person)
            .Where(r => r.EventId == eventId)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(ct);

        var drawings = await _context.EventMapDrawings
            .Where(d => d.EventId == eventId)
            .OrderBy(d => d.CreatedAt)
            .ToListAsync(ct);

        var addrWithCoords = ev.Addresses.FirstOrDefault(a => a.Latitude != null && a.Longitude != null);
        DefaultCenterDto? defaultCenter = addrWithCoords != null
            ? new DefaultCenterDto
            {
                Latitude = (double)addrWithCoords.Latitude!,
                Longitude = (double)addrWithCoords.Longitude!
            }
            : null;

        return new EvidenceMapOverviewDto
        {
            Markers = markers.Select(MapMarker).ToList(),
            Routes = routes.Select(MapRoute).ToList(),
            Drawings = drawings.Select(MapDrawing).ToList(),
            DefaultCenter = defaultCenter
        };
    }

    public async Task<EvidenceMapMarkerDto> CreateMarkerAsync(Guid userId, Guid eventId, CreateMarkerRequest request, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        if (request.PersonId.HasValue)
        {
            await VerifyPersonOwnershipAsync(userId, request.PersonId.Value, ct);
        }

        var marker = new EventMapMarker
        {
            EventId = eventId,
            PersonId = request.PersonId,
            MarkerType = string.IsNullOrWhiteSpace(request.MarkerType) ? "CAMERA" : request.MarkerType,
            Label = request.Label.Trim(),
            Description = request.Description,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            OccurredAt = request.OccurredAt,
            Color = request.Color,
            MediaUrl = request.MediaUrl,
            MediaType = request.MediaType ?? "IMAGE",
            CameraDirection = request.CameraDirection,
            CameraFovDeg = request.CameraFovDeg ?? 60,
            CameraStatus = request.CameraStatus ?? "CAPTURED",
            RawTimeNote = request.RawTimeNote,
            BtsCode = request.BtsCode,
            BtsCarrier = request.BtsCarrier,
            BtsRadiusMeters = request.BtsRadiusMeters ?? 300,
            BtsAzimuthDeg = request.BtsAzimuthDeg,
            SubscriberInfo = request.SubscriberInfo
        };

        _context.EventMapMarkers.Add(marker);
        await _context.SaveChangesAsync(ct);

        if (marker.PersonId.HasValue)
        {
            marker.Person = await _context.People.FirstOrDefaultAsync(p => p.Id == marker.PersonId.Value, ct);
        }

        return MapMarker(marker);
    }

    public async Task<EvidenceMapMarkerDto> UpdateMarkerAsync(Guid userId, Guid eventId, Guid markerId, UpdateMarkerRequest request, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var existing = await _context.EventMapMarkers
            .Include(m => m.Person)
            .FirstOrDefaultAsync(m => m.Id == markerId && m.EventId == eventId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Marker not found");
        }

        if (request.PersonId.HasValue)
        {
            await VerifyPersonOwnershipAsync(userId, request.PersonId.Value, ct);
            existing.PersonId = request.PersonId;
        }

        if (request.MarkerType != null) existing.MarkerType = request.MarkerType;
        if (request.Label != null) existing.Label = request.Label.Trim();
        if (request.Description != null) existing.Description = request.Description;
        if (request.Latitude.HasValue) existing.Latitude = request.Latitude.Value;
        if (request.Longitude.HasValue) existing.Longitude = request.Longitude.Value;
        if (request.OccurredAt != null) existing.OccurredAt = request.OccurredAt;
        if (request.Color != null) existing.Color = request.Color;
        if (request.MediaUrl != null) existing.MediaUrl = request.MediaUrl;
        if (request.MediaType != null) existing.MediaType = request.MediaType;
        if (request.CameraDirection.HasValue) existing.CameraDirection = request.CameraDirection.Value;
        if (request.CameraFovDeg.HasValue) existing.CameraFovDeg = request.CameraFovDeg.Value;
        if (request.CameraStatus != null) existing.CameraStatus = request.CameraStatus;
        if (request.RawTimeNote != null) existing.RawTimeNote = request.RawTimeNote;
        if (request.BtsCode != null) existing.BtsCode = request.BtsCode;
        if (request.BtsCarrier != null) existing.BtsCarrier = request.BtsCarrier;
        if (request.BtsRadiusMeters.HasValue) existing.BtsRadiusMeters = request.BtsRadiusMeters.Value;
        if (request.BtsAzimuthDeg.HasValue) existing.BtsAzimuthDeg = request.BtsAzimuthDeg.Value;
        if (request.SubscriberInfo != null) existing.SubscriberInfo = request.SubscriberInfo;

        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return MapMarker(existing);
    }

    public async Task DeleteMarkerAsync(Guid userId, Guid eventId, Guid markerId, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var existing = await _context.EventMapMarkers
            .FirstOrDefaultAsync(m => m.Id == markerId && m.EventId == eventId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Marker not found");
        }

        _context.EventMapMarkers.Remove(existing);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<EvidenceMapRouteDto> CreateRouteAsync(Guid userId, Guid eventId, CreateRouteRequest request, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        if (request.PersonId.HasValue)
        {
            await VerifyPersonOwnershipAsync(userId, request.PersonId.Value, ct);
        }

        var route = new EventMapRoute
        {
            EventId = eventId,
            PersonId = request.PersonId,
            Label = request.Label.Trim(),
            RouteType = string.IsNullOrWhiteSpace(request.RouteType) ? "CONFIRMED_PATH" : request.RouteType,
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#ef4444" : request.Color,
            Waypoints = JsonSerializer.Serialize(request.Waypoints ?? new(), JsonOptions),
            Notes = request.Notes
        };

        _context.EventMapRoutes.Add(route);
        await _context.SaveChangesAsync(ct);

        if (route.PersonId.HasValue)
        {
            route.Person = await _context.People.FirstOrDefaultAsync(p => p.Id == route.PersonId.Value, ct);
        }

        return MapRoute(route);
    }

    public async Task<EvidenceMapRouteDto> UpdateRouteAsync(Guid userId, Guid eventId, Guid routeId, UpdateRouteRequest request, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var existing = await _context.EventMapRoutes
            .Include(r => r.Person)
            .FirstOrDefaultAsync(r => r.Id == routeId && r.EventId == eventId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Route not found");
        }

        if (request.PersonId.HasValue)
        {
            await VerifyPersonOwnershipAsync(userId, request.PersonId.Value, ct);
            existing.PersonId = request.PersonId;
        }

        if (request.Label != null) existing.Label = request.Label.Trim();
        if (request.RouteType != null) existing.RouteType = request.RouteType;
        if (request.Color != null) existing.Color = request.Color;
        if (request.Waypoints != null) existing.Waypoints = JsonSerializer.Serialize(request.Waypoints, JsonOptions);
        if (request.Notes != null) existing.Notes = request.Notes;

        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return MapRoute(existing);
    }

    public async Task DeleteRouteAsync(Guid userId, Guid eventId, Guid routeId, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var existing = await _context.EventMapRoutes
            .FirstOrDefaultAsync(r => r.Id == routeId && r.EventId == eventId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Route not found");
        }

        _context.EventMapRoutes.Remove(existing);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<EvidenceMapDrawingDto> CreateDrawingAsync(Guid userId, Guid eventId, CreateDrawingRequest request, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var drawing = new EventMapDrawing
        {
            EventId = eventId,
            DrawingType = string.IsNullOrWhiteSpace(request.DrawingType) ? "POLYGON" : request.DrawingType,
            Label = request.Label,
            Notes = request.Notes,
            StrokeColor = string.IsNullOrWhiteSpace(request.StrokeColor) ? "#f59e0b" : request.StrokeColor,
            StrokeWidth = request.StrokeWidth <= 0 ? 3 : request.StrokeWidth,
            StrokeStyle = string.IsNullOrWhiteSpace(request.StrokeStyle) ? "SOLID" : request.StrokeStyle,
            FillColor = string.IsNullOrWhiteSpace(request.FillColor) ? request.StrokeColor : request.FillColor,
            FillOpacity = request.FillOpacity,
            Coordinates = JsonSerializer.Serialize(request.Coordinates ?? new(), JsonOptions),
            RadiusMeters = request.RadiusMeters
        };

        _context.EventMapDrawings.Add(drawing);
        await _context.SaveChangesAsync(ct);

        return MapDrawing(drawing);
    }

    public async Task<EvidenceMapDrawingDto> UpdateDrawingAsync(Guid userId, Guid eventId, Guid drawingId, UpdateDrawingRequest request, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var existing = await _context.EventMapDrawings
            .FirstOrDefaultAsync(d => d.Id == drawingId && d.EventId == eventId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Drawing not found");
        }

        if (request.DrawingType != null) existing.DrawingType = request.DrawingType;
        if (request.Label != null) existing.Label = request.Label;
        if (request.Notes != null) existing.Notes = request.Notes;
        if (request.StrokeColor != null) existing.StrokeColor = request.StrokeColor;
        if (request.StrokeWidth.HasValue) existing.StrokeWidth = request.StrokeWidth.Value;
        if (request.StrokeStyle != null) existing.StrokeStyle = request.StrokeStyle;
        if (request.FillColor != null) existing.FillColor = request.FillColor;
        if (request.FillOpacity.HasValue) existing.FillOpacity = request.FillOpacity.Value;
        if (request.Coordinates != null) existing.Coordinates = JsonSerializer.Serialize(request.Coordinates, JsonOptions);
        if (request.RadiusMeters.HasValue) existing.RadiusMeters = request.RadiusMeters.Value;

        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return MapDrawing(existing);
    }

    public async Task DeleteDrawingAsync(Guid userId, Guid eventId, Guid drawingId, CancellationToken ct = default)
    {
        await VerifyEventOwnershipAsync(userId, eventId, ct);

        var existing = await _context.EventMapDrawings
            .FirstOrDefaultAsync(d => d.Id == drawingId && d.EventId == eventId, ct);

        if (existing == null)
        {
            throw new NotFoundException("Drawing not found");
        }

        _context.EventMapDrawings.Remove(existing);
        await _context.SaveChangesAsync(ct);
    }
}
