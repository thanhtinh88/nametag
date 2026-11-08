using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Cron;
using Nametag.Domain.Entities;

namespace Nametag.Application.Services;

public class PurgeDeletedService : IPurgeDeletedService
{
    private readonly IAppDbContext _context;
    private readonly IPhotoStorageService _photoStorageService;
    private readonly ILogger<PurgeDeletedService> _logger;

    public PurgeDeletedService(
        IAppDbContext context,
        IPhotoStorageService photoStorageService,
        ILogger<PurgeDeletedService> logger)
    {
        _context = context;
        _photoStorageService = photoStorageService;
        _logger = logger;
    }

    public async Task<PurgeDeletedResultDto> PurgeDeletedAsync(int retentionDays = 30, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var cronLog = new CronJobLog
        {
            Id = Guid.CreateVersion7(),
            JobName = "purge-deleted",
            Status = "started",
            ExecutedAt = DateTime.UtcNow
        };
        _context.CronJobLogs.Add(cronLog);
        await _context.SaveChangesAsync(cancellationToken);

        var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
        var purged = new PurgedCountsDto();

        try
        {
            // 1. Purge ImportantDates soft-deleted past retention
            var expiredDates = await _context.ImportantDates
                .IgnoreQueryFilters()
                .Where(d => d.DeletedAt != null && d.DeletedAt < cutoffDate)
                .ToListAsync(cancellationToken);
            if (expiredDates.Count > 0)
            {
                _context.ImportantDates.RemoveRange(expiredDates);
                purged.ImportantDates += expiredDates.Count;
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 2. Get persons to be purged
            var expiredPeople = await _context.People
                .IgnoreQueryFilters()
                .Where(p => p.DeletedAt != null && p.DeletedAt < cutoffDate)
                .Select(p => new { p.Id, p.UserId })
                .ToListAsync(cancellationToken);
            var personIds = expiredPeople.Select(p => p.Id).ToList();

            // Delete photos
            foreach (var p in expiredPeople)
            {
                await _photoStorageService.DeletePersonPhotoAsync(p.UserId, p.Id, cancellationToken);
            }

            // 3. Delete PersonGroups for persons being purged
            if (personIds.Count > 0)
            {
                var personGroups = await _context.PersonGroups
                    .IgnoreQueryFilters()
                    .Where(pg => personIds.Contains(pg.PersonId))
                    .ToListAsync(cancellationToken);
                if (personGroups.Count > 0)
                {
                    _context.PersonGroups.RemoveRange(personGroups);
                    purged.PersonGroups += personGroups.Count;
                }

                var orphanedDates = await _context.ImportantDates
                    .IgnoreQueryFilters()
                    .Where(d => personIds.Contains(d.PersonId))
                    .ToListAsync(cancellationToken);
                if (orphanedDates.Count > 0)
                {
                    _context.ImportantDates.RemoveRange(orphanedDates);
                    purged.ImportantDates += orphanedDates.Count;
                }

                await _context.SaveChangesAsync(cancellationToken);
            }

            // 4. Purge Relationships soft-deleted past retention
            var expiredRelationships = await _context.Relationships
                .IgnoreQueryFilters()
                .Where(r => r.DeletedAt != null && r.DeletedAt < cutoffDate)
                .ToListAsync(cancellationToken);
            if (expiredRelationships.Count > 0)
            {
                _context.Relationships.RemoveRange(expiredRelationships);
                purged.Relationships += expiredRelationships.Count;
            }

            if (personIds.Count > 0)
            {
                var orphanedRelationships = await _context.Relationships
                    .IgnoreQueryFilters()
                    .Where(r => personIds.Contains(r.PersonId) || personIds.Contains(r.RelatedPersonId))
                    .ToListAsync(cancellationToken);
                if (orphanedRelationships.Count > 0)
                {
                    _context.Relationships.RemoveRange(orphanedRelationships);
                    purged.Relationships += orphanedRelationships.Count;
                }
            }
            await _context.SaveChangesAsync(cancellationToken);

            // 5. Get Groups to be purged
            var expiredGroups = await _context.Groups
                .IgnoreQueryFilters()
                .Where(g => g.DeletedAt != null && g.DeletedAt < cutoffDate)
                .Select(g => g.Id)
                .ToListAsync(cancellationToken);

            if (expiredGroups.Count > 0)
            {
                var groupPersonGroups = await _context.PersonGroups
                    .IgnoreQueryFilters()
                    .Where(pg => expiredGroups.Contains(pg.GroupId))
                    .ToListAsync(cancellationToken);
                if (groupPersonGroups.Count > 0)
                {
                    _context.PersonGroups.RemoveRange(groupPersonGroups);
                    purged.PersonGroups += groupPersonGroups.Count;
                }

                var groupsToDelete = await _context.Groups
                    .IgnoreQueryFilters()
                    .Where(g => expiredGroups.Contains(g.Id))
                    .ToListAsync(cancellationToken);
                _context.Groups.RemoveRange(groupsToDelete);
                purged.Groups += groupsToDelete.Count;
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 6. Get RelationshipTypes to be purged
            var expiredRelTypes = await _context.RelationshipTypes
                .IgnoreQueryFilters()
                .Where(rt => rt.DeletedAt != null && rt.DeletedAt < cutoffDate)
                .Select(rt => rt.Id)
                .ToListAsync(cancellationToken);

            if (expiredRelTypes.Count > 0)
            {
                var peopleWithRel = await _context.People
                    .IgnoreQueryFilters()
                    .Where(p => p.RelationshipToUserId != null && expiredRelTypes.Contains(p.RelationshipToUserId.Value))
                    .ToListAsync(cancellationToken);
                foreach (var p in peopleWithRel)
                {
                    p.RelationshipToUserId = null;
                }

                var relsWithType = await _context.Relationships
                    .IgnoreQueryFilters()
                    .Where(r => r.RelationshipTypeId != null && expiredRelTypes.Contains(r.RelationshipTypeId.Value))
                    .ToListAsync(cancellationToken);
                foreach (var r in relsWithType)
                {
                    r.RelationshipTypeId = null;
                }

                var inverseRelTypes = await _context.RelationshipTypes
                    .IgnoreQueryFilters()
                    .Where(rt => rt.InverseId != null && expiredRelTypes.Contains(rt.InverseId.Value))
                    .ToListAsync(cancellationToken);
                foreach (var rt in inverseRelTypes)
                {
                    rt.InverseId = null;
                }

                var typesToDelete = await _context.RelationshipTypes
                    .IgnoreQueryFilters()
                    .Where(rt => expiredRelTypes.Contains(rt.Id))
                    .ToListAsync(cancellationToken);
                _context.RelationshipTypes.RemoveRange(typesToDelete);
                purged.RelationshipTypes += typesToDelete.Count;
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 7. Finally purge Persons that are soft-deleted past retention
            if (personIds.Count > 0)
            {
                var peopleToDelete = await _context.People
                    .IgnoreQueryFilters()
                    .Where(p => personIds.Contains(p.Id))
                    .ToListAsync(cancellationToken);
                _context.People.RemoveRange(peopleToDelete);
                purged.People += peopleToDelete.Count;
                await _context.SaveChangesAsync(cancellationToken);
            }

            stopwatch.Stop();
            var durationMs = (int)stopwatch.ElapsedMilliseconds;
            var totalPurged = purged.ImportantDates + purged.PersonGroups + purged.Relationships + purged.Groups + purged.RelationshipTypes + purged.People;

            cronLog.Status = "completed";
            cronLog.Duration = durationMs;
            cronLog.Message = $"Purged {totalPurged} records ({purged.People} people, {purged.Groups} groups, {purged.Relationships} relationships, {purged.RelationshipTypes} relationship types, {purged.ImportantDates} important dates, {purged.PersonGroups} person-groups)";
            await _context.SaveChangesAsync(cancellationToken);

            return new PurgeDeletedResultDto
            {
                Success = true,
                Purged = purged,
                RetentionDays = retentionDays,
                CutoffDate = cutoffDate.ToString("o")
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            cronLog.Status = "failed";
            cronLog.Duration = (int)stopwatch.ElapsedMilliseconds;
            cronLog.Message = ex.Message;
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogError(ex, "Purge deleted records failed");
            throw;
        }
    }
}
