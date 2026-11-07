using FluentValidation;
using Nametag.Application.DTOs.Gang;

namespace Nametag.Application.Validators.Gang;

public class CreateGangRequestValidator : AbstractValidator<CreateGangRequest>
{
    public CreateGangRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Gang name is required")
            .MaximumLength(150).WithMessage("Gang name must be less than 150 characters");

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description must be less than 5000 characters")
            .When(x => !string.IsNullOrEmpty(x.Description));

        RuleFor(x => x.Turf)
            .MaximumLength(200).WithMessage("Turf must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Turf));

        RuleFor(x => x.Color)
            .Matches(@"^#[0-9A-Fa-f]{6}$").WithMessage("Invalid hex color format")
            .When(x => !string.IsNullOrEmpty(x.Color));
    }
}

public class UpdateGangRequestValidator : AbstractValidator<UpdateGangRequest>
{
    public UpdateGangRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Gang name cannot be empty")
            .MaximumLength(150).WithMessage("Gang name must be less than 150 characters")
            .When(x => x.Name != null);

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description must be less than 5000 characters")
            .When(x => !string.IsNullOrEmpty(x.Description));

        RuleFor(x => x.Turf)
            .MaximumLength(200).WithMessage("Turf must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Turf));

        RuleFor(x => x.Color)
            .Matches(@"^#[0-9A-Fa-f]{6}$").WithMessage("Invalid hex color format")
            .When(x => !string.IsNullOrEmpty(x.Color));
    }
}

public class AddGangMemberRequestValidator : AbstractValidator<AddGangMemberRequest>
{
    public AddGangMemberRequestValidator()
    {
        RuleFor(x => x.PersonId)
            .NotEmpty().WithMessage("Person ID is required");

        RuleFor(x => x.Role)
            .MaximumLength(100).WithMessage("Role must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Role));

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes must be less than 2000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

