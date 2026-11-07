using FluentValidation;
using Nametag.Application.DTOs.Event;

namespace Nametag.Application.Validators.Event;

public class CreateEventRequestValidator : AbstractValidator<CreateEventRequest>
{
    public CreateEventRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters");

        RuleFor(x => x.Category)
            .MaximumLength(100).WithMessage("Category cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.CaseCode)
            .MaximumLength(100).WithMessage("Case code cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.CaseCode));

        RuleFor(x => x.CrimeType)
            .MaximumLength(100).WithMessage("Crime type cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.CrimeType));

        RuleFor(x => x.CaseStatus)
            .MaximumLength(50).WithMessage("Case status cannot exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.CaseStatus));

        RuleFor(x => x.IncidentTimeNotes)
            .MaximumLength(500).WithMessage("Incident time notes cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.IncidentTimeNotes));

        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate!.Value).WithMessage("End date must be after or equal to start date")
            .When(x => x.StartDate.HasValue && x.EndDate.HasValue);
    }
}

public class UpdateEventRequestValidator : AbstractValidator<UpdateEventRequest>
{
    public UpdateEventRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title cannot be empty")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters")
            .When(x => x.Title != null);

        RuleFor(x => x.Category)
            .MaximumLength(100).WithMessage("Category cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.CaseCode)
            .MaximumLength(100).WithMessage("Case code cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.CaseCode));

        RuleFor(x => x.CrimeType)
            .MaximumLength(100).WithMessage("Crime type cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.CrimeType));

        RuleFor(x => x.CaseStatus)
            .MaximumLength(50).WithMessage("Case status cannot exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.CaseStatus));

        RuleFor(x => x.IncidentTimeNotes)
            .MaximumLength(500).WithMessage("Incident time notes cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.IncidentTimeNotes));

        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate!.Value).WithMessage("End date must be after or equal to start date")
            .When(x => x.StartDate.HasValue && x.EndDate.HasValue);
    }
}

public class AddEventPersonRequestValidator : AbstractValidator<AddEventPersonRequest>
{
    private static readonly string[] ValidInvolvementTypes =
        { "SUSPECT", "PERSON_OF_INTEREST", "ACCOMPLICE", "WITNESS", "VICTIM", "INFORMANT" };

    private static readonly string[] ValidVerificationStatuses =
        { "HYPOTHESIS", "INVESTIGATING", "CONFIRMED", "RULED_OUT" };

    private static readonly string[] ValidConfidences =
        { "HIGH", "MEDIUM", "LOW" };

    public AddEventPersonRequestValidator()
    {
        RuleFor(x => x.PersonId)
            .NotEmpty().WithMessage("Person ID is required");

        RuleFor(x => x.Role)
            .MaximumLength(100).WithMessage("Role cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Role));

        RuleFor(x => x.InvolvementType)
            .Must(t => string.IsNullOrEmpty(t) || ValidInvolvementTypes.Contains(t))
            .WithMessage("Invalid involvement type");

        RuleFor(x => x.VerificationStatus)
            .Must(s => string.IsNullOrEmpty(s) || ValidVerificationStatuses.Contains(s))
            .WithMessage("Invalid verification status");

        RuleFor(x => x.Confidence)
            .Must(c => string.IsNullOrEmpty(c) || ValidConfidences.Contains(c))
            .WithMessage("Invalid confidence level");
    }
}

public class UpdateEventPersonRequestValidator : AbstractValidator<UpdateEventPersonRequest>
{
    private static readonly string[] ValidInvolvementTypes =
        { "SUSPECT", "PERSON_OF_INTEREST", "ACCOMPLICE", "WITNESS", "VICTIM", "INFORMANT" };

    private static readonly string[] ValidVerificationStatuses =
        { "HYPOTHESIS", "INVESTIGATING", "CONFIRMED", "RULED_OUT" };

    private static readonly string[] ValidConfidences =
        { "HIGH", "MEDIUM", "LOW" };

    public UpdateEventPersonRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => x.Id.HasValue || x.PersonId.HasValue)
            .WithMessage("Either Id or PersonId must be provided");

        RuleFor(x => x.Role)
            .MaximumLength(100).WithMessage("Role cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Role));

        RuleFor(x => x.InvolvementType)
            .Must(t => string.IsNullOrEmpty(t) || ValidInvolvementTypes.Contains(t))
            .WithMessage("Invalid involvement type");

        RuleFor(x => x.VerificationStatus)
            .Must(s => string.IsNullOrEmpty(s) || ValidVerificationStatuses.Contains(s))
            .WithMessage("Invalid verification status");

        RuleFor(x => x.Confidence)
            .Must(c => string.IsNullOrEmpty(c) || ValidConfidences.Contains(c))
            .WithMessage("Invalid confidence level");
    }
}

public class BulkEventActionRequestValidator : AbstractValidator<BulkEventActionRequest>
{
    private static readonly string[] ValidActions =
        { "delete", "setCaseStatus", "setEventStatus", "addToGroups", "removeFromGroups" };

    public BulkEventActionRequestValidator()
    {
        RuleFor(x => x.Action)
            .NotEmpty().WithMessage("Action is required")
            .Must(a => ValidActions.Contains(a)).WithMessage("Invalid action");

        RuleFor(x => x)
            .Must(x => (x.EventIds != null && x.EventIds.Count > 0) || (x.SelectAll == true))
            .WithMessage("Must provide event IDs or select all");

        RuleFor(x => x.CaseStatus)
            .NotEmpty().WithMessage("Case status is required for setCaseStatus action")
            .When(x => x.Action == "setCaseStatus");

        RuleFor(x => x.Status)
            .NotNull().WithMessage("Event status is required for setEventStatus action")
            .When(x => x.Action == "setEventStatus");

        RuleFor(x => x.GroupIds)
            .NotEmpty().WithMessage("Group IDs are required for group actions")
            .When(x => x.Action == "addToGroups" || x.Action == "removeFromGroups");
    }
}

