using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class ImmichConnection : BaseEntity
{
    public Guid UserId { get; set; }
    public string ServerUrl { get; set; } = string.Empty;
    public string? PublicUrl { get; set; }
    public string ApiKey { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public string? LastError { get; set; }
    public DateTime? LastCheckedAt { get; set; }

    public User User { get; set; } = null!;
}
