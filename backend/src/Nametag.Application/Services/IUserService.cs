using Nametag.Application.DTOs.User;
using Nametag.Domain.Enums;

namespace Nametag.Application.Services;

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UpdateProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task ChangePasswordAsync(Guid userId, UpdatePasswordRequest request);
    Task<Theme> UpdateThemeAsync(Guid userId, Theme theme);
    Task<string> UpdateLanguageAsync(Guid userId, string language);
    Task<DateFormat> UpdateDateFormatAsync(Guid userId, DateFormat dateFormat);
    Task<NameOrder> UpdateNameOrderAsync(Guid userId, NameOrder nameOrder);
    Task<NameDisplayFormat> UpdateNameDisplayFormatAsync(Guid userId, NameDisplayFormat format);
    Task<string?> UpdateGraphDisplayAsync(Guid userId, string? graphMode);
    Task<bool> UpdateGeocodingAsync(Guid userId, bool geocodingEnabled);
    Task<int> UpdateReminderLeadDaysAsync(Guid userId, int days);
    Task<(bool enabled, int weekday)> UpdateWeeklyDigestAsync(Guid userId, bool enabled, int weekday);
    Task DeleteAccountAsync(Guid userId, DeleteAccountRequest request);
}

