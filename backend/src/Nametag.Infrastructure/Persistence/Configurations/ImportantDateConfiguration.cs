using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class ImportantDateConfiguration : IEntityTypeConfiguration<ImportantDate>
{
    public void Configure(EntityTypeBuilder<ImportantDate> builder)
    {
        builder.ToTable("important_dates");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.Title)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(d => d.Type)
            .HasMaxLength(50);

        builder.Property(d => d.ReminderType)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(d => d.ReminderIntervalUnit)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(d => d.PersonId);
        builder.HasIndex(d => d.UserId);

        builder.HasOne(d => d.Person)
            .WithMany(p => p.ImportantDates)
            .HasForeignKey(d => d.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

