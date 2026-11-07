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

// ─── Sub-resource Validators ─────────────────────────────────────────────────

public class CreateSuspectVehicleRequestValidator : AbstractValidator<CreateSuspectVehicleRequest>
{
    public CreateSuspectVehicleRequestValidator()
    {
        RuleFor(x => x.PlateNumber)
            .NotEmpty().WithMessage("Plate number is required")
            .MaximumLength(30).WithMessage("Plate number must be less than 30 characters");

        RuleFor(x => x.VehicleType)
            .NotEmpty().WithMessage("Vehicle type is required")
            .MaximumLength(50).WithMessage("Vehicle type must be less than 50 characters");

        RuleFor(x => x.BrandModel)
            .MaximumLength(100).WithMessage("Brand model must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.BrandModel));

        RuleFor(x => x.Color)
            .MaximumLength(50).WithMessage("Color must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Color));

        RuleFor(x => x.IdentifyingFeatures)
            .MaximumLength(500).WithMessage("Identifying features must be less than 500 characters")
            .When(x => !string.IsNullOrEmpty(x.IdentifyingFeatures));

        RuleFor(x => x.RegisteredOwner)
            .MaximumLength(100).WithMessage("Registered owner must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.RegisteredOwner));
    }
}

public class UpdateSuspectVehicleRequestValidator : AbstractValidator<UpdateSuspectVehicleRequest>
{
    public UpdateSuspectVehicleRequestValidator()
    {
        RuleFor(x => x.PlateNumber)
            .NotEmpty().WithMessage("Plate number cannot be empty")
            .MaximumLength(30).WithMessage("Plate number must be less than 30 characters")
            .When(x => x.PlateNumber != null);

        RuleFor(x => x.VehicleType)
            .NotEmpty().WithMessage("Vehicle type cannot be empty")
            .MaximumLength(50).WithMessage("Vehicle type must be less than 50 characters")
            .When(x => x.VehicleType != null);

        RuleFor(x => x.BrandModel)
            .MaximumLength(100).WithMessage("Brand model must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.BrandModel));

        RuleFor(x => x.Color)
            .MaximumLength(50).WithMessage("Color must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Color));

        RuleFor(x => x.IdentifyingFeatures)
            .MaximumLength(500).WithMessage("Identifying features must be less than 500 characters")
            .When(x => !string.IsNullOrEmpty(x.IdentifyingFeatures));

        RuleFor(x => x.RegisteredOwner)
            .MaximumLength(100).WithMessage("Registered owner must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.RegisteredOwner));
    }
}

public class CreatePhysicalMarkRequestValidator : AbstractValidator<CreatePhysicalMarkRequest>
{
    public CreatePhysicalMarkRequestValidator()
    {
        RuleFor(x => x.Type)
            .NotEmpty().WithMessage("Type is required")
            .MaximumLength(50).WithMessage("Type must be less than 50 characters");

        RuleFor(x => x.Location)
            .NotEmpty().WithMessage("Location is required")
            .MaximumLength(100).WithMessage("Location must be less than 100 characters");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required")
            .MaximumLength(2000).WithMessage("Description must be less than 2000 characters");

        RuleFor(x => x.PhotoUrl)
            .MaximumLength(500).WithMessage("Photo URL must be less than 500 characters")
            .When(x => !string.IsNullOrEmpty(x.PhotoUrl));
    }
}

public class UpdatePhysicalMarkRequestValidator : AbstractValidator<UpdatePhysicalMarkRequest>
{
    public UpdatePhysicalMarkRequestValidator()
    {
        RuleFor(x => x.Type)
            .NotEmpty().WithMessage("Type cannot be empty")
            .MaximumLength(50).WithMessage("Type must be less than 50 characters")
            .When(x => x.Type != null);

        RuleFor(x => x.Location)
            .NotEmpty().WithMessage("Location cannot be empty")
            .MaximumLength(100).WithMessage("Location must be less than 100 characters")
            .When(x => x.Location != null);

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description cannot be empty")
            .MaximumLength(2000).WithMessage("Description must be less than 2000 characters")
            .When(x => x.Description != null);

        RuleFor(x => x.PhotoUrl)
            .MaximumLength(500).WithMessage("Photo URL must be less than 500 characters")
            .When(x => !string.IsNullOrEmpty(x.PhotoUrl));
    }
}

public class CreateCriminalRecordRequestValidator : AbstractValidator<CreateCriminalRecordRequest>
{
    public CreateCriminalRecordRequestValidator()
    {
        RuleFor(x => x.Charge)
            .NotEmpty().WithMessage("Charge is required")
            .MaximumLength(200).WithMessage("Charge must be less than 200 characters");

        RuleFor(x => x.RecordType)
            .MaximumLength(50).WithMessage("Record type must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.RecordType));

        RuleFor(x => x.SentenceDetail)
            .MaximumLength(500).WithMessage("Sentence detail must be less than 500 characters")
            .When(x => !string.IsNullOrEmpty(x.SentenceDetail));

        RuleFor(x => x.AdjudicatedBy)
            .MaximumLength(200).WithMessage("Adjudicated by must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.AdjudicatedBy));

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes must be less than 2000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

public class UpdateCriminalRecordRequestValidator : AbstractValidator<UpdateCriminalRecordRequest>
{
    public UpdateCriminalRecordRequestValidator()
    {
        RuleFor(x => x.Charge)
            .NotEmpty().WithMessage("Charge cannot be empty")
            .MaximumLength(200).WithMessage("Charge must be less than 200 characters")
            .When(x => x.Charge != null);

        RuleFor(x => x.RecordType)
            .MaximumLength(50).WithMessage("Record type must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.RecordType));

        RuleFor(x => x.SentenceDetail)
            .MaximumLength(500).WithMessage("Sentence detail must be less than 500 characters")
            .When(x => !string.IsNullOrEmpty(x.SentenceDetail));

        RuleFor(x => x.AdjudicatedBy)
            .MaximumLength(200).WithMessage("Adjudicated by must be less than 200 characters")
            .When(x => !string.IsNullOrEmpty(x.AdjudicatedBy));

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes must be less than 2000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

public class CreateSuspectBankAccountRequestValidator : AbstractValidator<CreateSuspectBankAccountRequest>
{
    public CreateSuspectBankAccountRequestValidator()
    {
        RuleFor(x => x.BankName)
            .NotEmpty().WithMessage("Bank name is required")
            .MaximumLength(100).WithMessage("Bank name must be less than 100 characters");

        RuleFor(x => x.AccountNumber)
            .NotEmpty().WithMessage("Account number is required")
            .MaximumLength(50).WithMessage("Account number must be less than 50 characters");

        RuleFor(x => x.AccountHolder)
            .MaximumLength(100).WithMessage("Account holder must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.AccountHolder));

        RuleFor(x => x.AccountType)
            .MaximumLength(50).WithMessage("Account type must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.AccountType));

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes must be less than 2000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

public class UpdateSuspectBankAccountRequestValidator : AbstractValidator<UpdateSuspectBankAccountRequest>
{
    public UpdateSuspectBankAccountRequestValidator()
    {
        RuleFor(x => x.BankName)
            .NotEmpty().WithMessage("Bank name cannot be empty")
            .MaximumLength(100).WithMessage("Bank name must be less than 100 characters")
            .When(x => x.BankName != null);

        RuleFor(x => x.AccountNumber)
            .NotEmpty().WithMessage("Account number cannot be empty")
            .MaximumLength(50).WithMessage("Account number must be less than 50 characters")
            .When(x => x.AccountNumber != null);

        RuleFor(x => x.AccountHolder)
            .MaximumLength(100).WithMessage("Account holder must be less than 100 characters")
            .When(x => !string.IsNullOrEmpty(x.AccountHolder));

        RuleFor(x => x.AccountType)
            .MaximumLength(50).WithMessage("Account type must be less than 50 characters")
            .When(x => !string.IsNullOrEmpty(x.AccountType));

        RuleFor(x => x.Notes)
            .MaximumLength(2000).WithMessage("Notes must be less than 2000 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}

public class CreateImportantDateDtoValidator : AbstractValidator<CreateImportantDateDto>
{
    public CreateImportantDateDtoValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required when no predefined type is selected")
            .When(x => string.IsNullOrEmpty(x.Type));

        RuleFor(x => x.Title)
            .MaximumLength(100).WithMessage("Title must be less than 100 characters");

        RuleFor(x => x.ReminderInterval)
            .InclusiveBetween(1, 99).WithMessage("Reminder interval must be between 1 and 99")
            .When(x => x.ReminderInterval.HasValue);

        RuleFor(x => x.ReminderLeadDays)
            .InclusiveBetween(0, 365).WithMessage("Reminder lead days must be between 0 and 365")
            .When(x => x.ReminderLeadDays.HasValue);
    }
}

public class DismissDuplicateRequestValidator : AbstractValidator<DismissDuplicateRequest>
{
    public DismissDuplicateRequestValidator()
    {
        RuleFor(x => x.PersonAId).NotEmpty().WithMessage("PersonAId is required");
        RuleFor(x => x.PersonBId).NotEmpty().WithMessage("PersonBId is required");
        RuleFor(x => x)
            .Must(x => x.PersonAId != x.PersonBId)
            .WithMessage("Cannot dismiss a person with themselves");
    }
}

public class MergePeopleRequestValidator : AbstractValidator<MergePeopleRequest>
{
    public MergePeopleRequestValidator()
    {
        RuleFor(x => x.PrimaryId).NotEmpty().WithMessage("PrimaryId is required");
        RuleFor(x => x.SecondaryId).NotEmpty().WithMessage("SecondaryId is required");
        RuleFor(x => x)
            .Must(x => x.PrimaryId != x.SecondaryId)
            .WithMessage("Cannot merge a person into themselves");
    }
}

public class BulkOrphansRequestValidator : AbstractValidator<BulkOrphansRequest>
{
    public BulkOrphansRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => x.SelectAll || (x.PersonIds != null && x.PersonIds.Count > 0))
            .WithMessage("Either selectAll must be true or personIds must not be empty");
    }
}


