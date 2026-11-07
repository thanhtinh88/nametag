using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventPersonConfiguration : IEntityTypeConfiguration<EventPerson>
{
    public void Configure(EntityTypeBuilder<EventPerson> builder)
    {
        builder.ToTable("person_events");

        builder.HasKey(ep => ep.Id);

        builder.Property(ep => ep.InvolvementType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("SUSPECT");

        builder.Property(ep => ep.VerificationStatus)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("HYPOTHESIS");

        builder.Property(ep => ep.Confidence)
            .HasMaxLength(50);

        builder.Property(ep => ep.Role)
            .HasMaxLength(100);

        builder.Property(ep => ep.ReasonForSuspicion)
            .HasColumnType("text");

        builder.Property(ep => ep.Alibi)
            .HasColumnType("text");

        builder.Property(ep => ep.Notes)
            .HasColumnType("text");

        builder.HasIndex(ep => ep.PersonId);
        builder.HasIndex(ep => ep.EventId);
        builder.HasIndex(ep => new { ep.PersonId, ep.DeletedAt });
        builder.HasIndex(ep => new { ep.EventId, ep.DeletedAt });

        builder.HasOne(ep => ep.Person)
            .WithMany(p => p.Events)
            .HasForeignKey(ep => ep.PersonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ep => ep.Event)
            .WithMany(e => e.People)
            .HasForeignKey(ep => ep.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

