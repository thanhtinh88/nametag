using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class RelationshipConfiguration : IEntityTypeConfiguration<Relationship>
{
    public void Configure(EntityTypeBuilder<Relationship> builder)
    {
        builder.ToTable("relationships");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.VerificationStatus)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("CONFIRMED");

        builder.Property(r => r.Confidence)
            .HasMaxLength(50)
            .HasDefaultValue("HIGH");

        builder.Property(r => r.Source)
            .HasMaxLength(1000);

        builder.Property(r => r.Notes)
            .HasMaxLength(1000);

        builder.HasIndex(r => r.PersonId);
        builder.HasIndex(r => r.RelatedPersonId);
        builder.HasIndex(r => r.RelationshipTypeId);
        builder.HasIndex(r => r.VerificationStatus);
        builder.HasIndex(r => new { r.PersonId, r.DeletedAt });

        builder.HasOne(r => r.Person)
            .WithMany(p => p.Relationships)
            .HasForeignKey(r => r.PersonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.RelatedPerson)
            .WithMany(p => p.RelatedRelationships)
            .HasForeignKey(r => r.RelatedPersonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.RelationshipType)
            .WithMany(rt => rt.Relationships)
            .HasForeignKey(r => r.RelationshipTypeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

