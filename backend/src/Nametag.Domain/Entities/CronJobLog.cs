using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class CronJobLog : BaseEntity
{
    public string JobName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
    public int? Duration { get; set; }
}
