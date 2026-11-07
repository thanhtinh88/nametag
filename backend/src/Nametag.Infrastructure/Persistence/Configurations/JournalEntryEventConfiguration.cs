using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class JournalEntryEventConfiguration : IEntityTypeConfiguration<JournalEntryEvent>
{
    public void Configure(EntityTypeBuilder<JournalEntryEvent> builder)
    {
        builder.ToTable("journal_entry_events");

        builder.HasKey(je => je.Id);

        builder.HasIndex(je => new { je.JournalEntryId, je.EventId })
            .IsUnique();

        builder.HasIndex(je => je.EventId);

        builder.HasOne(je => je.JournalEntry)
            .WithMany(j => j.Events)
            .HasForeignKey(je => je.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(je => je.Event)
            .WithMany(e => e.JournalEntries)
            .HasForeignKey(je => je.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

