using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonConfiguration : IEntityTypeConfiguration<Person>
{
    public void Configure(EntityTypeBuilder<Person> builder)
    {
        builder.ToTable("people");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Surname)
            .HasMaxLength(100);

        builder.Property(p => p.MiddleName)
            .HasMaxLength(100);

        builder.Property(p => p.SecondLastName)
            .HasMaxLength(100);

        builder.Property(p => p.Nickname)
            .HasMaxLength(100);

        builder.Property(p => p.Prefix)
            .HasMaxLength(50);

        builder.Property(p => p.Suffix)
            .HasMaxLength(50);

        builder.Property(p => p.Uid)
            .HasMaxLength(100);

        builder.Property(p => p.Organization)
            .HasMaxLength(200);

        builder.Property(p => p.JobTitle)
            .HasMaxLength(200);

        builder.Property(p => p.Gender)
            .HasMaxLength(50);

        builder.Property(p => p.DisplayNameOverride)
            .HasMaxLength(200);

        builder.Property(p => p.CitizenId)
            .HasMaxLength(50);

        builder.Property(p => p.CitizenIdIssuePlace)
            .HasMaxLength(200);

        builder.Property(p => p.ResidenceStatus)
            .HasMaxLength(50);

        builder.Property(p => p.ManagementLevel)
            .HasMaxLength(50)
            .HasDefaultValue("NORMAL");

        builder.Property(p => p.BloodType)
            .HasMaxLength(10);

        builder.Property(p => p.ThreatLevel)
            .HasMaxLength(50)
            .HasDefaultValue("LOW");

        builder.Property(p => p.ContactReminderIntervalUnit)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(p => p.UserId);
        builder.HasIndex(p => new { p.UserId, p.Name });
        builder.HasIndex(p => p.CitizenId);
        builder.HasIndex(p => p.ManagementLevel);
        builder.HasIndex(p => p.ThreatLevel);

        builder.HasOne(p => p.User)
            .WithMany(u => u.People)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

