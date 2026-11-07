using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventMapRouteConfiguration : IEntityTypeConfiguration<EventMapRoute>
{
    public void Configure(EntityTypeBuilder<EventMapRoute> builder)
    {
        builder.ToTable("event_map_routes");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Label)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(r => r.RouteType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("CONFIRMED_PATH");

        builder.Property(r => r.Color)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("#ef4444");

        builder.Property(r => r.Waypoints)
            .HasColumnType("jsonb");

        builder.Property(r => r.Notes)
            .HasColumnType("text");

        builder.HasIndex(r => r.EventId);
        builder.HasIndex(r => r.PersonId);

        builder.HasOne(r => r.Event)
            .WithMany(e => e.Routes)
            .HasForeignKey(r => r.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Person)
            .WithMany()
            .HasForeignKey(r => r.PersonId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

