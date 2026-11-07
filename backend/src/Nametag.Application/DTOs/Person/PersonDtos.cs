using Nametag.Domain.Enums;

namespace Nametag.Application.DTOs.Person;

public class PersonEmailDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class CreatePersonEmailDto
{
    public string Type { get; set; } = "home";
    public string Email { get; set; } = string.Empty;
}

public class PersonPhoneDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
}

public class CreatePersonPhoneDto
{
    public string Type { get; set; } = "home";
    public string Number { get; set; } = string.Empty;
}

public class PersonAddressDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? GeocodedAt { get; set; }
    public string? GeocodeStatus { get; set; }
}

public class CreatePersonAddressDto
{
    public string Type { get; set; } = "home";
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class PersonSocialProfileDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "url";
    public string? Url { get; set; }
    public string? Network { get; set; }
    public string? Username { get; set; }
}

public class CreatePersonSocialProfileDto
{
    public string Type { get; set; } = "url";
    public string? Url { get; set; }
    public string? Network { get; set; }
    public string? Username { get; set; }
}

public class PersonUrlDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "url";
    public string Url { get; set; } = string.Empty;
}

public class CreatePersonUrlDto
{
    public string Type { get; set; } = "url";
    public string Url { get; set; } = string.Empty;
}

public class PersonImHandleDto
{
    public Guid Id { get; set; }
    public string Protocol { get; set; } = string.Empty;
    public string Handle { get; set; } = string.Empty;
}

public class CreatePersonImHandleDto
{
    public string Protocol { get; set; } = string.Empty;
    public string Handle { get; set; } = string.Empty;
}

public class PersonCustomFieldDto
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Type { get; set; }
}

public class CreatePersonCustomFieldDto
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Type { get; set; }
}

public class ImportantDateDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }
    public DateTime Date { get; set; }
    public bool YearUnknown { get; set; }
    public bool ReminderEnabled { get; set; }
    public ReminderType? ReminderType { get; set; }
    public int? ReminderInterval { get; set; }
    public ReminderIntervalUnit? ReminderIntervalUnit { get; set; }
    public int? ReminderLeadDays { get; set; }
    public DateTime? LastReminderSent { get; set; }
    public DateTime? LastLeadReminderSent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateImportantDateDto
{
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }
    public DateTime Date { get; set; }
    public bool? YearUnknown { get; set; }
    public bool? ReminderEnabled { get; set; }
    public ReminderType? ReminderType { get; set; }
    public int? ReminderInterval { get; set; }
    public ReminderIntervalUnit? ReminderIntervalUnit { get; set; }
    public int? ReminderLeadDays { get; set; }
}

public class PersonSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? Photo { get; set; }
}

public class PaginationDto
{
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
    public bool HasMore { get; set; }
}

public class PersonDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Nickname { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public string? Uid { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? Photo { get; set; }
    public string? Gender { get; set; }
    public DateTime? Anniversary { get; set; }
    public DateTime? LastContact { get; set; }
    public string? Notes { get; set; }
    public Guid? RelationshipToUserId { get; set; }
    public bool ContactReminderEnabled { get; set; }
    public int? ContactReminderInterval { get; set; }
    public ReminderIntervalUnit? ContactReminderIntervalUnit { get; set; }
    public DateTime? LastContactReminderSent { get; set; }
    public bool CardDavSyncEnabled { get; set; }
    public string? DisplayNameOverride { get; set; }

    // Investigation Fields
    public string? CitizenId { get; set; }
    public DateTime? CitizenIdIssueDate { get; set; }
    public string? CitizenIdIssuePlace { get; set; }
    public string? ResidenceStatus { get; set; }
    public string? ManagementLevel { get; set; }
    public int? HeightCm { get; set; }
    public int? WeightKg { get; set; }
    public string? BloodType { get; set; }
    public string? ThreatLevel { get; set; }
    public string? ModusOperandi { get; set; }
    public string? RiskNotes { get; set; }
    public string? ImmichPersonId { get; set; }
    public string? ImmichAlbumId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Multi-value collections
    public List<PersonEmailDto> Emails { get; set; } = new();
    public List<PersonPhoneDto> PhoneNumbers { get; set; } = new();
    public List<PersonAddressDto> Addresses { get; set; } = new();
    public List<PersonSocialProfileDto> SocialProfiles { get; set; } = new();
    public List<PersonUrlDto> Urls { get; set; } = new();
    public List<PersonImHandleDto> ImHandles { get; set; } = new();
    public List<PersonCustomFieldDto> CustomFields { get; set; } = new();
    public List<ImportantDateDto> ImportantDates { get; set; } = new();

    // Frontend compatibility collections
    public List<object> Groups { get; set; } = new();
    public List<object> RelationshipsFrom { get; set; } = new();
    public List<object> RelationshipsTo { get; set; } = new();
    public List<object> CustomFieldValues { get; set; } = new();
}

public class PersonListResponse
{
    public List<PersonDto> People { get; set; } = new();
    public PaginationDto? Pagination { get; set; }
}

public class CreatePersonRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Nickname { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public string? Uid { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? Photo { get; set; }
    public string? Gender { get; set; }
    public DateTime? Anniversary { get; set; }
    public DateTime? LastContact { get; set; }
    public string? Notes { get; set; }
    public Guid? RelationshipToUserId { get; set; }
    public bool? ContactReminderEnabled { get; set; }
    public int? ContactReminderInterval { get; set; }
    public ReminderIntervalUnit? ContactReminderIntervalUnit { get; set; }
    public bool? CardDavSyncEnabled { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? CardDavDisplayName { get; set; }

    // Investigation Fields
    public string? CitizenId { get; set; }
    public DateTime? CitizenIdIssueDate { get; set; }
    public string? CitizenIdIssuePlace { get; set; }
    public string? ResidenceStatus { get; set; }
    public string? ManagementLevel { get; set; }
    public int? HeightCm { get; set; }
    public int? WeightKg { get; set; }
    public string? BloodType { get; set; }
    public string? ThreatLevel { get; set; }
    public string? ModusOperandi { get; set; }
    public string? RiskNotes { get; set; }
    public string? ImmichPersonId { get; set; }
    public string? ImmichAlbumId { get; set; }

    // Multi-value fields
    public List<CreatePersonEmailDto>? Emails { get; set; }
    public List<CreatePersonPhoneDto>? PhoneNumbers { get; set; }
    public List<CreatePersonAddressDto>? Addresses { get; set; }
    public List<CreatePersonSocialProfileDto>? SocialProfiles { get; set; }
    public List<CreatePersonUrlDto>? Urls { get; set; }
    public List<CreatePersonImHandleDto>? ImHandles { get; set; }
    public List<CreatePersonCustomFieldDto>? CustomFields { get; set; }
    public List<CreateImportantDateDto>? ImportantDates { get; set; }
    public List<Guid>? GroupIds { get; set; }
}

public class UpdatePersonRequest
{
    public string? Name { get; set; }
    public string? Surname { get; set; }
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Nickname { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public string? Uid { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? Photo { get; set; }
    public string? Gender { get; set; }
    public DateTime? Anniversary { get; set; }
    public DateTime? LastContact { get; set; }
    public string? Notes { get; set; }
    public Guid? RelationshipToUserId { get; set; }
    public bool? ContactReminderEnabled { get; set; }
    public int? ContactReminderInterval { get; set; }
    public ReminderIntervalUnit? ContactReminderIntervalUnit { get; set; }
    public bool? CardDavSyncEnabled { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? CardDavDisplayName { get; set; }

    // Investigation Fields
    public string? CitizenId { get; set; }
    public DateTime? CitizenIdIssueDate { get; set; }
    public string? CitizenIdIssuePlace { get; set; }
    public string? ResidenceStatus { get; set; }
    public string? ManagementLevel { get; set; }
    public int? HeightCm { get; set; }
    public int? WeightKg { get; set; }
    public string? BloodType { get; set; }
    public string? ThreatLevel { get; set; }
    public string? ModusOperandi { get; set; }
    public string? RiskNotes { get; set; }
    public string? ImmichPersonId { get; set; }
    public string? ImmichAlbumId { get; set; }

    // Multi-value fields (replaces collection when provided)
    public List<CreatePersonEmailDto>? Emails { get; set; }
    public List<CreatePersonPhoneDto>? PhoneNumbers { get; set; }
    public List<CreatePersonAddressDto>? Addresses { get; set; }
    public List<CreatePersonSocialProfileDto>? SocialProfiles { get; set; }
    public List<CreatePersonUrlDto>? Urls { get; set; }
    public List<CreatePersonImHandleDto>? ImHandles { get; set; }
    public List<CreatePersonCustomFieldDto>? CustomFields { get; set; }
    public List<CreateImportantDateDto>? ImportantDates { get; set; }
    public List<Guid>? GroupIds { get; set; }
}

public class DeletePersonRequest
{
    public bool DeleteOrphans { get; set; } = false;
    public List<Guid>? OrphanIds { get; set; }
    public bool DeleteFromCardDav { get; set; } = false;
}

