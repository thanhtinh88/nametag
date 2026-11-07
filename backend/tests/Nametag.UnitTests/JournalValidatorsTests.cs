using FluentValidation.TestHelper;
using Nametag.Application.DTOs.Journal;
using Nametag.Application.Validators.Journal;
using Xunit;

namespace Nametag.UnitTests;

public class JournalValidatorsTests
{
    private readonly CreateJournalEntryRequestValidator _createValidator = new();
    private readonly UpdateJournalEntryRequestValidator _updateValidator = new();

    [Fact]
    public void CreateJournalEntryValidator_ShouldAcceptValidInput()
    {
        var model = new CreateJournalEntryRequest
        {
            Title = "Witness Interview",
            Body = "Met the witness at the precinct.",
            Date = DateTime.UtcNow
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateJournalEntryValidator_ShouldRejectEmptyTitle(string title)
    {
        var model = new CreateJournalEntryRequest
        {
            Title = title,
            Body = "Some body",
            Date = DateTime.UtcNow
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void CreateJournalEntryValidator_ShouldRejectEmptyBody()
    {
        var model = new CreateJournalEntryRequest
        {
            Title = "Valid Title",
            Body = "",
            Date = DateTime.UtcNow
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Body);
    }

    [Fact]
    public void UpdateJournalEntryValidator_ShouldAcceptValidInput()
    {
        var model = new UpdateJournalEntryRequest
        {
            Title = "Updated Interview Notes",
            Body = "New statements recorded."
        };

        var result = _updateValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdateJournalEntryValidator_ShouldRejectEmptyTitleWhenProvided()
    {
        var model = new UpdateJournalEntryRequest
        {
            Title = ""
        };

        var result = _updateValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }
}

