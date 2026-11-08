using Nametag.Application.DTOs.Cron;

namespace Nametag.Application.Services;

public interface IGeocodeQueueService
{
    Task<GeocodeCronResultDto> ProcessGeocodeQueueAsync(CancellationToken cancellationToken = default);
}
