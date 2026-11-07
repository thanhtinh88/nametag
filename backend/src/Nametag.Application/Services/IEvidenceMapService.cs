using Nametag.Application.DTOs.EvidenceMap;

namespace Nametag.Application.Services;

public interface IEvidenceMapService
{
    Task<EvidenceMapOverviewDto> GetEvidenceMapAsync(Guid userId, Guid eventId, CancellationToken ct = default);

    Task<EvidenceMapMarkerDto> CreateMarkerAsync(Guid userId, Guid eventId, CreateMarkerRequest request, CancellationToken ct = default);
    Task<EvidenceMapMarkerDto> UpdateMarkerAsync(Guid userId, Guid eventId, Guid markerId, UpdateMarkerRequest request, CancellationToken ct = default);
    Task DeleteMarkerAsync(Guid userId, Guid eventId, Guid markerId, CancellationToken ct = default);

    Task<EvidenceMapRouteDto> CreateRouteAsync(Guid userId, Guid eventId, CreateRouteRequest request, CancellationToken ct = default);
    Task<EvidenceMapRouteDto> UpdateRouteAsync(Guid userId, Guid eventId, Guid routeId, UpdateRouteRequest request, CancellationToken ct = default);
    Task DeleteRouteAsync(Guid userId, Guid eventId, Guid routeId, CancellationToken ct = default);

    Task<EvidenceMapDrawingDto> CreateDrawingAsync(Guid userId, Guid eventId, CreateDrawingRequest request, CancellationToken ct = default);
    Task<EvidenceMapDrawingDto> UpdateDrawingAsync(Guid userId, Guid eventId, Guid drawingId, UpdateDrawingRequest request, CancellationToken ct = default);
    Task DeleteDrawingAsync(Guid userId, Guid eventId, Guid drawingId, CancellationToken ct = default);
}

