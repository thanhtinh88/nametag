using FluentValidation;
using Nametag.Application.DTOs.Person;

namespace Nametag.Application.Validators.Person;

public class CreatePersonRequestValidator : AbstractValidator<CreatePersonRequest>
{
    public CreatePersonRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(100).WithMessage("Name must be less than 100 characters");

        RuleFor(x => x.Surname)
            .MaximumLength(100).WithMessage("Surname must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Surname));

        RuleFor(x => x.MiddleName)
            .MaximumLength(100).WithMessage("Middle name must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.MiddleName));

        RuleFor(x => x.SecondLastName)
            .MaximumLength(100).WithMessage("Second last name must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.SecondLastName));

        RuleFor(x => x.Nickname)
            .MaximumLength(100).WithMessage("Nickname must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Nickname));

        RuleFor(x => x.Prefix)
            .MaximumLength(50).WithMessage("Prefix must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Prefix));

        RuleFor(x => x.Suffix)
            .MaximumLength(50).WithMessage("Suffix must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Suffix));

        RuleFor(x => x.Organization)
            .MaximumLength(200).WithMessage("Organization must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Organization));

        RuleFor(x => x.JobTitle)
            .MaximumLength(200).WithMessage("Job title must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.JobTitle));

        RuleFor(x => x.Notes)
            .MaximumLength(10000).WithMessage("Notes must be less than 10000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));

        RuleFor(x => x.DisplayNameOverride)
            .MaximumLength(200).WithMessage("Display name override must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.DisplayNameOverride));

        RuleFor(x => x.CitizenId)
            .MaximumLength(50).WithMessage("Citizen ID must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.CitizenId));

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(30, 250).WithMessage("Height must be between 30 and 250 cm")
            .When(x => x.HeightCm.HasValue);

        RuleFor(x => x.WeightKg)
            .InclusiveBetween(10, 300).WithMessage("Weight must be between 10 and 300 kg")
            .When(x => x.WeightKg.HasValue);

        RuleForEach(x => x.Emails).ChildRules(email =>
        {
            email.RuleFor(e => e.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Invalid email format")
                .MaximumLength(255).WithMessage("Email must be less than 255 characters");
            email.RuleFor(e => e.Type)
                .NotEmpty().WithMessage("Email type is required")
                .MaximumLength(50).WithMessage("Email type must be less than 50 characters");
        }).When(x => x.Emails != null);

        RuleForEach(x => x.PhoneNumbers).ChildRules(phone =>
        {
            phone.RuleFor(p => p.Number)
                .NotEmpty().WithMessage("Phone number is required")
                .MaximumLength(50).WithMessage("Phone number must be less than 50 characters");
            phone.RuleFor(p => p.Type)
                .NotEmpty().WithMessage("Phone type is required")
                .MaximumLength(50).WithMessage("Phone type must be less than 50 characters");
        }).When(x => x.PhoneNumbers != null);

        RuleForEach(x => x.Addresses).ChildRules(address =>
        {
            address.RuleFor(a => a.Type)
                .NotEmpty().WithMessage("Address type is required")
                .MaximumLength(50).WithMessage("Address type must be less than 50 characters");
            address.RuleFor(a => a.Latitude)
                .InclusiveBetween(-90.0, 90.0).WithMessage("Latitude must be between -90 and 90")
                .When(a => a.Latitude.HasValue);
            address.RuleFor(a => a.Longitude)
                .InclusiveBetween(-180.0, 180.0).WithMessage("Longitude must be between -180 and 180")
                .When(a => a.Longitude.HasValue);
        }).When(x => x.Addresses != null);

        RuleForEach(x => x.ImportantDates).ChildRules(date =>
        {
            date.RuleFor(d => d.Title)
                .NotEmpty().WithMessage("Title is required when no predefined type is selected")
                .When(d => string.IsNullOrEmpty(d.Type));
            date.RuleFor(d => d.Title)
                .MaximumLength(100).WithMessage("Title must be less than 100 characters");
            date.RuleFor(d => d.ReminderLeadDays)
                .InclusiveBetween(0, 365).WithMessage("Reminder lead days must be between 0 and 365")
                .When(d => d.ReminderLeadDays.HasValue);
        }).When(x => x.ImportantDates != null);
    }
}

public class UpdatePersonRequestValidator : AbstractValidator<UpdatePersonRequest>
{
    public UpdatePersonRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name cannot be empty")
            .MaximumLength(100).WithMessage("Name must be less than 100 characters")
            .When(x => x.Name != null);

        RuleFor(x => x.Surname)
            .MaximumLength(100).WithMessage("Surname must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Surname));

        RuleFor(x => x.MiddleName)
            .MaximumLength(100).WithMessage("Middle name must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.MiddleName));

        RuleFor(x => x.SecondLastName)
            .MaximumLength(100).WithMessage("Second last name must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.SecondLastName));

        RuleFor(x => x.Nickname)
            .MaximumLength(100).WithMessage("Nickname must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Nickname));

        RuleFor(x => x.Notes)
            .MaximumLength(10000).WithMessage("Notes must be less than 10000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));

        RuleFor(x => x.DisplayNameOverride)
            .MaximumLength(200).WithMessage("Display name override must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.DisplayNameOverride));

        RuleFor(x => x.CitizenId)
            .MaximumLength(50).WithMessage("Citizen ID must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.CitizenId));

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(30, 250).WithMessage("Height must be between 30 and 250 cm")
            .When(x => x.HeightCm.HasValue);

        RuleFor(x => x.WeightKg)
            .InclusiveBetween(10, 300).WithMessage("Weight must be between 10 and 300 kg")
            .When(x => x.WeightKg.HasValue);

        RuleForEach(x => x.Emails).ChildRules(email =>
        {
            email.RuleFor(e => e.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Invalid email format")
                .MaximumLength(255).WithMessage("Email must be less than 255 characters");
        }).When(x => x.Emails != null);

        RuleForEach(x => x.PhoneNumbers).ChildRules(phone =>
        {
            phone.RuleFor(p => p.Number)
                .NotEmpty().WithMessage("Phone number is required")
                .MaximumLength(50).WithMessage("Phone number must be less than 50 characters");
        }).When(x => x.PhoneNumbers != null);

        RuleForEach(x => x.ImportantDates).ChildRules(date =>
        {
            date.RuleFor(d => d.Title)
                .NotEmpty().WithMessage("Title is required when no predefined type is selected")
                .When(d => string.IsNullOrEmpty(d.Type));
            date.RuleFor(d => d.Title)
                .MaximumLength(100).WithMessage("Title must be less than 100 characters");
        }).When(x => x.ImportantDates != null);
    }
}

