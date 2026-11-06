using FluentValidation;
using Nametag.Application.DTOs.User;

namespace Nametag.Application.Validators.User;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(100).WithMessage("Name must be less than 100 characters");

        RuleFor(x => x.Surname)
            .MaximumLength(100).WithMessage("Surname must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Surname));

        RuleFor(x => x.Nickname)
            .MaximumLength(100).WithMessage("Nickname must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Nickname));

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255).WithMessage("Email must be less than 255 characters");
    }
}

public class UpdatePasswordRequestValidator : AbstractValidator<UpdatePasswordRequest>
{
    public UpdatePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters")
            .MaximumLength(128).WithMessage("Password must be less than 128 characters")
            .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter")
            .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter")
            .Matches(@"[0-9]").WithMessage("Password must contain at least one number")
            .Matches(@"[^A-Za-z0-9]").WithMessage("Password must contain at least one special character (!@#$%^&*)");
    }
}

public class UpdateReminderLeadDaysRequestValidator : AbstractValidator<UpdateReminderLeadDaysRequest>
{
    public UpdateReminderLeadDaysRequestValidator()
    {
        RuleFor(x => x.Days)
            .InclusiveBetween(0, 365).WithMessage("Days must be between 0 and 365");
    }
}

public class UpdateWeeklyDigestRequestValidator : AbstractValidator<UpdateWeeklyDigestRequest>
{
    public UpdateWeeklyDigestRequestValidator()
    {
        RuleFor(x => x.Weekday)
            .InclusiveBetween(0, 6).WithMessage("Weekday must be between 0 (Sunday) and 6 (Saturday)");
    }
}

public class UpdateGraphDisplayRequestValidator : AbstractValidator<UpdateGraphDisplayRequest>
{
    public UpdateGraphDisplayRequestValidator()
    {
        RuleFor(x => x.GraphMode)
            .Must(m => m == null || m == "individuals" || m == "bubbles")
            .WithMessage("Graph mode must be 'individuals' or 'bubbles'");
    }
}

public class UpdateLanguageRequestValidator : AbstractValidator<UpdateLanguageRequest>
{
    private static readonly HashSet<string> SupportedLocales = new(StringComparer.OrdinalIgnoreCase)
    {
        "en", "vi-VN", "vi"
    };

    public UpdateLanguageRequestValidator()
    {
        RuleFor(x => x.Language)
            .NotEmpty().WithMessage("Language is required")
            .Must(lang => SupportedLocales.Contains(lang))
            .WithMessage("Invalid language. Supported languages: en, vi-VN");
    }
}

public class DeleteAccountRequestValidator : AbstractValidator<DeleteAccountRequest>
{
    public DeleteAccountRequestValidator()
    {
        RuleFor(x => x.ConfirmationText)
            .Equal("DELETE").WithMessage("Confirmation text must be \"DELETE\"");
    }
}

