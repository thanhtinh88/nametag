using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class RelationshipTypeConfiguration : IEntityTypeConfiguration<RelationshipType>
{
    public void Configure(EntityTypeBuilder<RelationshipType> builder)
    {
        builder.ToTable("relationship_types");

        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.Name)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(rt => rt.Label)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(rt => rt.Category)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("CRIMINAL");

        builder.Property(rt => rt.DirectionType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("BIDIRECTIONAL");

        builder.Property(rt => rt.LineStyle)
            .HasMaxLength(50)
            .HasDefaultValue("SOLID");

        builder.Property(rt => rt.Color)
            .HasMaxLength(50);

        builder.HasIndex(rt => rt.UserId);
        builder.HasIndex(rt => new { rt.UserId, rt.DeletedAt });

        builder.HasOne(rt => rt.User)
            .WithMany(u => u.RelationshipTypes)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(rt => rt.Inverse)
            .WithMany(rt => rt.InverseOf)
            .HasForeignKey(rt => rt.InverseId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(rt => rt.PeopleWithRelation)
            .WithOne(p => p.RelationshipToUser)
            .HasForeignKey(p => p.RelationshipToUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

