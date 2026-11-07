using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class SuspectVehicleConfiguration : IEntityTypeConfiguration<SuspectVehicle>
{
    public void Configure(EntityTypeBuilder<SuspectVehicle> builder)
    {
        builder.ToTable("suspect_vehicles");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.PlateNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(v => v.VehicleType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(v => v.BrandModel)
            .HasMaxLength(100);

        builder.Property(v => v.Color)
            .HasMaxLength(50);

        builder.Property(v => v.IdentifyingFeatures)
            .HasMaxLength(500);

        builder.Property(v => v.RegisteredOwner)
            .HasMaxLength(255);

        builder.Property(v => v.IsSuspicious)
            .HasDefaultValue(false);

        builder.HasIndex(v => v.PersonId);
        builder.HasIndex(v => v.PlateNumber);
        builder.HasIndex(v => new { v.PersonId, v.DeletedAt });

        builder.HasOne(v => v.Person)
            .WithMany(p => p.Vehicles)
            .HasForeignKey(v => v.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

