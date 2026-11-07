using FluentValidation.TestHelper;
using Nametag.Application.DTOs.CustomFieldTemplate;
using Nametag.Application.Validators.CustomFieldTemplate;
using Xunit;

namespace Nametag.UnitTests;

public class CustomFieldTemplateValidatorsTests
{
    private readonly CreateCustomFieldTemplateRequestValidator _createValidator = new();
    private readonly UpdateCustomFieldTemplateRequestValidator _updateValidator = new();
    private readonly ReorderCustomFieldTemplatesRequestValidator _reorderValidator = new();

    [Fact]
    public void CreateTemplate_ValidText_Passes()
    {
        var request = new CreateCustomFieldTemplateRequest { Name = "Rank", Type = "TEXT" };
        var result = _createValidator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void CreateTemplate_SelectWithoutOptions_Fails()
    {
        var request = new CreateCustomFieldTemplateRequest { Name = "Category", Type = "SELECT", Options = new List<string>() };
        var result = _createValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x);
    }

    [Fact]
    public void CreateTemplate_SelectWithOptions_Passes()
    {
        var request = new CreateCustomFieldTemplateRequest
        {
            Name = "Category",
            Type = "SELECT",
            Options = new List<string> { "VIP", "Standard" }
        };
        var result = _createValidator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdateTemplate_Empty_Fails()
    {
        var request = new UpdateCustomFieldTemplateRequest();
        var result = _updateValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x);
    }

    [Fact]
    public void ReorderTemplates_EmptyList_Fails()
    {
        var request = new ReorderCustomFieldTemplatesRequest { Ids = new List<Guid>() };
        var result = _reorderValidator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Ids);
    }
}

