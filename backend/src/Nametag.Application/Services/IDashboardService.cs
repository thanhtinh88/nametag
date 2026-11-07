using Nametag.Application.DTOs.Dashboard;

namespace Nametag.Application.Services;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetStatsAsync(Guid userId, CancellationToken ct = default);
    Task<DashboardGraphDto> GetGraphAsync(Guid userId, DashboardGraphQuery query, CancellationToken ct = default);
}

