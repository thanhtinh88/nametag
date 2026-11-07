using FluentValidation.TestHelper;
using Nametag.Application.DTOs.Event;
using Nametag.Application.Validators.Event;
using Nametag.Domain.Enums;
using Xunit;

namespace Nametag.UnitTests;

public class EventValidatorsTests
{
    private readonly CreateEventRequestValidator _createValidator = new();
    private readonly UpdateEventRequestValidator _updateValidator = new();
    private readonly AddEventPersonRequestValidator _addPersonValidator = new();
    private readonly UpdateEventPersonRequestValidator _updatePersonValidator = new();
    private readonly BulkEventActionRequestValidator _bulkValidator = new();

    [Fact]
    public void CreateEventValidator_ShouldAcceptValidInput()
    {
        var model = new CreateEventRequest
        {
            Title = "Investigation Briefing",
            Category = "Briefing",
            Status = EventStatus.ONGOING,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddHours(2),
            CaseCode = "CASE-2026-001",
            CrimeType = "THEFT",
            CaseStatus = "INVESTIGATING"
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateEventValidator_ShouldRejectEmptyTitle(string title)
    {
        var model = new CreateEventRequest { Title = title };
        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void CreateEventValidator_ShouldRejectEndDateBeforeStartDate()
    {
        var model = new CreateEventRequest
        {
            Title = "Valid Title",
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.EndDate);
    }

    [Fact]
    public void UpdateEventValidator_ShouldRejectLongCategory()
    {
        var model = new UpdateEventRequest
        {
            Category = new string('A', 101)
        };

        var result = _updateValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Category);
    }

    [Fact]
    public void AddEventPersonValidator_ShouldRejectEmptyPersonId()
    {
        var model = new AddEventPersonRequest { PersonId = Guid.Empty };
        var result = _addPersonValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.PersonId);
    }

    [Fact]
    public void AddEventPersonValidator_ShouldRejectInvalidInvolvementType()
    {
        var model = new AddEventPersonRequest
        {
            PersonId = Guid.NewGuid(),
            InvolvementType = "INVALID_TYPE"
        };
        var result = _addPersonValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.InvolvementType);
    }

    [Fact]
    public void UpdateEventPersonValidator_ShouldRequireIdOrPersonId()
    {
        var model = new UpdateEventPersonRequest();
        var result = _updatePersonValidator.TestValidate(model);
        result.ShouldHaveAnyValidationError();
    }

    [Fact]
    public void BulkEventActionValidator_ShouldRejectInvalidAction()
    {
        var model = new BulkEventActionRequest
        {
            Action = "invalid_action",
            EventIds = new List<Guid> { Guid.NewGuid() }
        };
        var result = _bulkValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Action);
    }

    [Fact]
    public void BulkEventActionValidator_ShouldRequireGroupIdsForAddToGroups()
    {
        var model = new BulkEventActionRequest
        {
            Action = "addToGroups",
            EventIds = new List<Guid> { Guid.NewGuid() }
        };
        var result = _bulkValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.GroupIds);
    }

    [Fact]
    public void BulkEventActionValidator_ShouldAcceptValidBulkDelete()
    {
        var model = new BulkEventActionRequest
        {
            Action = "delete",
            SelectAll = true
        };
        var result = _bulkValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

