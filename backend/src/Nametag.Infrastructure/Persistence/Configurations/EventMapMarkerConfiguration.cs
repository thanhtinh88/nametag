using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventMapMarkerConfiguration : IEntityTypeConfiguration<EventMapMarker>
{
    public void Configure(EntityTypeBuilder<EventMapMarker> builder)
    {
        builder.ToTable("event_map_markers");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.MarkerType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("CAMERA");

        builder.Property(m => m.Label)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(m => m.Description)
            .HasColumnType("text");

        builder.Property(m => m.Latitude)
            .HasColumnType("decimal(10,8)");

        builder.Property(m => m.Longitude)
            .HasColumnType("decimal(11,8)");

        builder.Property(m => m.Color)
            .HasMaxLength(50);

        builder.Property(m => m.MediaUrl)
            .HasColumnType("text");

        builder.Property(m => m.MediaType)
            .HasMaxLength(20)
            .HasDefaultValue("IMAGE");

        builder.Property(m => m.CameraStatus)
            .HasMaxLength(50)
            .HasDefaultValue("CAPTURED");

        builder.Property(m => m.RawTimeNote)
            .HasMaxLength(300);

        builder.Property(m => m.BtsCode)
            .HasMaxLength(150);

        builder.Property(m => m.BtsCarrier)
            .HasMaxLength(100);

        builder.Property(m => m.SubscriberInfo)
            .HasMaxLength(200);

        builder.HasIndex(m => m.EventId);
        builder.HasIndex(m => m.PersonId);
        builder.HasIndex(m => new { m.EventId, m.MarkerType });
        builder.HasIndex(m => new { m.EventId, m.OccurredAt });

        builder.HasOne(m => m.Event)
            .WithMany(e => e.Markers)
            .HasForeignKey(m => m.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.Person)
            .WithMany()
            .HasForeignKey(m => m.PersonId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

