using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.User;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IUserExportImportService _exportImportService;
    private readonly ICurrentUserService _currentUserService;

    public UserController(
        IUserService userService,
        IUserExportImportService exportImportService,
        ICurrentUserService currentUserService)
    {
        _userService = userService;
        _exportImportService = exportImportService;
        _currentUserService = currentUserService;
    }

    private Guid GetUserId()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new UnauthorizedException("Unauthorized");
        }
        return userId.Value;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await _userService.GetProfileAsync(GetUserId());
        return Ok(new { user = profile });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var response = await _userService.UpdateProfileAsync(GetUserId(), request);
        return Ok(response);
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] UpdatePasswordRequest request)
    {
        await _userService.ChangePasswordAsync(GetUserId(), request);
        return Ok(new { message = "Password changed successfully" });
    }

    [HttpPut("theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateThemeRequest request)
    {
        var userId = GetUserId();
        var theme = await _userService.UpdateThemeAsync(userId, request.Theme);
        return Ok(new { user = new { id = userId, theme } });
    }

    [HttpPut("language")]
    public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageRequest request)
    {
        var userId = GetUserId();
        var language = await _userService.UpdateLanguageAsync(userId, request.Language);
        return Ok(new { success = true, language });
    }

    [HttpPut("date-format")]
    public async Task<IActionResult> UpdateDateFormat([FromBody] UpdateDateFormatRequest request)
    {
        var userId = GetUserId();
        var dateFormat = await _userService.UpdateDateFormatAsync(userId, request.DateFormat);
        return Ok(new { user = new { id = userId, dateFormat } });
    }

    [HttpPut("name-order")]
    public async Task<IActionResult> UpdateNameOrder([FromBody] UpdateNameOrderRequest request)
    {
        var userId = GetUserId();
        var nameOrder = await _userService.UpdateNameOrderAsync(userId, request.NameOrder);
        return Ok(new { user = new { id = userId, nameOrder } });
    }

    [HttpPut("name-display-format")]
    public async Task<IActionResult> UpdateNameDisplayFormat([FromBody] UpdateNameDisplayFormatRequest request)
    {
        var userId = GetUserId();
        var format = await _userService.UpdateNameDisplayFormatAsync(userId, request.NameDisplayFormat);
        return Ok(new { user = new { id = userId, nameDisplayFormat = format } });
    }

    [HttpPut("graph-display")]
    public async Task<IActionResult> UpdateGraphDisplay([FromBody] UpdateGraphDisplayRequest request)
    {
        var userId = GetUserId();
        var graphMode = await _userService.UpdateGraphDisplayAsync(userId, request.GraphMode);
        return Ok(new { user = new { id = userId, graphMode } });
    }

    [HttpPut("geocoding")]
    public async Task<IActionResult> UpdateGeocoding([FromBody] UpdateGeocodingRequest request)
    {
        var userId = GetUserId();
        var geocodingEnabled = await _userService.UpdateGeocodingAsync(userId, request.GeocodingEnabled);
        return Ok(new { user = new { id = userId, geocodingEnabled } });
    }

    [HttpPut("reminder-lead-days")]
    public async Task<IActionResult> UpdateReminderLeadDays([FromBody] UpdateReminderLeadDaysRequest request)
    {
        var userId = GetUserId();
        var days = await _userService.UpdateReminderLeadDaysAsync(userId, request.Days);
        return Ok(new { user = new { id = userId, defaultReminderLeadDays = days } });
    }

    [HttpPut("weekly-digest")]
    public async Task<IActionResult> UpdateWeeklyDigest([FromBody] UpdateWeeklyDigestRequest request)
    {
        var userId = GetUserId();
        var (enabled, weekday) = await _userService.UpdateWeeklyDigestAsync(userId, request.Enabled, request.Weekday);
        return Ok(new { user = new { id = userId, weeklyDigestEnabled = enabled, weeklyDigestWeekday = weekday } });
    }

    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        await _userService.DeleteAccountAsync(GetUserId(), request);
        return Ok(new { message = "Account deleted successfully", success = true });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? groupIds)
    {
        var result = await _exportImportService.ExportUserDataAsync(GetUserId(), groupIds);
        return Ok(result);
    }

    [HttpPost("import/validate")]
    public async Task<IActionResult> ValidateImport([FromBody] ImportDataRequest request)
    {
        var result = await _exportImportService.ValidateImportDataAsync(GetUserId(), request);
        return Ok(result);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportDataRequest request)
    {
        var result = await _exportImportService.ImportUserDataAsync(GetUserId(), request);
        return Ok(result);
    }
}

