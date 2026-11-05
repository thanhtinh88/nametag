using Nametag.Domain.Common;
using Nametag.Domain.Enums;

namespace Nametag.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public Theme Theme { get; set; } = Theme.DARK;
    public DateFormat DateFormat { get; set; } = DateFormat.MDY;
    public NameOrder NameOrder { get; set; } = NameOrder.WESTERN;
    public NameDisplayFormat NameDisplayFormat { get; set; } = NameDisplayFormat.FULL;
    public string? GraphMode { get; set; }
    public bool GeocodingEnabled { get; set; } = true;
    public string Language { get; set; } = "en";
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockedUntil { get; set; }
    public string? Photo { get; set; }

    // OAuth
    public string? Provider { get; set; }
    public string? ProviderAccountId { get; set; }

    // Refresh Tokens
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

