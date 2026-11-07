using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonLocationConfiguration : IEntityTypeConfiguration<PersonLocation>
{
    public void Configure(EntityTypeBuilder<PersonLocation> builder)
    {
        builder.ToTable("person_locations");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(l => l.Latitude)
            .HasColumnType("decimal(10,8)");

        builder.Property(l => l.Longitude)
            .HasColumnType("decimal(11,8)");

        builder.Property(l => l.Label)
            .HasMaxLength(255);

        builder.HasIndex(l => l.PersonId);

        builder.HasOne(l => l.Person)
            .WithMany(p => p.Locations)
            .HasForeignKey(l => l.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

