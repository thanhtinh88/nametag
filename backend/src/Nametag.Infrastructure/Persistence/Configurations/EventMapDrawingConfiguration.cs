using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventMapDrawingConfiguration : IEntityTypeConfiguration<EventMapDrawing>
{
    public void Configure(EntityTypeBuilder<EventMapDrawing> builder)
    {
        builder.ToTable("event_map_drawings");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.DrawingType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("POLYGON");

        builder.Property(d => d.Label)
            .HasMaxLength(255);

        builder.Property(d => d.Notes)
            .HasColumnType("text");

        builder.Property(d => d.StrokeColor)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("#f59e0b");

        builder.Property(d => d.StrokeWidth)
            .HasDefaultValue(3);

        builder.Property(d => d.StrokeStyle)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("SOLID");

        builder.Property(d => d.FillColor)
            .HasMaxLength(50);

        builder.Property(d => d.FillOpacity)
            .HasDefaultValue(0.2);

        builder.Property(d => d.Coordinates)
            .HasColumnType("jsonb");

        builder.HasIndex(d => d.EventId);
        builder.HasIndex(d => new { d.EventId, d.DrawingType });

        builder.HasOne(d => d.Event)
            .WithMany(e => e.Drawings)
            .HasForeignKey(d => d.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

