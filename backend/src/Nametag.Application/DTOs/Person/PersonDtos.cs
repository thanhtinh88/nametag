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

// ─── Sub-resource: Suspect Vehicles ──────────────────────────────────────────

public class SuspectVehicleDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public string PlateNumber { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string? BrandModel { get; set; }
    public string? Color { get; set; }
    public string? IdentifyingFeatures { get; set; }
    public string? RegisteredOwner { get; set; }
    public bool IsSuspicious { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSuspectVehicleRequest
{
    public string PlateNumber { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string? BrandModel { get; set; }
    public string? Color { get; set; }
    public string? IdentifyingFeatures { get; set; }
    public string? RegisteredOwner { get; set; }
    public bool? IsSuspicious { get; set; }
}

public class UpdateSuspectVehicleRequest
{
    public string? PlateNumber { get; set; }
    public string? VehicleType { get; set; }
    public string? BrandModel { get; set; }
    public string? Color { get; set; }
    public string? IdentifyingFeatures { get; set; }
    public string? RegisteredOwner { get; set; }
    public bool? IsSuspicious { get; set; }
}

// ─── Sub-resource: Physical Marks ─────────────────────────────────────────────

public class PhysicalMarkDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePhysicalMarkRequest
{
    public string Type { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}

public class UpdatePhysicalMarkRequest
{
    public string? Type { get; set; }
    public string? Location { get; set; }
    public string? Description { get; set; }
    public string? PhotoUrl { get; set; }
}

// ─── Sub-resource: Criminal Records ───────────────────────────────────────────

public class CriminalRecordDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public string Charge { get; set; } = string.Empty;
    public string RecordType { get; set; } = "CONVICTION";
    public string? SentenceDetail { get; set; }
    public string? AdjudicatedBy { get; set; }
    public DateTime? IncidentDate { get; set; }
    public DateTime? VerdictDate { get; set; }
    public bool IsPardoned { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCriminalRecordRequest
{
    public string Charge { get; set; } = string.Empty;
    public string? RecordType { get; set; } = "CONVICTION";
    public string? SentenceDetail { get; set; }
    public string? AdjudicatedBy { get; set; }
    public DateTime? IncidentDate { get; set; }
    public DateTime? VerdictDate { get; set; }
    public bool? IsPardoned { get; set; }
    public string? Notes { get; set; }
}

public class UpdateCriminalRecordRequest
{
    public string? Charge { get; set; }
    public string? RecordType { get; set; }
    public string? SentenceDetail { get; set; }
    public string? AdjudicatedBy { get; set; }
    public DateTime? IncidentDate { get; set; }
    public DateTime? VerdictDate { get; set; }
    public bool? IsPardoned { get; set; }
    public string? Notes { get; set; }
}

// ─── Sub-resource: Bank Accounts ──────────────────────────────────────────────

public class SuspectBankAccountDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountHolder { get; set; }
    public string AccountType { get; set; } = "OWNER";
    public bool IsPrimary { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSuspectBankAccountRequest
{
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountHolder { get; set; }
    public string? AccountType { get; set; } = "OWNER";
    public bool? IsPrimary { get; set; }
    public string? Notes { get; set; }
}

public class UpdateSuspectBankAccountRequest
{
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public string? AccountHolder { get; set; }
    public string? AccountType { get; set; }
    public bool? IsPrimary { get; set; }
    public string? Notes { get; set; }
}

// ─── Investigation: Duplicates ────────────────────────────────────────────────

public class DismissDuplicateRequest
{
    public Guid PersonAId { get; set; }
    public Guid PersonBId { get; set; }
}

public class DuplicateCandidateDto
{
    public Guid PersonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public double Similarity { get; set; }
}

public class DuplicatePersonItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
}

public class DuplicateGroupDto
{
    public List<DuplicatePersonItemDto> People { get; set; } = new();
    public double Similarity { get; set; }
}

// ─── Investigation: Merge ─────────────────────────────────────────────────────

public class MergeOverridesDto
{
    public string? Name { get; set; }
    public string? Surname { get; set; }
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? Gender { get; set; }
    public string? Photo { get; set; }
    public string? Notes { get; set; }
    public DateTime? Anniversary { get; set; }
    public DateTime? LastContact { get; set; }
    public Guid? RelationshipToUserId { get; set; }
}

public class MergePeopleRequest
{
    public Guid PrimaryId { get; set; }
    public Guid SecondaryId { get; set; }
    public MergeOverridesDto? FieldOverrides { get; set; }
}

// ─── Investigation: Orphans ───────────────────────────────────────────────────

public class PersonOrphanDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
}

public class BulkOrphansRequest
{
    public List<Guid>? PersonIds { get; set; }
    public bool SelectAll { get; set; } = false;
}

public class BulkOrphansResponse
{
    public List<PersonOrphanDto> Orphans { get; set; } = new();
    public bool HasCardDavSync { get; set; } = false;
}

// ─── Investigation: Search Index ──────────────────────────────────────────────

public class PersonSearchIndexItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? Notes { get; set; }
    public string? Photo { get; set; }
    public string? CitizenId { get; set; }
    public string? ModusOperandi { get; set; }
    public string Vehicles { get; set; } = string.Empty;
    public string PhysicalMarks { get; set; } = string.Empty;
    public string CriminalRecords { get; set; } = string.Empty;
    public string Gangs { get; set; } = string.Empty;
    public string BankAccounts { get; set; } = string.Empty;
    public string Phones { get; set; } = string.Empty;
    public string Emails { get; set; } = string.Empty;
    public string Addresses { get; set; } = string.Empty;
    public string Urls { get; set; } = string.Empty;
    public string ImHandles { get; set; } = string.Empty;
    public string Groups { get; set; } = string.Empty;
    public string CustomFields { get; set; } = string.Empty;
}

// ─── Investigation: Graph ─────────────────────────────────────────────────────

public class GraphNodeDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<Guid> Groups { get; set; } = new();
    public List<string> Colors { get; set; } = new();
    public bool IsCenter { get; set; }
    public string? Photo { get; set; }
    public string? NodeType { get; set; }
    public string? EventStatus { get; set; }
}

public class GraphEdgeDto
{
    public string Source { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string? LineStyle { get; set; }
    public string? VerificationStatus { get; set; }
    public string? InvolvementType { get; set; }
    public string SourceLabel { get; set; } = string.Empty;
    public string TargetLabel { get; set; } = string.Empty;
}

public class PersonGraphResponse
{
    public List<GraphNodeDto> Nodes { get; set; } = new();
    public List<GraphEdgeDto> Edges { get; set; } = new();
}

