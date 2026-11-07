using Nametag.Application.DTOs.Map;

namespace Nametag.Application.Services;

public interface IMapService
{
    Task<MapMarkersResponseDto> GetMarkersAsync(Guid userId, CancellationToken ct = default);
    Task<object> RetryGeocodeAsync(Guid userId, GeocodeRetryRequest request, CancellationToken ct = default);
}

