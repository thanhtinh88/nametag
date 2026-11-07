using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Map;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MapController : ControllerBase
{
    private readonly IMapService _mapService;
    private readonly ICurrentUserService _currentUserService;

    public MapController(
        IMapService mapService,
        ICurrentUserService currentUserService)
    {
        _mapService = mapService;
        _currentUserService = currentUserService;
    }

    private Guid GetUserId()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new UnauthorizedException("Unauthorized");
        }
        return userId.Value;
    }

    [HttpGet("markers")]
    public async Task<IActionResult> GetMarkers()
    {
        var result = await _mapService.GetMarkersAsync(GetUserId());
        return Ok(result);
    }

    [HttpPost("geocode-retry")]
    public async Task<IActionResult> RetryGeocode([FromBody] GeocodeRetryRequest request)
    {
        var result = await _mapService.RetryGeocodeAsync(GetUserId(), request);
        return Ok(result);
    }
}

