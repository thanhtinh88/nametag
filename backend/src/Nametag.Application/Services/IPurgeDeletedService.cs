using Nametag.Application.DTOs.Cron;

namespace Nametag.Application.Services;

public interface IPurgeDeletedService
{
    Task<PurgeDeletedResultDto> PurgeDeletedAsync(int retentionDays = 30, CancellationToken cancellationToken = default);
}
