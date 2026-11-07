using FluentValidation.TestHelper;
using Nametag.Application.DTOs.Relationship;
using Nametag.Application.Validators.Relationship;
using Xunit;

namespace Nametag.UnitTests;

public class RelationshipValidatorsTests
{
    private readonly CreateRelationshipRequestValidator _createRelValidator = new();
    private readonly UpdateRelationshipRequestValidator _updateRelValidator = new();
    private readonly CreateRelationshipTypeRequestValidator _createTypeValidator = new();
    private readonly UpdateRelationshipTypeRequestValidator _updateTypeValidator = new();

    [Fact]
    public void CreateRelationshipValidator_ShouldAcceptValidInput()
    {
        var model = new CreateRelationshipRequest
        {
            PersonId = Guid.NewGuid(),
            RelatedPersonId = Guid.NewGuid(),
            RelationshipTypeId = Guid.NewGuid(),
            VerificationStatus = "CONFIRMED",
            Confidence = "HIGH",
            Notes = "Met at conference",
            Source = "Verified by police records"
        };

        var result = _createRelValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void CreateRelationshipValidator_ShouldRejectEmptyPersonId()
    {
        var model = new CreateRelationshipRequest
        {
            PersonId = Guid.Empty,
            RelatedPersonId = Guid.NewGuid(),
            RelationshipTypeId = Guid.NewGuid(),
        };

        var result = _createRelValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.PersonId);
    }

    [Fact]
    public void CreateRelationshipValidator_ShouldRejectEmptyRelatedPersonId()
    {
        var model = new CreateRelationshipRequest
        {
            PersonId = Guid.NewGuid(),
            RelatedPersonId = Guid.Empty,
            RelationshipTypeId = Guid.NewGuid(),
        };

        var result = _createRelValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.RelatedPersonId);
    }

    [Fact]
    public void CreateRelationshipValidator_ShouldRejectEmptyRelationshipTypeId()
    {
        var model = new CreateRelationshipRequest
        {
            PersonId = Guid.NewGuid(),
            RelatedPersonId = Guid.NewGuid(),
            RelationshipTypeId = null,
        };

        var result = _createRelValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.RelationshipTypeId);
    }

    [Theory]
    [InlineData("UNKNOWN")]
    [InlineData("PENDING")]
    public void CreateRelationshipValidator_ShouldRejectInvalidVerificationStatus(string status)
    {
        var model = new CreateRelationshipRequest
        {
            PersonId = Guid.NewGuid(),
            RelatedPersonId = Guid.NewGuid(),
            RelationshipTypeId = Guid.NewGuid(),
            VerificationStatus = status
        };

        var result = _createRelValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.VerificationStatus);
    }

    [Fact]
    public void CreateRelationshipTypeValidator_ShouldAcceptValidInput()
    {
        var model = new CreateRelationshipTypeRequest
        {
            Name = "COLLEAGUE",
            Label = "Colleague",
            Category = "SOCIAL",
            DirectionType = "BIDIRECTIONAL",
            LineStyle = "SOLID",
            Color = "#6366f1",
            Symmetric = true
        };

        var result = _createTypeValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateRelationshipTypeValidator_ShouldRejectEmptyName(string name)
    {
        var model = new CreateRelationshipTypeRequest
        {
            Name = name,
            Label = "Colleague"
        };

        var result = _createTypeValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateRelationshipTypeValidator_ShouldRejectEmptyLabel(string label)
    {
        var model = new CreateRelationshipTypeRequest
        {
            Name = "COLLEAGUE",
            Label = label
        };

        var result = _createTypeValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Label);
    }

    [Fact]
    public void CreateRelationshipTypeValidator_ShouldRejectInvalidCategory()
    {
        var model = new CreateRelationshipTypeRequest
        {
            Name = "TEST",
            Label = "Test",
            Category = "INVALID_CATEGORY"
        };

        var result = _createTypeValidator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Category);
    }

    [Fact]
    public void UpdateRelationshipTypeValidator_ShouldAcceptValidInput()
    {
        var model = new UpdateRelationshipTypeRequest
        {
            Name = "MENTOR",
            Label = "Mentor",
            Category = "PROFESSIONAL", // wait: allowed categories are CRIMINAL, FINANCIAL, FAMILY, LEGAL_CASE, SOCIAL
        };
        model.Category = "SOCIAL";

        var result = _updateTypeValidator.TestValidate(model);
        result.ShouldNotHaveAnyValidationErrors();
    }
}

