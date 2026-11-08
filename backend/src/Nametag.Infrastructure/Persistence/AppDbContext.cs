using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Interfaces;
using Nametag.Domain.Common;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ICurrentUserService? _currentUserService;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ICurrentUserService? currentUserService = null) : base(options)
    {
        _currentUserService = currentUserService;
    }

    public Guid CurrentUserId => _currentUserService?.UserId ?? Guid.Empty;

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Person> People => Set<Person>();
    public DbSet<PersonEmail> PersonEmails => Set<PersonEmail>();
    public DbSet<PersonPhone> PersonPhones => Set<PersonPhone>();
    public DbSet<PersonAddress> PersonAddresses => Set<PersonAddress>();
    public DbSet<PersonSocialProfile> PersonSocialProfiles => Set<PersonSocialProfile>();
    public DbSet<PersonCustomField> PersonCustomFields => Set<PersonCustomField>();
    public DbSet<ImportantDate> ImportantDates => Set<ImportantDate>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<PersonGroup> PersonGroups => Set<PersonGroup>();
    public DbSet<Relationship> Relationships => Set<Relationship>();
    public DbSet<RelationshipType> RelationshipTypes => Set<RelationshipType>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventGroup> EventGroups => Set<EventGroup>();
    public DbSet<EventPerson> EventPersons => Set<EventPerson>();
    public DbSet<EventLocation> EventLocations => Set<EventLocation>();
    public DbSet<EventUrl> EventUrls => Set<EventUrl>();
    public DbSet<EventCustomField> EventCustomFields => Set<EventCustomField>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryPerson> JournalEntryPeople => Set<JournalEntryPerson>();
    public DbSet<JournalEntryEvent> JournalEntryEvents => Set<JournalEntryEvent>();
    public DbSet<Gang> Gangs => Set<Gang>();
    public DbSet<GangMembership> GangMemberships => Set<GangMembership>();
    public DbSet<CustomFieldTemplate> CustomFieldTemplates => Set<CustomFieldTemplate>();
    public DbSet<PersonCustomFieldValue> PersonCustomFieldValues => Set<PersonCustomFieldValue>();
    public DbSet<SuspectVehicle> SuspectVehicles => Set<SuspectVehicle>();
    public DbSet<PhysicalMark> PhysicalMarks => Set<PhysicalMark>();
    public DbSet<CriminalRecord> CriminalRecords => Set<CriminalRecord>();
    public DbSet<SuspectBankAccount> SuspectBankAccounts => Set<SuspectBankAccount>();
    public DbSet<DuplicateDismissal> DuplicateDismissals => Set<DuplicateDismissal>();
    public DbSet<EventMapMarker> EventMapMarkers => Set<EventMapMarker>();
    public DbSet<EventMapRoute> EventMapRoutes => Set<EventMapRoute>();
    public DbSet<EventMapDrawing> EventMapDrawings => Set<EventMapDrawing>();
    public DbSet<PersonLocation> PersonLocations => Set<PersonLocation>();
    public DbSet<ImmichConnection> ImmichConnections => Set<ImmichConnection>();
    public DbSet<CronJobLog> CronJobLogs => Set<CronJobLog>();
    public DbSet<GeocodeCache> GeocodeCaches => Set<GeocodeCache>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Configure Global Query Filters for Data Scoping ("Owner") and Soft Delete
        var applyFiltersMethod = typeof(AppDbContext)
            .GetMethod(nameof(ApplyGlobalFilters), BindingFlags.NonPublic | BindingFlags.Instance);

        if (applyFiltersMethod != null)
        {
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                var clrType = entityType.ClrType;
                var isAuditable = typeof(BaseAuditableEntity).IsAssignableFrom(clrType);
                var isSoftDeletable = typeof(ISoftDeletable).IsAssignableFrom(clrType);

                if (isAuditable || isSoftDeletable)
                {
                    applyFiltersMethod
                        .MakeGenericMethod(clrType)
                        .Invoke(this, new object[] { modelBuilder, isAuditable, isSoftDeletable });
                }
            }
        }
    }

    private void ApplyGlobalFilters<TEntity>(ModelBuilder modelBuilder, bool isAuditable, bool isSoftDeletable)
        where TEntity : class
    {
        if (isAuditable && isSoftDeletable)
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
                ((BaseAuditableEntity)(object)e).UserId == CurrentUserId &&
                ((ISoftDeletable)(object)e).DeletedAt == null);
        }
        else if (isAuditable)
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
                ((BaseAuditableEntity)(object)e).UserId == CurrentUserId);
        }
        else if (isSoftDeletable)
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
                ((ISoftDeletable)(object)e).DeletedAt == null);
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries<BaseEntity>();
        var now = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default)
                {
                    entry.Entity.CreatedAt = now;
                }
                entry.Entity.UpdatedAt = now;

                if (entry.Entity is BaseAuditableEntity auditable && auditable.UserId == Guid.Empty)
                {
                    if (_currentUserService?.UserId != null)
                    {
                        auditable.UserId = _currentUserService.UserId.Value;
                    }
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
