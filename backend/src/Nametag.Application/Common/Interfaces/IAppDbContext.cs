using Microsoft.EntityFrameworkCore;
using Nametag.Domain.Entities;

namespace Nametag.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Person> People { get; }
    DbSet<PersonEmail> PersonEmails { get; }
    DbSet<PersonPhone> PersonPhones { get; }
    DbSet<PersonAddress> PersonAddresses { get; }
    DbSet<PersonSocialProfile> PersonSocialProfiles { get; }
    DbSet<PersonCustomField> PersonCustomFields { get; }
    DbSet<ImportantDate> ImportantDates { get; }
    DbSet<Group> Groups { get; }
    DbSet<PersonGroup> PersonGroups { get; }
    DbSet<Relationship> Relationships { get; }
    DbSet<RelationshipType> RelationshipTypes { get; }
    DbSet<Event> Events { get; }
    DbSet<EventGroup> EventGroups { get; }
    DbSet<EventPerson> EventPersons { get; }
    DbSet<EventLocation> EventLocations { get; }
    DbSet<EventUrl> EventUrls { get; }
    DbSet<EventCustomField> EventCustomFields { get; }
    DbSet<JournalEntry> JournalEntries { get; }
    DbSet<JournalEntryPerson> JournalEntryPeople { get; }
    DbSet<JournalEntryEvent> JournalEntryEvents { get; }
    DbSet<Gang> Gangs { get; }
    DbSet<GangMembership> GangMemberships { get; }
    DbSet<CustomFieldTemplate> CustomFieldTemplates { get; }
    DbSet<PersonCustomFieldValue> PersonCustomFieldValues { get; }
    DbSet<SuspectVehicle> SuspectVehicles { get; }
    DbSet<PhysicalMark> PhysicalMarks { get; }
    DbSet<CriminalRecord> CriminalRecords { get; }
    DbSet<SuspectBankAccount> SuspectBankAccounts { get; }
    DbSet<DuplicateDismissal> DuplicateDismissals { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

