using System.Text.Json.Serialization;

namespace Nametag.Application.DTOs.Cron;

public class PurgedCountsDto
{
    [JsonPropertyName("importantDates")]
    public int ImportantDates { get; set; }

    [JsonPropertyName("personGroups")]
    public int PersonGroups { get; set; }

    [JsonPropertyName("relationships")]
    public int Relationships { get; set; }

    [JsonPropertyName("groups")]
    public int Groups { get; set; }

    [JsonPropertyName("relationshipTypes")]
    public int RelationshipTypes { get; set; }

    [JsonPropertyName("people")]
    public int People { get; set; }
}

public class PurgeDeletedResultDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    [JsonPropertyName("purged")]
    public PurgedCountsDto Purged { get; set; } = new();

    [JsonPropertyName("retentionDays")]
    public int RetentionDays { get; set; }

    [JsonPropertyName("cutoffDate")]
    public string CutoffDate { get; set; } = string.Empty;
}

public class GeocodeCronResultDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    [JsonPropertyName("processed")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Processed { get; set; }

    [JsonPropertyName("geocoded")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Geocoded { get; set; }

    [JsonPropertyName("failed")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Failed { get; set; }

    [JsonPropertyName("pending")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Pending { get; set; }

    [JsonPropertyName("skipped")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Skipped { get; set; }

    [JsonPropertyName("rateLimited")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? RateLimited { get; set; }

    [JsonPropertyName("alreadyRunning")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? AlreadyRunning { get; set; }

    [JsonPropertyName("disabled")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Disabled { get; set; }

    [JsonPropertyName("reason")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Reason { get; set; }
}
