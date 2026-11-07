using FluentValidation.TestHelper;
using Nametag.Application.DTOs.Group;
using Nametag.Application.Validators.Group;
using Xunit;

namespace Nametag.UnitTests;

public class GroupValidatorsTests
{
    private readonly CreateGroupRequestValidator _createValidator = new();
    private readonly UpdateGroupRequestValidator _updateValidator = new();
    private readonly AddGroupMemberRequestValidator _memberValidator = new();

    [Fact]
    public void CreateGroupValidator_ShouldAcceptValidInput()
    {
        var model = new CreateGroupRequest
        {
            Name = "Close Friends",
            Description = "Friends from university",
            Color = "#3b82f6",
            PeopleIds = new List<Guid> { Guid.NewGuid() }
        };

        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateGroupValidator_ShouldRejectEmptyName(string name)
    {
        var model = new CreateGroupRequest { Name = name };
        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void CreateGroupValidator_ShouldRejectLongName()
    {
        var model = new CreateGroupRequest { Name = new string('A', 101) };
        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void CreateGroupValidator_ShouldRejectLongDescription()
    {
        var model = new CreateGroupRequest
        {
            Name = "Valid Name",
            Description = new string('A', 501)
        };
        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Theory]
    [InlineData("red")]
    [InlineData("#12")]
    [InlineData("#12345")]
    [InlineData("#1234567")]
    [InlineData("123456")]
    public void CreateGroupValidator_ShouldRejectInvalidColor(string color)
    {
        var model = new CreateGroupRequest
        {
            Name = "Valid Name",
            Color = color
        };
        var result = _createValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Color);
    }

    [Theory]
    [InlineData("#fff")]
    [InlineData("#FFFFFF")]
    [InlineData("#3b82f6")]
    public void CreateGroupValidator_ShouldAcceptValidHexColors(string color)
    {
        var model = new CreateGroupRequest
        {
            Name = "Valid Name",
            Color = color
        };
        var result = _createValidator.TestValidate(model);
        result.ShouldNotHaveValidationErrorFor(x => x.Color);
    }

    [Fact]
    public void UpdateGroupValidator_ShouldAcceptValidInput()
    {
        var model = new UpdateGroupRequest
        {
            Name = "Updated Name",
            Description = "Updated description",
            Color = "#10b981"
        };
        var result = _updateValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void AddGroupMemberValidator_ShouldRejectEmptyPersonId()
    {
        var model = new AddGroupMemberRequest { PersonId = Guid.Empty };
        var result = _memberValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.PersonId);
    }

    [Fact]
    public void AddGroupMemberValidator_ShouldAcceptValidPersonId()
    {
        var model = new AddGroupMemberRequest { PersonId = Guid.NewGuid() };
        var result = _memberValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

