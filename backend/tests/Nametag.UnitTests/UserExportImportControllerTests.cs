using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.User;
using Nametag.Application.Services;
using Nametag.Domain.Enums;
using Xunit;

namespace Nametag.UnitTests;

public class FakeUserService : IUserService
{
    public Task<UserProfileDto> GetProfileAsync(Guid userId) => Task.FromResult(new UserProfileDto { Id = userId });
    public Task<UpdateProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request) => Task.FromResult(new UpdateProfileResponse());
    public Task ChangePasswordAsync(Guid userId, UpdatePasswordRequest request) => Task.CompletedTask;
    public Task<Theme> UpdateThemeAsync(Guid userId, Theme theme) => Task.FromResult(theme);
    public Task<string> UpdateLanguageAsync(Guid userId, string language) => Task.FromResult(language);
    public Task<DateFormat> UpdateDateFormatAsync(Guid userId, DateFormat dateFormat) => Task.FromResult(dateFormat);
    public Task<NameOrder> UpdateNameOrderAsync(Guid userId, NameOrder nameOrder) => Task.FromResult(nameOrder);
    public Task<NameDisplayFormat> UpdateNameDisplayFormatAsync(Guid userId, NameDisplayFormat format) => Task.FromResult(format);
    public Task<string?> UpdateGraphDisplayAsync(Guid userId, string? graphMode) => Task.FromResult(graphMode);
    public Task<bool> UpdateGeocodingAsync(Guid userId, bool geocodingEnabled) => Task.FromResult(geocodingEnabled);
    public Task<int> UpdateReminderLeadDaysAsync(Guid userId, int days) => Task.FromResult(days);
    public Task<(bool enabled, int weekday)> UpdateWeeklyDigestAsync(Guid userId, bool enabled, int weekday) => Task.FromResult((enabled, weekday));
    public Task DeleteAccountAsync(Guid userId, DeleteAccountRequest request) => Task.CompletedTask;
}

public class FakeUserExportImportService : IUserExportImportService
{
    public Task<UserExportDataDto> ExportUserDataAsync(Guid userId, string? groupIdsParam, CancellationToken ct = default)
    {
        return Task.FromResult(new UserExportDataDto
        {
            Version = "1.2",
            User = new ExportUserInfoDto { Email = "test@example.com" },
            People = new List<ExportPersonDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Alice" }
            },
            Groups = new List<ExportGroupDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Family" }
            }
        });
    }

    public Task<ImportValidateResponseDto> ValidateImportDataAsync(Guid userId, ImportDataRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new ImportValidateResponseDto
        {
            Valid = true,
            NewPeopleCount = request.People.Count,
            NewGroupsCount = request.Groups.Count
        });
    }

    public Task<ImportResponseDto> ImportUserDataAsync(Guid userId, ImportDataRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new ImportResponseDto
        {
            Success = true,
            Imported = new ImportCountsDto
            {
                People = request.People.Count,
                Groups = request.Groups.Count
            }
        });
    }
}

public class UserExportImportControllerTests
{
    private readonly FakeUserService _userService;
    private readonly FakeUserExportImportService _exportImportService;
    private readonly FakeCurrentUserService _currentUserService;
    private readonly UserController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public UserExportImportControllerTests()
    {
        _userService = new FakeUserService();
        _exportImportService = new FakeUserExportImportService();
        _currentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new UserController(_userService, _exportImportService, _currentUserService);
    }

    [Fact]
    public async Task Export_ReturnsOk()
    {
        var result = await _controller.Export(null);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var exportData = Assert.IsType<UserExportDataDto>(okResult.Value);
        Assert.Equal("1.2", exportData.Version);
        Assert.Single(exportData.People);
        Assert.Single(exportData.Groups);
    }

    [Fact]
    public async Task ValidateImport_ReturnsOk()
    {
        var request = new ImportDataRequest
        {
            People = new List<ExportPersonDto> { new() { Id = Guid.NewGuid(), Name = "Bob" } },
            Groups = new List<ExportGroupDto> { new() { Id = Guid.NewGuid(), Name = "Work" } }
        };

        var result = await _controller.ValidateImport(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var valResult = Assert.IsType<ImportValidateResponseDto>(okResult.Value);
        Assert.True(valResult.Valid);
        Assert.Equal(1, valResult.NewPeopleCount);
        Assert.Equal(1, valResult.NewGroupsCount);
    }

    [Fact]
    public async Task Import_ReturnsOk()
    {
        var request = new ImportDataRequest
        {
            People = new List<ExportPersonDto> { new() { Id = Guid.NewGuid(), Name = "Bob" } },
            Groups = new List<ExportGroupDto> { new() { Id = Guid.NewGuid(), Name = "Work" } }
        };

        var result = await _controller.Import(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var impResult = Assert.IsType<ImportResponseDto>(okResult.Value);
        Assert.True(impResult.Success);
        Assert.Equal(1, impResult.Imported.People);
        Assert.Equal(1, impResult.Imported.Groups);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }
}
