using FluentValidation;
using Nametag.Application.DTOs.CustomFieldTemplate;

namespace Nametag.Application.Validators.CustomFieldTemplate;

public class CreateCustomFieldTemplateRequestValidator : AbstractValidator<CreateCustomFieldTemplateRequest>
{
    private static readonly string[] ValidTypes = ["TEXT", "NUMBER", "BOOLEAN", "SELECT"];

    public CreateCustomFieldTemplateRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(60).WithMessage("Name must be 60 characters or fewer");

        RuleFor(x => x.Type)
            .NotEmpty().WithMessage("Type is required")
            .Must(t => ValidTypes.Contains(t.ToUpperInvariant()))
            .WithMessage("Invalid custom field type. Valid values: TEXT, NUMBER, BOOLEAN, SELECT");

        RuleFor(x => x.Options)
            .Must(opts => opts == null || opts.Count <= 50)
            .WithMessage("Up to 50 options are allowed");

        RuleForEach(x => x.Options)
            .NotEmpty().WithMessage("Option must not be empty")
            .MaximumLength(100).WithMessage("Option must be 100 characters or fewer")
            .When(x => x.Options != null);

        RuleFor(x => x)
            .Must(x => !string.Equals(x.Type, "SELECT", StringComparison.OrdinalIgnoreCase) || (x.Options != null && x.Options.Count > 0))
            .WithMessage("At least one option is required for single-select fields");
    }
}

public class UpdateCustomFieldTemplateRequestValidator : AbstractValidator<UpdateCustomFieldTemplateRequest>
{
    public UpdateCustomFieldTemplateRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => x.Name != null || x.Options != null)
            .WithMessage("At least one field must be provided");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name cannot be empty")
            .MaximumLength(60).WithMessage("Name must be 60 characters or fewer")
            .When(x => x.Name != null);

        RuleFor(x => x.Options)
            .Must(opts => opts == null || opts.Count <= 50)
            .WithMessage("Up to 50 options are allowed");

        RuleForEach(x => x.Options)
            .NotEmpty().WithMessage("Option must not be empty")
            .MaximumLength(100).WithMessage("Option must be 100 characters or fewer")
            .When(x => x.Options != null);
    }
}

public class ReorderCustomFieldTemplatesRequestValidator : AbstractValidator<ReorderCustomFieldTemplatesRequest>
{
    public ReorderCustomFieldTemplatesRequestValidator()
    {
        RuleFor(x => x.Ids)
            .NotEmpty().WithMessage("Ids list cannot be empty")
            .Must(ids => ids.Count <= 200).WithMessage("Up to 200 IDs allowed");
    }
}

