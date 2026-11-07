using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class JournalEntryConfiguration : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> builder)
    {
        builder.ToTable("journal_entries");

        builder.HasKey(j => j.Id);

        builder.Property(j => j.Title)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(j => j.Body)
            .IsRequired()
            .HasColumnType("text");

        builder.HasIndex(j => new { j.UserId, j.Date });
        builder.HasIndex(j => new { j.UserId, j.DeletedAt });

        builder.HasOne(j => j.User)
            .WithMany(u => u.JournalEntries)
            .HasForeignKey(j => j.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(j => j.People)
            .WithOne(jp => jp.JournalEntry)
            .HasForeignKey(jp => jp.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(j => j.Events)
            .WithOne(je => je.JournalEntry)
            .HasForeignKey(je => je.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

