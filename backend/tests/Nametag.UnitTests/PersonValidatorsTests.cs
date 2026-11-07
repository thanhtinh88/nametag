using FluentValidation.TestHelper;
using Nametag.Application.DTOs.Person;
using Nametag.Application.Validators.Person;
using Nametag.Domain.Enums;
using Xunit;

namespace Nametag.UnitTests;

public class PersonValidatorsTests
{
    private readonly CreatePersonRequestValidator _createValidator = new();
    private readonly UpdatePersonRequestValidator _updateValidator = new();

    [Fact]
    public void CreatePersonValidator_ShouldAcceptValidInput()
    {
        var model = new CreatePersonRequest
        {
            Name = "John",
            Surname = "Doe",
            MiddleName = "Fitzgerald",
            SecondLastName = "Kennedy",
            Nickname = "JFK",
            Prefix = "Mr.",
            Suffix = "Jr.",
            Organization = "Acme Corp",
            JobTitle = "Engineer",
            Notes = "Important contact",
            CitizenId = "123456789",
            HeightCm = 175,
            WeightKg = 70,
            Emails = new List<CreatePersonEmailDto>
            {
                new() { Type = "work", Email = "john@example.com" }
            },
            PhoneNumbers = new List<CreatePersonPhoneDto>
            {
                new() { Type = "mobile", Number = "+1234567890" }
            },
            Addresses = new List<CreatePersonAddressDto>
            {
                new() { Type = "home", StreetLine1 = "123 Main St", Locality = "Springfield", Latitude = 37.7749, Longitude = -122.4194 }
            },
            ImportantDates = new List<CreateImportantDateDto>
            {
                new() { Title = "Birthday", Date = new DateTime(1990, 5, 20), ReminderEnabled = true, ReminderLeadDays = 7 }
            }
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CreatePersonValidator_ShouldRejectEmptyName(string name)
    {
        var model = new CreatePersonRequest
        {
            Name = name
        };

        var result = _createValidator.TestValidate(model);
        Assert.False(result.IsValid);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void CreatePersonValidator_ShouldRejectInvalidEmail()
    {
        var model = new CreatePersonRequest
        {
            Name = "John",
            Emails = new List<CreatePersonEmailDto>
            {
                new() { Type = "work", Email = "not-an-email" }
            }
        };

        var result = _createValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreatePersonValidator_ShouldRejectInvalidCoordinates()
    {
        var model = new CreatePersonRequest
        {
            Name = "John",
            Addresses = new List<CreatePersonAddressDto>
            {
                new() { Type = "work", Latitude = 100.0, Longitude = 200.0 }
            }
        };

        var result = _createValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreatePersonValidator_ShouldRejectInvalidHeightAndWeight()
    {
        var model = new CreatePersonRequest
        {
            Name = "John",
            HeightCm = 20, // min is 30
            WeightKg = 500  // max is 300
        };

        var result = _createValidator.TestValidate(model);
        Assert.False(result.IsValid);
        result.ShouldHaveValidationErrorFor(x => x.HeightCm);
        result.ShouldHaveValidationErrorFor(x => x.WeightKg);
    }

    [Fact]
    public void CreatePersonValidator_ShouldRequireTitleWhenNoType()
    {
        var model = new CreatePersonRequest
        {
            Name = "John",
            ImportantDates = new List<CreateImportantDateDto>
            {
                new() { Title = "", Type = null, Date = DateTime.UtcNow }
            }
        };

        var result = _createValidator.TestValidate(model);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void CreatePersonValidator_ShouldAllowEmptyTitleWhenTypeSpecified()
    {
        var model = new CreatePersonRequest
        {
            Name = "John",
            ImportantDates = new List<CreateImportantDateDto>
            {
                new() { Title = "", Type = "birthday", Date = DateTime.UtcNow }
            }
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdatePersonValidator_ShouldAcceptValidInput()
    {
        var model = new UpdatePersonRequest
        {
            Name = "Jane",
            Nickname = "Janie",
            Emails = new List<CreatePersonEmailDto>
            {
                new() { Type = "personal", Email = "jane@example.com" }
            }
        };

        var result = _updateValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdatePersonValidator_ShouldRejectEmptyName()
    {
        var model = new UpdatePersonRequest
        {
            Name = ""
        };

        var result = _updateValidator.TestValidate(model);
        Assert.False(result.IsValid);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void UpdatePersonValidator_ShouldAllowNullNameForPartialUpdate()
    {
        var model = new UpdatePersonRequest
        {
            Name = null,
            Nickname = "NewNick"
        };

        var result = _updateValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

