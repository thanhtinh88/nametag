using System.Text.Json.Serialization;

namespace Nametag.Application.DTOs.User;

public class ExportUserInfoDto
{
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? Theme { get; set; }
    public string? DateFormat { get; set; }
    public DateTime? AccountCreated { get; set; }
}

public class ExportGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
}

public class ExportImportantDateDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}

public class ExportContactFieldDto
{
    public string Type { get; set; } = string.Empty;
    public string? Number { get; set; }
    public string? Email { get; set; }
    public string? Url { get; set; }
    public string? Protocol { get; set; }
    public string? Handle { get; set; }
}

public class ExportAddressDto
{
    public string Type { get; set; } = string.Empty;
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
}

public class ExportLocationDto
{
    public string Type { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Label { get; set; }
}

public class ExportCustomFieldDto
{
    public string Key { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string? Type { get; set; }
}

public class ExportCustomFieldValueDto
{
    public string Slug { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class ExportRelationshipTypeDto
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class ExportPersonRelationshipDto
{
    public Guid RelatedPersonId { get; set; }
    public string? RelatedPersonName { get; set; }
    public ExportRelationshipTypeDto? RelationshipType { get; set; }
    public string? Notes { get; set; }
}

public class ExportPersonDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string? SecondLastName { get; set; }
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? Photo { get; set; }
    public string? Gender { get; set; }
    public DateTime? Anniversary { get; set; }
    public DateTime? LastContact { get; set; }
    public string? Notes { get; set; }
    public bool ContactReminderEnabled { get; set; }
    public int? ContactReminderInterval { get; set; }
    public string? ContactReminderIntervalUnit { get; set; }
    public List<ExportImportantDateDto> ImportantDates { get; set; } = new();
    public List<ExportContactFieldDto> PhoneNumbers { get; set; } = new();
    public List<ExportContactFieldDto> Emails { get; set; } = new();
    public List<ExportAddressDto> Addresses { get; set; } = new();
    public List<ExportContactFieldDto> Urls { get; set; } = new();
    public List<ExportContactFieldDto> ImHandles { get; set; } = new();
    public List<ExportLocationDto> Locations { get; set; } = new();
    public List<ExportCustomFieldDto> CustomFields { get; set; } = new();
    public List<ExportCustomFieldValueDto> CustomFieldValues { get; set; } = new();
    public ExportRelationshipTypeDto? RelationshipToUser { get; set; }
    public List<string> Groups { get; set; } = new();
    public List<ExportPersonRelationshipDto> Relationships { get; set; } = new();
}

public class FullRelationshipTypeExportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Color { get; set; }
    public Guid? InverseId { get; set; }
}

public class ExportJournalEntryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string? Body { get; set; }
    public List<string> People { get; set; } = new();
    public List<Guid> PeopleIds { get; set; } = new();
}

public class ExportCustomFieldTemplateDto
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int Order { get; set; }
}

public class UserExportDataDto
{
    public string Version { get; set; } = "1.2";
    public string ExportDate { get; set; } = DateTime.UtcNow.ToString("o");
    public ExportUserInfoDto User { get; set; } = new();
    public List<ExportGroupDto> Groups { get; set; } = new();
    public List<ExportPersonDto> People { get; set; } = new();
    public List<FullRelationshipTypeExportDto> RelationshipTypes { get; set; } = new();
    public List<ExportJournalEntryDto> JournalEntries { get; set; } = new();
    public List<ExportCustomFieldTemplateDto> CustomFieldTemplates { get; set; } = new();
    public List<object> NotificationEndpoints { get; set; } = new();
    public List<object> PushSubscriptions { get; set; } = new();
}

public class ImportDataRequest
{
    public List<ExportGroupDto> Groups { get; set; } = new();
    public List<ExportPersonDto> People { get; set; } = new();
    public List<FullRelationshipTypeExportDto>? RelationshipTypes { get; set; }
    public List<FullRelationshipTypeExportDto>? CustomRelationshipTypes { get; set; }
    public List<ExportJournalEntryDto>? JournalEntries { get; set; }
    public List<ExportCustomFieldTemplateDto>? CustomFieldTemplates { get; set; }
    public List<Guid>? GroupIds { get; set; }
}

public class ImportValidateResponseDto
{
    public bool Valid { get; set; } = true;
    public int NewPeopleCount { get; set; }
    public int NewGroupsCount { get; set; }
    public int JournalEntries { get; set; }
    public int CurrentPeople { get; set; }
    public int CurrentGroups { get; set; }
    public int? PeopleLimit { get; set; }
    public int? GroupsLimit { get; set; }
}

public class ImportCountsDto
{
    public int Groups { get; set; }
    public int People { get; set; }
    public int RelationshipTypes { get; set; }
    public int JournalEntries { get; set; }
    public int CustomFieldTemplates { get; set; }
}

public class ImportResponseDto
{
    public bool Success { get; set; } = true;
    public ImportCountsDto Imported { get; set; } = new();
}

