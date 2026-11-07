using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PhysicalMarkConfiguration : IEntityTypeConfiguration<PhysicalMark>
{
    public void Configure(EntityTypeBuilder<PhysicalMark> builder)
    {
        builder.ToTable("physical_marks");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(m => m.Location)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(m => m.Description)
            .IsRequired()
            .HasColumnType("text");

        builder.Property(m => m.PhotoUrl)
            .HasMaxLength(500);

        builder.HasIndex(m => m.PersonId);
        builder.HasIndex(m => m.Type);
        builder.HasIndex(m => new { m.PersonId, m.DeletedAt });

        builder.HasOne(m => m.Person)
            .WithMany(p => p.PhysicalMarks)
            .HasForeignKey(m => m.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

