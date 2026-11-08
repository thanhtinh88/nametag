using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[ApiController]
[Route("api/cron")]
[AllowAnonymous]
public class CronController : ControllerBase
{
    private readonly IPurgeDeletedService _purgeDeletedService;
    private readonly IGeocodeQueueService _geocodeQueueService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CronController> _logger;

    public CronController(
        IPurgeDeletedService purgeDeletedService,
        IGeocodeQueueService geocodeQueueService,
        IConfiguration configuration,
        ILogger<CronController> logger)
    {
        _purgeDeletedService = purgeDeletedService;
        _geocodeQueueService = geocodeQueueService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("purge-deleted")]
    public async Task<IActionResult> PurgeDeleted(CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return Unauthorized(new { error = "Unauthorized" });
        }

        var result = await _purgeDeletedService.PurgeDeletedAsync(30, cancellationToken);
        return Ok(result);
    }

    [HttpGet("geocode")]
    public async Task<IActionResult> Geocode(CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            return Unauthorized(new { error = "Unauthorized" });
        }

        var result = await _geocodeQueueService.ProcessGeocodeQueueAsync(cancellationToken);
        return Ok(result);
    }

    private bool IsAuthorized()
    {
        var expectedSecret = _configuration["CRON_SECRET"] ?? _configuration["Cron:Secret"];
        if (string.IsNullOrEmpty(expectedSecret))
        {
            return false;
        }

        if (!Request.Headers.TryGetValue("Authorization", out var authHeaderValues))
        {
            return false;
        }

        var header = authHeaderValues.ToString().Trim();
        const string prefix = "Bearer ";
        if (!header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var providedSecret = header[prefix.Length..].Trim();
        var expectedBytes = Encoding.UTF8.GetBytes(expectedSecret);
        var providedBytes = Encoding.UTF8.GetBytes(providedSecret);

        if (expectedBytes.Length != providedBytes.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
    }
}
