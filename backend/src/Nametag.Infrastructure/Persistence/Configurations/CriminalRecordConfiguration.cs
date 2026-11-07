using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class CriminalRecordConfiguration : IEntityTypeConfiguration<CriminalRecord>
{
    public void Configure(EntityTypeBuilder<CriminalRecord> builder)
    {
        builder.ToTable("criminal_records");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Charge)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(r => r.RecordType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("CONVICTION");

        builder.Property(r => r.SentenceDetail)
            .HasMaxLength(500);

        builder.Property(r => r.AdjudicatedBy)
            .HasMaxLength(255);

        builder.Property(r => r.IsPardoned)
            .HasDefaultValue(false);

        builder.Property(r => r.Notes)
            .HasColumnType("text");

        builder.HasIndex(r => r.PersonId);
        builder.HasIndex(r => r.RecordType);
        builder.HasIndex(r => new { r.PersonId, r.DeletedAt });

        builder.HasOne(r => r.Person)
            .WithMany(p => p.CriminalRecords)
            .HasForeignKey(r => r.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

