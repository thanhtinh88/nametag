namespace Nametag.Application.DTOs.Immich;

public class ImmichConnectionDto
{
    public string ServerUrl { get; set; } = string.Empty;
    public string? PublicUrl { get; set; }
    public bool Enabled { get; set; }
    public bool HasApiKey { get; set; }
    public string? LastError { get; set; }
    public DateTime? LastCheckedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class SaveImmichConnectionRequest
{
    public string ServerUrl { get; set; } = string.Empty;
    public string? PublicUrl { get; set; }
    public string? ApiKey { get; set; }
    public bool? Enabled { get; set; }
}

public class TestImmichConnectionRequest
{
    public string? ServerUrl { get; set; }
    public string? ApiKey { get; set; }
}

public class TestImmichConnectionResponse
{
    public bool Ok { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? Version { get; set; }
    public string? Error { get; set; }
}

public class ImmichAssetDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "IMAGE";
    public string? OriginalFileName { get; set; }
    public string? TakenAt { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Camera { get; set; }
}

public class ImmichPersonSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class ImmichAlbumSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string AlbumName { get; set; } = string.Empty;
    public int AssetCount { get; set; }
}

public class PersonImmichLinkRequest
{
    public string? ImmichPersonId { get; set; }
    public string? ImmichAlbumId { get; set; }
}

public class EventImmichLinkRequest
{
    public string? ImmichAlbumId { get; set; }
}

public class ImmichSetPhotoRequest
{
    public string AssetId { get; set; } = string.Empty;
}

public class ImmichBinaryStreamResult
{
    public Stream Stream { get; set; } = null!;
    public string? ContentType { get; set; }
    public long? ContentLength { get; set; }
    public int StatusCode { get; set; } = 200;
    public IDictionary<string, string> Headers { get; set; } = new Dictionary<string, string>();
}
