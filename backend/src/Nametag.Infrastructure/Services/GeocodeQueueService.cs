using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Cron;
using Nametag.Application.Services;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Services;

public class GeocodeQueueService : IGeocodeQueueService
{
    private const int BatchSize = 50;
    private static int _runInProgress = 0; // 0 = idle, 1 = running

    private readonly IAppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeocodeQueueService> _logger;

    public GeocodeQueueService(
        IAppDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GeocodeQueueService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GeocodeCronResultDto> ProcessGeocodeQueueAsync(CancellationToken cancellationToken = default)
    {
        var disabledStr = _configuration["DISABLE_GEOCODING"] ?? _configuration["Geocoding:Disabled"];
        if (bool.TryParse(disabledStr, out var isDisabled) && isDisabled)
        {
            return new GeocodeCronResultDto
            {
                Success = true,
                Disabled = true,
                Reason = "Geocoding disabled"
            };
        }

        // Concurrency lock
        if (Interlocked.CompareExchange(ref _runInProgress, 1, 0) != 0)
        {
            _logger.LogInformation("A geocode run is already in progress");
            return new GeocodeCronResultDto
            {
                Success = true,
                AlreadyRunning = true,
                Reason = "A geocode run is already in progress"
            };
        }

        var stopwatch = Stopwatch.StartNew();
        var cronLog = new CronJobLog
        {
            Id = Guid.CreateVersion7(),
            JobName = "geocode",
            Status = "started",
            ExecutedAt = DateTime.UtcNow
        };
        _context.CronJobLogs.Add(cronLog);
        await _context.SaveChangesAsync(cancellationToken);

        var geocoded = 0;
        var failed = 0;
        var pending = 0;
        var skipped = 0;
        var rateLimited = false;

        try
        {
            var addresses = await _context.PersonAddresses
                .Include(a => a.Person)
                    .ThenInclude(p => p.User)
                .Where(a => (a.GeocodeStatus == null || a.GeocodeStatus == "pending")
                    && a.Person.DeletedAt == null
                    && a.Person.User.GeocodingEnabled)
                .OrderBy(a => a.CreatedAt)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Processing geocode queue: {Count} addresses", addresses.Count);

            var geocoderUrl = (_configuration["GEOCODER_URL"] ?? _configuration["Geocoding:Url"] ?? "https://nominatim.openstreetmap.org").TrimEnd('/');
            using var client = _httpClientFactory.CreateClient("Geocoder");
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Nametag (+https://github.com/mattogodoy/nametag)");
            client.DefaultRequestHeaders.Accept.ParseAdd("application/json");

            foreach (var address in addresses)
            {
                if (address.GeocodeStatus == "success" && address.Latitude != null && address.Longitude != null && address.GeocodeHash == "manual")
                {
                    skipped++;
                    continue;
                }

                var hash = AddressHashHelper.BuildAddressHash(
                    address.StreetLine1,
                    address.StreetLine2,
                    address.Locality,
                    address.Region,
                    address.PostalCode,
                    address.Country);

                if (!AddressHashHelper.HasGeocodableContent(
                    address.StreetLine1,
                    address.StreetLine2,
                    address.Locality,
                    address.Region,
                    address.PostalCode,
                    address.Country))
                {
                    if (address.GeocodeStatus != "failed")
                    {
                        address.GeocodeStatus = "failed";
                        address.GeocodedAt = DateTime.UtcNow;
                        address.GeocodeHash = hash;
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                    skipped++;
                    continue;
                }

                var alreadyResolved = address.GeocodeStatus is "success" or "failed";
                if (alreadyResolved && address.GeocodeHash == hash)
                {
                    skipped++;
                    continue;
                }

                // Check cache
                var cached = await _context.GeocodeCaches.FirstOrDefaultAsync(c => c.Hash == hash, cancellationToken);
                if (cached != null)
                {
                    address.Latitude = cached.Latitude;
                    address.Longitude = cached.Longitude;
                    address.GeocodeStatus = cached.Status;
                    address.GeocodedAt = DateTime.UtcNow;
                    address.GeocodeHash = hash;
                    await _context.SaveChangesAsync(cancellationToken);

                    if (cached.Status == "success") geocoded++;
                    else failed++;
                    continue;
                }

                // Call geocoding service
                try
                {
                    var (lat, lon, is429) = await CallGeocoderAsync(client, geocoderUrl, address, cancellationToken);
                    if (is429)
                    {
                        address.GeocodeStatus = "pending";
                        await _context.SaveChangesAsync(cancellationToken);
                        rateLimited = true;
                        pending++;
                        _logger.LogWarning("Geocoder rate limited (429), stopping batch early");
                        break;
                    }

                    var status = (lat != null && lon != null) ? "success" : "failed";
                    address.Latitude = lat;
                    address.Longitude = lon;
                    address.GeocodeStatus = status;
                    address.GeocodedAt = DateTime.UtcNow;
                    address.GeocodeHash = hash;

                    var existingCache = await _context.GeocodeCaches.FirstOrDefaultAsync(c => c.Hash == hash, cancellationToken);
                    if (existingCache != null)
                    {
                        existingCache.Latitude = lat;
                        existingCache.Longitude = lon;
                        existingCache.Status = status;
                        existingCache.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        _context.GeocodeCaches.Add(new GeocodeCache
                        {
                            Hash = hash,
                            Latitude = lat,
                            Longitude = lon,
                            Status = status,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }

                    await _context.SaveChangesAsync(cancellationToken);

                    if (status == "success") geocoded++;
                    else failed++;

                    // Rate limit polite delay (1s)
                    try
                    {
                        await Task.Delay(1000, cancellationToken);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Failed to geocode address {AddressId}", address.Id);
                    address.GeocodeStatus = "pending";
                    await _context.SaveChangesAsync(cancellationToken);
                    pending++;
                }
            }

            stopwatch.Stop();
            var durationMs = (int)stopwatch.ElapsedMilliseconds;
            var processed = geocoded + failed + pending + skipped;

            cronLog.Status = pending > 0 ? "completed_with_errors" : "completed";
            cronLog.Duration = durationMs;
            cronLog.Message = $"Processed {processed} of {addresses.Count} addresses: {geocoded} geocoded, {failed} failed, {pending} pending, {skipped} skipped{(rateLimited ? " (stopped early: provider rate limited)" : "")}";
            await _context.SaveChangesAsync(cancellationToken);

            return new GeocodeCronResultDto
            {
                Success = true,
                Processed = processed,
                Geocoded = geocoded,
                Failed = failed,
                Pending = pending,
                Skipped = skipped,
                RateLimited = rateLimited
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            cronLog.Status = "failed";
            cronLog.Duration = (int)stopwatch.ElapsedMilliseconds;
            cronLog.Message = ex.Message;
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogError(ex, "Geocode cron job failed");
            throw;
        }
        finally
        {
            Interlocked.Exchange(ref _runInProgress, 0);
        }
    }

    private static async Task<(double? Latitude, double? Longitude, bool Is429)> CallGeocoderAsync(
        HttpClient client,
        string geocoderUrl,
        PersonAddress address,
        CancellationToken ct)
    {
        // 1. Structured query
        var queryParams = new List<string> { "format=jsonv2", "limit=1" };
        if (!string.IsNullOrWhiteSpace(address.StreetLine1)) queryParams.Add($"street={Uri.EscapeDataString(address.StreetLine1)}");
        if (!string.IsNullOrWhiteSpace(address.Locality)) queryParams.Add($"city={Uri.EscapeDataString(address.Locality)}");
        if (!string.IsNullOrWhiteSpace(address.Region)) queryParams.Add($"state={Uri.EscapeDataString(address.Region)}");
        if (!string.IsNullOrWhiteSpace(address.PostalCode)) queryParams.Add($"postalcode={Uri.EscapeDataString(address.PostalCode)}");
        if (!string.IsNullOrWhiteSpace(address.Country)) queryParams.Add($"country={Uri.EscapeDataString(address.Country)}");

        var url = $"{geocoderUrl}/search?{string.Join('&', queryParams)}";
        var (lat, lon, is429) = await ExecuteSearchAsync(client, url, ct);
        if (is429) return (null, null, true);
        if (lat != null && lon != null) return (lat, lon, false);

        // 2. Free-text fallback
        var nonNullParts = new[] { address.StreetLine1, address.StreetLine2, address.Locality, address.Region, address.PostalCode, address.Country }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();
        if (nonNullParts.Count > 0)
        {
            var freeText = string.Join(", ", nonNullParts);
            var freeTextUrl = $"{geocoderUrl}/search?format=jsonv2&limit=1&q={Uri.EscapeDataString(freeText)}";
            return await ExecuteSearchAsync(client, freeTextUrl, ct);
        }

        return (null, null, false);
    }

    private static async Task<(double? Latitude, double? Longitude, bool Is429)> ExecuteSearchAsync(
        HttpClient client,
        string url,
        CancellationToken ct)
    {
        using var response = await client.GetAsync(url, ct);
        if ((int)response.StatusCode == 429)
        {
            return (null, null, true);
        }

        if (!response.IsSuccessStatusCode)
        {
            return (null, null, false);
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                if (first.TryGetProperty("lat", out var latProp) && first.TryGetProperty("lon", out var lonProp))
                {
                    var latStr = latProp.GetString();
                    var lonStr = lonProp.GetString();
                    if (double.TryParse(latStr, CultureInfo.InvariantCulture, out var lat) &&
                        double.TryParse(lonStr, CultureInfo.InvariantCulture, out var lon))
                    {
                        return (lat, lon, false);
                    }
                }
            }
        }
        catch
        {
            // Invalid JSON or format
        }

        return (null, null, false);
    }
}
