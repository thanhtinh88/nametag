using FluentValidation;
using Nametag.Application.DTOs.Relationship;

namespace Nametag.Application.Validators.Relationship;

public class CreateRelationshipRequestValidator : AbstractValidator<CreateRelationshipRequest>
{
    private static readonly string[] AllowedVerificationStatuses = ["UNVERIFIED", "INVESTIGATING", "CONFIRMED", "RULED_OUT"];
    private static readonly string[] AllowedConfidences = ["HIGH", "MEDIUM", "LOW"];

    public CreateRelationshipRequestValidator()
    {
        RuleFor(x => x.PersonId)
            .NotEmpty().WithMessage("Person ID is required");

        RuleFor(x => x.RelatedPersonId)
            .NotEmpty().WithMessage("Related person ID is required");

        RuleFor(x => x.RelationshipTypeId)
            .NotNull().WithMessage("Relationship type is required")
            .NotEmpty().WithMessage("Relationship type is required");

        RuleFor(x => x.VerificationStatus)
            .Must(s => AllowedVerificationStatuses.Contains(s))
            .WithMessage("Invalid verification status")
            .When(x => !string.IsNullOrEmpty(x.VerificationStatus));

        RuleFor(x => x.Confidence)
            .Must(c => AllowedConfidences.Contains(c))
            .WithMessage("Invalid confidence level")
            .When(x => !string.IsNullOrEmpty(x.Confidence));

        RuleFor(x => x.Source)
            .MaximumLength(1000).WithMessage("Source must be less than 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Source));

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes must be less than 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

public class UpdateRelationshipRequestValidator : AbstractValidator<UpdateRelationshipRequest>
{
    private static readonly string[] AllowedVerificationStatuses = ["UNVERIFIED", "INVESTIGATING", "CONFIRMED", "RULED_OUT"];
    private static readonly string[] AllowedConfidences = ["HIGH", "MEDIUM", "LOW"];

    public UpdateRelationshipRequestValidator()
    {
        RuleFor(x => x.RelationshipTypeId)
            .NotNull().WithMessage("Relationship type is required")
            .NotEmpty().WithMessage("Relationship type is required");

        RuleFor(x => x.VerificationStatus)
            .Must(s => AllowedVerificationStatuses.Contains(s))
            .WithMessage("Invalid verification status")
            .When(x => !string.IsNullOrEmpty(x.VerificationStatus));

        RuleFor(x => x.Confidence)
            .Must(c => AllowedConfidences.Contains(c))
            .WithMessage("Invalid confidence level")
            .When(x => !string.IsNullOrEmpty(x.Confidence));

        RuleFor(x => x.Source)
            .MaximumLength(1000).WithMessage("Source must be less than 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Source));

        RuleFor(x => x.Notes)
            .MaximumLength(1000).WithMessage("Notes must be less than 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

public class CreateRelationshipTypeRequestValidator : AbstractValidator<CreateRelationshipTypeRequest>
{
    private static readonly string[] AllowedCategories = ["CRIMINAL", "FINANCIAL", "FAMILY", "LEGAL_CASE", "SOCIAL"];
    private static readonly string[] AllowedDirections = ["DIRECTED", "BIDIRECTIONAL"];
    private static readonly string[] AllowedLineStyles = ["SOLID", "DASHED", "DOTTED"];

    public CreateRelationshipTypeRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(50).WithMessage("Name must be less than 50 characters");

        RuleFor(x => x.Label)
            .NotEmpty().WithMessage("Label is required")
            .MaximumLength(50).WithMessage("Label must be less than 50 characters");

        RuleFor(x => x.Category)
            .Must(c => AllowedCategories.Contains(c))
            .WithMessage("Invalid category")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.DirectionType)
            .Must(d => AllowedDirections.Contains(d))
            .WithMessage("Invalid direction type")
            .When(x => !string.IsNullOrEmpty(x.DirectionType));

        RuleFor(x => x.LineStyle)
            .Must(l => AllowedLineStyles.Contains(l))
            .WithMessage("Invalid line style")
            .When(x => !string.IsNullOrEmpty(x.LineStyle));

        RuleFor(x => x.Color)
            .Matches(@"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$").WithMessage("Invalid color format")
            .When(x => !string.IsNullOrEmpty(x.Color));

        RuleFor(x => x.InverseLabel)
            .MaximumLength(50).WithMessage("Inverse label must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.InverseLabel));
    }
}

public class UpdateRelationshipTypeRequestValidator : AbstractValidator<UpdateRelationshipTypeRequest>
{
    private static readonly string[] AllowedCategories = ["CRIMINAL", "FINANCIAL", "FAMILY", "LEGAL_CASE", "SOCIAL"];
    private static readonly string[] AllowedDirections = ["DIRECTED", "BIDIRECTIONAL"];
    private static readonly string[] AllowedLineStyles = ["SOLID", "DASHED", "DOTTED"];

    public UpdateRelationshipTypeRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(50).WithMessage("Name must be less than 50 characters");

        RuleFor(x => x.Label)
            .NotEmpty().WithMessage("Label is required")
            .MaximumLength(50).WithMessage("Label must be less than 50 characters");

        RuleFor(x => x.Category)
            .Must(c => AllowedCategories.Contains(c))
            .WithMessage("Invalid category")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.DirectionType)
            .Must(d => AllowedDirections.Contains(d))
            .WithMessage("Invalid direction type")
            .When(x => !string.IsNullOrEmpty(x.DirectionType));

        RuleFor(x => x.LineStyle)
            .Must(l => AllowedLineStyles.Contains(l))
            .WithMessage("Invalid line style")
            .When(x => !string.IsNullOrEmpty(x.LineStyle));

        RuleFor(x => x.Color)
            .Matches(@"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$").WithMessage("Invalid color format")
            .When(x => !string.IsNullOrEmpty(x.Color));

        RuleFor(x => x.InverseLabel)
            .MaximumLength(50).WithMessage("Inverse label must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.InverseLabel));
    }
}

