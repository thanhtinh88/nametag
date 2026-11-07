using FluentValidation.TestHelper;
using Nametag.Application.DTOs.Gang;
using Nametag.Application.Validators.Gang;
using Xunit;

namespace Nametag.UnitTests;

public class GangValidatorsTests
{
    private readonly CreateGangRequestValidator _createValidator = new();
    private readonly UpdateGangRequestValidator _updateValidator = new();
    private readonly AddGangMemberRequestValidator _memberValidator = new();

    [Fact]
    public void CreateGang_Valid_Passes()
    {
        var request = new CreateGangRequest
        {
            Name = "Black Axe",
            Description = "Operating downtown",
            Turf = "District 1",
            Color = "#000000"
        };
        var result = _createValidator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void CreateGang_EmptyName_Fails()
    {
        var request = new CreateGangRequest { Name = "" };
        var result = _createValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void CreateGang_InvalidColor_Fails()
    {
        var request = new CreateGangRequest { Name = "Gang", Color = "not-a-color" };
        var result = _createValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Color);
    }

    [Fact]
    public void UpdateGang_Valid_Passes()
    {
        var request = new UpdateGangRequest { Name = "Renamed Gang", Turf = "District 2" };
        var result = _updateValidator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void AddGangMember_EmptyPersonId_Fails()
    {
        var request = new AddGangMemberRequest { PersonId = Guid.Empty };
        var result = _memberValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.PersonId);
    }

    [Fact]
    public void AddGangMember_Valid_Passes()
    {
        var request = new AddGangMemberRequest { PersonId = Guid.NewGuid(), Role = "ENFORCER" };
        var result = _memberValidator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

