using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventLocationConfiguration : IEntityTypeConfiguration<EventLocation>
{
    public void Configure(EntityTypeBuilder<EventLocation> builder)
    {
        builder.ToTable("event_addresses");

        builder.HasKey(ea => ea.Id);

        builder.Property(ea => ea.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(ea => ea.StreetLine1)
            .HasMaxLength(255);

        builder.Property(ea => ea.StreetLine2)
            .HasMaxLength(255);

        builder.Property(ea => ea.Locality)
            .HasMaxLength(100);

        builder.Property(ea => ea.Region)
            .HasMaxLength(100);

        builder.Property(ea => ea.PostalCode)
            .HasMaxLength(50);

        builder.Property(ea => ea.Country)
            .HasMaxLength(100);

        builder.Property(ea => ea.Latitude)
            .HasColumnType("decimal(10,8)");

        builder.Property(ea => ea.Longitude)
            .HasColumnType("decimal(11,8)");

        builder.Property(ea => ea.GeocodeStatus)
            .HasMaxLength(50);

        builder.Property(ea => ea.GeocodeHash)
            .HasMaxLength(100);

        builder.HasIndex(ea => ea.EventId);
        builder.HasIndex(ea => ea.GeocodeStatus);

        builder.HasOne(ea => ea.Event)
            .WithMany(e => e.Addresses)
            .HasForeignKey(ea => ea.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

