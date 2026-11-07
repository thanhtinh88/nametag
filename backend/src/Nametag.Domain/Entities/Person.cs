using Nametag.Domain.Common;
using Nametag.Domain.Enums;

namespace Nametag.Domain.Entities;

public class Person : BaseAuditableEntity, ISoftDeletable
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
    public bool ContactReminderEnabled { get; set; } = false;
    public int? ContactReminderInterval { get; set; }
    public ReminderIntervalUnit? ContactReminderIntervalUnit { get; set; }
    public DateTime? LastContactReminderSent { get; set; }
    public bool CardDavSyncEnabled { get; set; } = true;
    public string? DisplayNameOverride { get; set; }

    // Investigation & Subject Monitoring
    public string? CitizenId { get; set; }
    public DateTime? CitizenIdIssueDate { get; set; }
    public string? CitizenIdIssuePlace { get; set; }
    public string? ResidenceStatus { get; set; }
    public string? ManagementLevel { get; set; } = "NORMAL";
    public int? HeightCm { get; set; }
    public int? WeightKg { get; set; }
    public string? BloodType { get; set; }
    public string? ThreatLevel { get; set; } = "LOW";
    public string? ModusOperandi { get; set; }
    public string? RiskNotes { get; set; }
    public string? ImmichPersonId { get; set; }
    public string? ImmichAlbumId { get; set; }

    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public RelationshipType? RelationshipToUser { get; set; }
    public ICollection<PersonEmail> Emails { get; set; } = new List<PersonEmail>();
    public ICollection<PersonPhone> PhoneNumbers { get; set; } = new List<PersonPhone>();
    public ICollection<PersonAddress> Addresses { get; set; } = new List<PersonAddress>();
    public ICollection<PersonLocation> Locations { get; set; } = new List<PersonLocation>();
    public ICollection<PersonSocialProfile> SocialProfiles { get; set; } = new List<PersonSocialProfile>();
    public ICollection<PersonCustomField> CustomFields { get; set; } = new List<PersonCustomField>();
    public ICollection<ImportantDate> ImportantDates { get; set; } = new List<ImportantDate>();
    public ICollection<PersonGroup> Groups { get; set; } = new List<PersonGroup>();
    public ICollection<Relationship> Relationships { get; set; } = new List<Relationship>();
    public ICollection<Relationship> RelatedRelationships { get; set; } = new List<Relationship>();
    public ICollection<EventPerson> Events { get; set; } = new List<EventPerson>();
    public ICollection<JournalEntryPerson> JournalEntries { get; set; } = new List<JournalEntryPerson>();
    public ICollection<SuspectVehicle> Vehicles { get; set; } = new List<SuspectVehicle>();
    public ICollection<PhysicalMark> PhysicalMarks { get; set; } = new List<PhysicalMark>();
    public ICollection<CriminalRecord> CriminalRecords { get; set; } = new List<CriminalRecord>();
    public ICollection<SuspectBankAccount> BankAccounts { get; set; } = new List<SuspectBankAccount>();
    public ICollection<GangMembership> GangMemberships { get; set; } = new List<GangMembership>();
    public ICollection<PersonCustomFieldValue> CustomFieldValues { get; set; } = new List<PersonCustomFieldValue>();
}

