using FluentValidation.TestHelper;
using Nametag.Application.DTOs.User;
using Nametag.Application.Validators.User;
using Xunit;

namespace Nametag.UnitTests;

public class UserValidatorsTests
{
    private readonly UpdateProfileRequestValidator _profileValidator = new();
    private readonly UpdatePasswordRequestValidator _passwordValidator = new();
    private readonly UpdateReminderLeadDaysRequestValidator _reminderValidator = new();
    private readonly UpdateWeeklyDigestRequestValidator _digestValidator = new();
    private readonly UpdateGraphDisplayRequestValidator _graphValidator = new();
    private readonly UpdateLanguageRequestValidator _languageValidator = new();
    private readonly DeleteAccountRequestValidator _deleteValidator = new();

    [Fact]
    public void UpdateProfileValidator_ShouldAcceptValidInput()
    {
        var model = new UpdateProfileRequest
        {
            Name = "Alice",
            Surname = "Smith",
            Nickname = "Ali",
            Email = "alice@example.com"
        };

        var result = _profileValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("", "alice@example.com")]
    [InlineData("Alice", "")]
    [InlineData("Alice", "not-an-email")]
    public void UpdateProfileValidator_ShouldRejectInvalidInput(string name, string email)
    {
        var model = new UpdateProfileRequest
        {
            Name = name,
            Email = email
        };

        var result = _profileValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("Password123!")]
    [InlineData("Valid@2026Password")]
    public void UpdatePasswordValidator_ShouldAcceptStrongPassword(string newPassword)
    {
        var model = new UpdatePasswordRequest
        {
            CurrentPassword = "OldPassword123!",
            NewPassword = newPassword
        };

        var result = _passwordValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")] // Empty
    [InlineData("short1!")] // < 8 chars
    [InlineData("alllowercase1!")] // No uppercase
    [InlineData("ALLUPPERCASE1!")] // No lowercase
    [InlineData("NoSpecialChar123")] // No special char
    [InlineData("NoNumber!@#$$%")] // No number
    public void UpdatePasswordValidator_ShouldRejectWeakPassword(string newPassword)
    {
        var model = new UpdatePasswordRequest
        {
            CurrentPassword = "OldPassword123!",
            NewPassword = newPassword
        };

        var result = _passwordValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(30)]
    [InlineData(365)]
    public void ReminderLeadDaysValidator_ShouldAcceptValidDays(int days)
    {
        var model = new UpdateReminderLeadDaysRequest { Days = days };
        var result = _reminderValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(366)]
    public void ReminderLeadDaysValidator_ShouldRejectOutOfRange(int days)
    {
        var model = new UpdateReminderLeadDaysRequest { Days = days };
        var result = _reminderValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void WeeklyDigestValidator_ShouldAcceptValidWeekday(int weekday)
    {
        var model = new UpdateWeeklyDigestRequest { Enabled = true, Weekday = weekday };
        var result = _digestValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(7)]
    public void WeeklyDigestValidator_ShouldRejectInvalidWeekday(int weekday)
    {
        var model = new UpdateWeeklyDigestRequest { Enabled = true, Weekday = weekday };
        var result = _digestValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("individuals")]
    [InlineData("bubbles")]
    public void GraphDisplayValidator_ShouldAcceptValidModes(string? mode)
    {
        var model = new UpdateGraphDisplayRequest { GraphMode = mode };
        var result = _graphValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void GraphDisplayValidator_ShouldRejectInvalidMode()
    {
        var model = new UpdateGraphDisplayRequest { GraphMode = "matrix" };
        var result = _graphValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("vi-VN")]
    public void LanguageValidator_ShouldAcceptSupportedLocales(string lang)
    {
        var model = new UpdateLanguageRequest { Language = lang };
        var result = _languageValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void LanguageValidator_ShouldRejectUnsupportedLocale()
    {
        var model = new UpdateLanguageRequest { Language = "fr-FR" };
        var result = _languageValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void DeleteAccountValidator_ShouldAcceptDELETE()
    {
        var model = new DeleteAccountRequest { ConfirmationText = "DELETE" };
        var result = _deleteValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("delete")]
    [InlineData("CONFIRM")]
    [InlineData("")]
    public void DeleteAccountValidator_ShouldRejectNonDELETE(string text)
    {
        var model = new DeleteAccountRequest { ConfirmationText = text };
        var result = _deleteValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }
}

