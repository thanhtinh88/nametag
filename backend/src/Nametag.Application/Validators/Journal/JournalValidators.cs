using FluentValidation;
using Nametag.Application.DTOs.Journal;

namespace Nametag.Application.Validators.Journal;

public class CreateJournalEntryRequestValidator : AbstractValidator<CreateJournalEntryRequest>
{
    public CreateJournalEntryRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters");

        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Body is required");

        RuleFor(x => x.Date)
            .NotEmpty().WithMessage("Date is required");
    }
}

public class UpdateJournalEntryRequestValidator : AbstractValidator<UpdateJournalEntryRequest>
{
    public UpdateJournalEntryRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title cannot be empty")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters")
            .When(x => x.Title != null);

        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Body cannot be empty")
            .When(x => x.Body != null);
    }
}

