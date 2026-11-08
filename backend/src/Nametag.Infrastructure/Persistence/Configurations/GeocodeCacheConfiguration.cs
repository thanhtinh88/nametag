using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class GeocodeCacheConfiguration : IEntityTypeConfiguration<GeocodeCache>
{
    public void Configure(EntityTypeBuilder<GeocodeCache> builder)
    {
        builder.ToTable("geocode_cache");

        builder.HasKey(c => c.Hash);

        builder.Property(c => c.Hash)
            .HasColumnName("hash")
            .IsRequired();

        builder.Property(c => c.Latitude)
            .HasColumnName("latitude")
            .HasPrecision(10, 8);

        builder.Property(c => c.Longitude)
            .HasColumnName("longitude")
            .HasPrecision(11, 8);

        builder.Property(c => c.Status)
            .HasColumnName("status")
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .HasColumnName("createdAt")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(c => c.UpdatedAt)
            .HasColumnName("updatedAt")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");
    }
}
