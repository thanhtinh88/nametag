using Nametag.Domain.Enums;

namespace Nametag.Application.DTOs.User;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public Theme Theme { get; set; }
    public DateFormat DateFormat { get; set; }
    public string? Language { get; set; }
    public NameOrder NameOrder { get; set; }
    public NameDisplayFormat NameDisplayFormat { get; set; }
    public string? GraphMode { get; set; }
    public bool GeocodingEnabled { get; set; }
    public int DefaultReminderLeadDays { get; set; }
    public bool WeeklyDigestEnabled { get; set; }
    public int WeeklyDigestWeekday { get; set; }
    public string? Photo { get; set; }
    public bool EmailVerified { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string Email { get; set; } = string.Empty;
}

public class UpdateProfileResponse
{
    public UserProfileDto User { get; set; } = null!;
    public bool EmailChanged { get; set; }
}

public class UpdatePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateThemeRequest
{
    public Theme Theme { get; set; }
}

public class UpdateLanguageRequest
{
    public string Language { get; set; } = string.Empty;
}

public class UpdateDateFormatRequest
{
    public DateFormat DateFormat { get; set; }
}

public class UpdateNameOrderRequest
{
    public NameOrder NameOrder { get; set; }
}

public class UpdateNameDisplayFormatRequest
{
    public NameDisplayFormat NameDisplayFormat { get; set; }
}

public class UpdateGraphDisplayRequest
{
    public string? GraphMode { get; set; }
}

public class UpdateGeocodingRequest
{
    public bool GeocodingEnabled { get; set; }
}

public class UpdateReminderLeadDaysRequest
{
    public int Days { get; set; }
}

public class UpdateWeeklyDigestRequest
{
    public bool Enabled { get; set; }
    public int Weekday { get; set; } = 1;
}

public class DeleteAccountRequest
{
    public string? Password { get; set; }
    public string ConfirmationText { get; set; } = string.Empty;
}

