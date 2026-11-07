using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class JournalEntryPersonConfiguration : IEntityTypeConfiguration<JournalEntryPerson>
{
    public void Configure(EntityTypeBuilder<JournalEntryPerson> builder)
    {
        builder.ToTable("journal_entry_people");

        builder.HasKey(jp => jp.Id);

        builder.HasIndex(jp => new { jp.JournalEntryId, jp.PersonId })
            .IsUnique();

        builder.HasIndex(jp => jp.PersonId);

        builder.HasOne(jp => jp.JournalEntry)
            .WithMany(j => j.People)
            .HasForeignKey(jp => jp.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(jp => jp.Person)
            .WithMany(p => p.JournalEntries)
            .HasForeignKey(jp => jp.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

