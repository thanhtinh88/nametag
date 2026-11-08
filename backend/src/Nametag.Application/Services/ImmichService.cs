using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Immich;
using Nametag.Domain.Entities;

namespace Nametag.Application.Services;

public partial class ImmichService : IImmichService
{
    private readonly IAppDbContext _db;
    private readonly ISecretEncryptionService _crypto;
    private readonly IPhotoStorageService _photoStorage;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ImmichService> _logger;

    private static readonly Regex ImmichIdRegex = GeneratedImmichIdRegex();

    [GeneratedRegex("^[A-Za-z0-9-]{1,64}$")]
    private static partial Regex GeneratedImmichIdRegex();

    public ImmichService(
        IAppDbContext db,
        ISecretEncryptionService crypto,
        IPhotoStorageService photoStorage,
        HttpClient httpClient,
        ILogger<ImmichService> logger)
    {
        _db = db;
        _crypto = crypto;
        _photoStorage = photoStorage;
        _httpClient = httpClient;
        _logger = logger;
    }

    public static string NormalizeImmichUrl(string url)
    {
        var outUrl = url.Trim().TrimEnd('/');
        if (outUrl.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
            outUrl = outUrl[..^4];
        return outUrl;
    }

    public static void ValidateImmichUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url) || (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
            throw new BadRequestException("Invalid URL format");

        if (!Uri.TryCreate(url, UriKind.Absolute, out _))
            throw new BadRequestException("Invalid URL");
    }

    public static bool IsValidImmichId(string? id)
    {
        return !string.IsNullOrWhiteSpace(id) && ImmichIdRegex.IsMatch(id);
    }

    private async Task<(string ServerUrl, string? PublicUrl, string ApiKey)> GetImmichConfigAsync(Guid userId, CancellationToken ct)
    {
        var connection = await _db.ImmichConnections
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId, ct);

        if (connection == null || !connection.Enabled)
            throw new ImmichNotConfiguredException();

        try
        {
            var serverUrl = NormalizeImmichUrl(connection.ServerUrl);
            var publicUrl = !string.IsNullOrWhiteSpace(connection.PublicUrl) ? NormalizeImmichUrl(connection.PublicUrl) : null;
            var apiKey = _crypto.DecryptSecret(connection.ApiKey);
            return (serverUrl, publicUrl, apiKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt Immich API key for user {UserId}", userId);
            throw new ImmichNotConfiguredException();
        }
    }

    public async Task<ImmichConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken ct = default)
    {
        var connection = await _db.ImmichConnections
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId, ct);

        if (connection == null)
            return null;

        return new ImmichConnectionDto
        {
            ServerUrl = connection.ServerUrl,
            PublicUrl = connection.PublicUrl,
            Enabled = connection.Enabled,
            HasApiKey = true,
            LastError = connection.LastError,
            LastCheckedAt = connection.LastCheckedAt,
            UpdatedAt = connection.UpdatedAt
        };
    }

    public async Task<ImmichConnectionDto> SaveConnectionAsync(Guid userId, SaveImmichConnectionRequest request, CancellationToken ct = default)
    {
        ValidateImmichUrl(request.ServerUrl);
        if (!string.IsNullOrWhiteSpace(request.PublicUrl))
            ValidateImmichUrl(request.PublicUrl);

        var normalizedServerUrl = NormalizeImmichUrl(request.ServerUrl);
        var normalizedPublicUrl = !string.IsNullOrWhiteSpace(request.PublicUrl) ? NormalizeImmichUrl(request.PublicUrl) : null;

        var existing = await _db.ImmichConnections.FirstOrDefaultAsync(c => c.UserId == userId, ct);
        if (existing == null && string.IsNullOrWhiteSpace(request.ApiKey))
            throw new BadRequestException("API key is required");

        if (existing == null)
        {
            existing = new ImmichConnection
            {
                UserId = userId,
                ServerUrl = normalizedServerUrl,
                PublicUrl = normalizedPublicUrl,
                ApiKey = _crypto.EncryptSecret(request.ApiKey!),
                Enabled = request.Enabled ?? true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.ImmichConnections.Add(existing);
        }
        else
        {
            existing.ServerUrl = normalizedServerUrl;
            existing.PublicUrl = normalizedPublicUrl;
            if (!string.IsNullOrWhiteSpace(request.ApiKey))
                existing.ApiKey = _crypto.EncryptSecret(request.ApiKey);
            if (request.Enabled.HasValue)
                existing.Enabled = request.Enabled.Value;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        return new ImmichConnectionDto
        {
            ServerUrl = existing.ServerUrl,
            PublicUrl = existing.PublicUrl,
            Enabled = existing.Enabled,
            HasApiKey = true,
            LastError = existing.LastError,
            LastCheckedAt = existing.LastCheckedAt,
            UpdatedAt = existing.UpdatedAt
        };
    }

    public async Task DeleteConnectionAsync(Guid userId, CancellationToken ct = default)
    {
        var existing = await _db.ImmichConnections.FirstOrDefaultAsync(c => c.UserId == userId, ct);
        if (existing != null)
        {
            _db.ImmichConnections.Remove(existing);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<TestImmichConnectionResponse> TestConnectionAsync(Guid userId, TestImmichConnectionRequest request, CancellationToken ct = default)
    {
        var saved = await _db.ImmichConnections.FirstOrDefaultAsync(c => c.UserId == userId, ct);

        string? serverUrl = !string.IsNullOrWhiteSpace(request.ServerUrl)
            ? NormalizeImmichUrl(request.ServerUrl)
            : saved?.ServerUrl;

        string? apiKey = !string.IsNullOrWhiteSpace(request.ApiKey)
            ? request.ApiKey
            : (saved != null ? _crypto.DecryptSecret(saved.ApiKey) : null);

        if (string.IsNullOrWhiteSpace(serverUrl) || string.IsNullOrWhiteSpace(apiKey))
            throw new BadRequestException("Server URL and API key are required");

        ValidateImmichUrl(serverUrl);

        bool isSavedTarget = saved != null && saved.ServerUrl == serverUrl;

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{serverUrl}/api/users/me");
            req.Headers.Add("x-api-key", apiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var resp = await _httpClient.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var msg = resp.StatusCode == System.Net.HttpStatusCode.Unauthorized || resp.StatusCode == System.Net.HttpStatusCode.Forbidden
                    ? "Immich rejected the API key"
                    : $"Immich responded with HTTP {(int)resp.StatusCode}";
                throw new ImmichException(msg, (int)resp.StatusCode);
            }

            var json = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            string userName = root.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
            string email = root.TryGetProperty("email", out var e) ? e.GetString() ?? "" : "";

            string? version = null;
            try
            {
                using var aboutReq = new HttpRequestMessage(HttpMethod.Get, $"{serverUrl}/api/server/about");
                aboutReq.Headers.Add("x-api-key", apiKey);
                using var aboutResp = await _httpClient.SendAsync(aboutReq, ct);
                if (aboutResp.IsSuccessStatusCode)
                {
                    var aboutJson = await aboutResp.Content.ReadAsStringAsync(ct);
                    using var aboutDoc = JsonDocument.Parse(aboutJson);
                    if (aboutDoc.RootElement.TryGetProperty("version", out var v))
                        version = v.GetString();
                }
            }
            catch { }

            if (isSavedTarget && saved != null)
            {
                saved.LastError = null;
                saved.LastCheckedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }

            return new TestImmichConnectionResponse
            {
                Ok = true,
                UserName = userName,
                Email = email,
                Version = version
            };
        }
        catch (Exception ex)
        {
            var msg = ex is ImmichException ie ? ie.Message : "Connection failed";
            if (isSavedTarget && saved != null)
            {
                saved.LastError = msg;
                saved.LastCheckedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
            return new TestImmichConnectionResponse { Ok = false, Error = msg };
        }
    }

    public async Task<(List<ImmichAssetDto> Assets, string PublicUrl)> GetAssetsAsync(Guid userId, string? personId, string? albumId, CancellationToken ct = default)
    {
        if (personId != null && !IsValidImmichId(personId)) throw new BadRequestException("Invalid personId");
        if (albumId != null && !IsValidImmichId(albumId)) throw new BadRequestException("Invalid albumId");
        if (string.IsNullOrWhiteSpace(personId) && string.IsNullOrWhiteSpace(albumId))
            throw new BadRequestException("personId or albumId is required");

        var config = await GetImmichConfigAsync(userId, ct);

        var personAssets = new List<ImmichAssetDto>();
        var albumAssets = new List<ImmichAssetDto>();

        if (!string.IsNullOrWhiteSpace(personId))
        {
            personAssets = await ListAssetsForPersonAsync(config.ServerUrl, config.ApiKey, personId, ct);
        }

        if (!string.IsNullOrWhiteSpace(albumId))
        {
            albumAssets = await ListAssetsForAlbumAsync(config.ServerUrl, config.ApiKey, albumId, ct);
        }

        var seen = new HashSet<string>();
        var merged = new List<ImmichAssetDto>();

        foreach (var item in personAssets.Concat(albumAssets))
        {
            if (seen.Add(item.Id))
                merged.Add(item);
        }

        merged.Sort((a, b) => string.Compare(b.TakenAt, a.TakenAt, StringComparison.Ordinal));
        return (merged, config.PublicUrl ?? config.ServerUrl);
    }

    public async Task<List<ImmichAlbumSummaryDto>> GetAlbumsAsync(Guid userId, CancellationToken ct = default)
    {
        var config = await GetImmichConfigAsync(userId, ct);

        using var req = new HttpRequestMessage(HttpMethod.Get, $"{config.ServerUrl}/api/albums");
        req.Headers.Add("x-api-key", config.ApiKey);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var resp = await _httpClient.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
            throw new ImmichException($"Immich responded with HTTP {(int)resp.StatusCode}", (int)resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);

        var list = new List<ImmichAlbumSummaryDto>();
        foreach (var el in doc.RootElement.EnumerateArray())
        {
            list.Add(new ImmichAlbumSummaryDto
            {
                Id = el.GetProperty("id").GetString() ?? "",
                AlbumName = el.TryGetProperty("albumName", out var an) ? an.GetString() ?? "" : "",
                AssetCount = el.TryGetProperty("assetCount", out var ac) ? ac.GetInt32() : 0
            });
        }

        list.Sort((a, b) => string.Compare(a.AlbumName, b.AlbumName, StringComparison.OrdinalIgnoreCase));
        return list;
    }

    public async Task<List<ImmichPersonSummaryDto>> GetPeopleAsync(Guid userId, string? query, CancellationToken ct = default)
    {
        var config = await GetImmichConfigAsync(userId, ct);

        string path = !string.IsNullOrWhiteSpace(query)
            ? $"/api/search/person?name={Uri.EscapeDataString(query.Trim())}&withHidden=false"
            : "/api/people?withHidden=false&size=500";

        using var req = new HttpRequestMessage(HttpMethod.Get, $"{config.ServerUrl}{path}");
        req.Headers.Add("x-api-key", config.ApiKey);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var resp = await _httpClient.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
            throw new ImmichException($"Immich responded with HTTP {(int)resp.StatusCode}", (int)resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);

        var list = new List<ImmichPersonSummaryDto>();
        var root = doc.RootElement;

        var array = root.ValueKind == JsonValueKind.Array
            ? root
            : (root.TryGetProperty("people", out var pArr) ? pArr : default);

        if (array.ValueKind == JsonValueKind.Array)
        {
            foreach (var el in array.EnumerateArray())
            {
                list.Add(new ImmichPersonSummaryDto
                {
                    Id = el.GetProperty("id").GetString() ?? "",
                    Name = el.TryGetProperty("name", out var n) ? n.GetString() ?? "" : ""
                });
            }
        }

        return list;
    }

    public async Task<ImmichBinaryStreamResult> StreamAssetBinaryAsync(Guid userId, string assetId, string variant, string? rangeHeader, CancellationToken ct = default)
    {
        if (!IsValidImmichId(assetId))
            throw new BadRequestException("Invalid assetId");

        var config = await GetImmichConfigAsync(userId, ct);

        string path = variant switch
        {
            "thumbnail" => $"/api/assets/{assetId}/thumbnail?size=thumbnail",
            "preview" => $"/api/assets/{assetId}/thumbnail?size=preview",
            "original" => $"/api/assets/{assetId}/original",
            "video" => $"/api/assets/{assetId}/video/playback",
            _ => throw new BadRequestException("Invalid variant")
        };

        int cacheSeconds = variant is "thumbnail" or "preview" ? 86400 : 3600;

        using var req = new HttpRequestMessage(HttpMethod.Get, $"{config.ServerUrl}{path}");
        req.Headers.Add("x-api-key", config.ApiKey);
        if (!string.IsNullOrWhiteSpace(rangeHeader))
            req.Headers.Add("Range", rangeHeader);

        var resp = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!resp.IsSuccessStatusCode && resp.StatusCode != System.Net.HttpStatusCode.PartialContent)
        {
            throw new ImmichException($"Failed to fetch asset from Immich (HTTP {(int)resp.StatusCode})", (int)resp.StatusCode);
        }

        var stream = await resp.Content.ReadAsStreamAsync(ct);
        var result = new ImmichBinaryStreamResult
        {
            Stream = stream,
            StatusCode = (int)resp.StatusCode,
            ContentType = resp.Content.Headers.ContentType?.ToString(),
            ContentLength = resp.Content.Headers.ContentLength
        };

        result.Headers["Cache-Control"] = $"private, max-age={cacheSeconds}";
        result.Headers["X-Content-Type-Options"] = "nosniff";

        if (resp.Headers.ETag != null) result.Headers["ETag"] = resp.Headers.ETag.ToString();
        if (resp.Content.Headers.LastModified.HasValue)
            result.Headers["Last-Modified"] = resp.Content.Headers.LastModified.Value.ToString("R");
        if (resp.Content.Headers.ContentRange != null)
            result.Headers["Content-Range"] = resp.Content.Headers.ContentRange.ToString();
        if (resp.Headers.AcceptRanges.Count > 0)
            result.Headers["Accept-Ranges"] = string.Join(", ", resp.Headers.AcceptRanges);

        return result;
    }

    public async Task<ImmichBinaryStreamResult> StreamPersonThumbnailAsync(Guid userId, string immichPersonId, CancellationToken ct = default)
    {
        if (!IsValidImmichId(immichPersonId))
            throw new BadRequestException("Invalid immichPersonId");

        var config = await GetImmichConfigAsync(userId, ct);

        using var req = new HttpRequestMessage(HttpMethod.Get, $"{config.ServerUrl}/api/people/{immichPersonId}/thumbnail");
        req.Headers.Add("x-api-key", config.ApiKey);

        var resp = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!resp.IsSuccessStatusCode)
        {
            throw new ImmichException($"Failed to fetch thumbnail from Immich (HTTP {(int)resp.StatusCode})", (int)resp.StatusCode);
        }

        var stream = await resp.Content.ReadAsStreamAsync(ct);
        var result = new ImmichBinaryStreamResult
        {
            Stream = stream,
            StatusCode = (int)resp.StatusCode,
            ContentType = resp.Content.Headers.ContentType?.ToString(),
            ContentLength = resp.Content.Headers.ContentLength
        };

        result.Headers["Cache-Control"] = "private, max-age=3600";
        result.Headers["X-Content-Type-Options"] = "nosniff";

        return result;
    }

    public async Task<object> LinkPersonImmichAsync(Guid userId, Guid personId, PersonImmichLinkRequest request, CancellationToken ct = default)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct)
            ?? throw new NotFoundException("Person");

        if (request.ImmichPersonId != null)
            person.ImmichPersonId = string.IsNullOrWhiteSpace(request.ImmichPersonId) ? null : request.ImmichPersonId.Trim();

        if (request.ImmichAlbumId != null)
            person.ImmichAlbumId = string.IsNullOrWhiteSpace(request.ImmichAlbumId) ? null : request.ImmichAlbumId.Trim();

        await _db.SaveChangesAsync(ct);

        return new
        {
            id = person.Id,
            immichPersonId = person.ImmichPersonId,
            immichAlbumId = person.ImmichAlbumId
        };
    }

    public async Task<(string Filename, string PhotoUrl)> SetPersonPhotoFromImmichAsync(Guid userId, Guid personId, string assetId, CancellationToken ct = default)
    {
        if (!IsValidImmichId(assetId))
            throw new BadRequestException("Invalid assetId");

        var person = await _db.People.FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, ct)
            ?? throw new NotFoundException("Person");

        var config = await GetImmichConfigAsync(userId, ct);

        using var req = new HttpRequestMessage(HttpMethod.Get, $"{config.ServerUrl}/api/assets/{Uri.EscapeDataString(assetId)}/thumbnail?size=preview");
        req.Headers.Add("x-api-key", config.ApiKey);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("image/*"));

        using var resp = await _httpClient.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
            throw new ImmichException($"Failed to fetch asset from Immich (HTTP {(int)resp.StatusCode})", (int)resp.StatusCode);

        using var stream = await resp.Content.ReadAsStreamAsync(ct);
        var filename = await _photoStorage.SavePersonPhotoAsync(userId, personId, stream, ct);

        person.Photo = filename;
        await _db.SaveChangesAsync(ct);

        var photoUrl = $"/api/photos/{filename}?t={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        return (filename, photoUrl);
    }

    public async Task<object> LinkEventImmichAsync(Guid userId, Guid eventId, EventImmichLinkRequest request, CancellationToken ct = default)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId && e.DeletedAt == null, ct)
            ?? throw new NotFoundException("Event");

        if (request.ImmichAlbumId != null)
            ev.ImmichAlbumId = string.IsNullOrWhiteSpace(request.ImmichAlbumId) ? null : request.ImmichAlbumId.Trim();

        await _db.SaveChangesAsync(ct);

        return new
        {
            id = ev.Id,
            immichAlbumId = ev.ImmichAlbumId
        };
    }

    private async Task<List<ImmichAssetDto>> ListAssetsForPersonAsync(string serverUrl, string apiKey, string personId, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new
        {
            personIds = new[] { personId },
            size = 200,
            withExif = true,
            order = "desc"
        });

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{serverUrl}/api/search/metadata")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        req.Headers.Add("x-api-key", apiKey);

        using var resp = await _httpClient.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode) return new List<ImmichAssetDto>();

        var json = await resp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);

        var list = new List<ImmichAssetDto>();
        if (doc.RootElement.TryGetProperty("assets", out var assetsObj) &&
            assetsObj.TryGetProperty("items", out var items) &&
            items.ValueKind == JsonValueKind.Array)
        {
            foreach (var el in items.EnumerateArray())
                list.Add(MapRawAsset(el));
        }

        return list;
    }

    private async Task<List<ImmichAssetDto>> ListAssetsForAlbumAsync(string serverUrl, string apiKey, string albumId, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{serverUrl}/api/albums/{albumId}?withoutAssets=false");
        req.Headers.Add("x-api-key", apiKey);

        using var resp = await _httpClient.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode) return new List<ImmichAssetDto>();

        var json = await resp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);

        var list = new List<ImmichAssetDto>();
        if (doc.RootElement.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array && assets.GetArrayLength() > 0)
        {
            foreach (var el in assets.EnumerateArray())
                list.Add(MapRawAsset(el));
            return list;
        }

        return await ListAssetsForPersonAsync(serverUrl, apiKey, albumId, ct);
    }

    private static ImmichAssetDto MapRawAsset(JsonElement raw)
    {
        string id = raw.GetProperty("id").GetString() ?? "";
        string type = raw.TryGetProperty("type", out var t) ? t.GetString() ?? "IMAGE" : "IMAGE";
        string? originalFileName = raw.TryGetProperty("originalFileName", out var fn) ? fn.GetString() : null;

        string? takenAt = null;
        double? lat = null;
        double? lon = null;
        string? city = null;
        string? country = null;
        string? camera = null;

        if (raw.TryGetProperty("exifInfo", out var exif) && exif.ValueKind == JsonValueKind.Object)
        {
            if (exif.TryGetProperty("dateTimeOriginal", out var dt)) takenAt = dt.GetString();
            if (exif.TryGetProperty("latitude", out var lt) && lt.ValueKind == JsonValueKind.Number) lat = lt.GetDouble();
            if (exif.TryGetProperty("longitude", out var lg) && lg.ValueKind == JsonValueKind.Number) lon = lg.GetDouble();
            if (exif.TryGetProperty("city", out var ct)) city = ct.GetString();
            if (exif.TryGetProperty("country", out var cn)) country = cn.GetString();

            string? make = exif.TryGetProperty("make", out var mk) ? mk.GetString() : null;
            string? model = exif.TryGetProperty("model", out var md) ? md.GetString() : null;
            camera = string.Join(" ", new[] { make, model }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
            if (string.IsNullOrEmpty(camera)) camera = null;
        }

        if (takenAt == null && raw.TryGetProperty("localDateTime", out var ldt)) takenAt = ldt.GetString();
        if (takenAt == null && raw.TryGetProperty("fileCreatedAt", out var fct)) takenAt = fct.GetString();

        return new ImmichAssetDto
        {
            Id = id,
            Type = type,
            OriginalFileName = originalFileName,
            TakenAt = takenAt,
            Latitude = lat,
            Longitude = lon,
            City = city,
            Country = country,
            Camera = camera
        };
    }
}
