using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("events");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.Category)
            .HasMaxLength(100);

        builder.Property(e => e.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.Description)
            .HasColumnType("text");

        builder.Property(e => e.Photo)
            .HasMaxLength(500);

        builder.Property(e => e.ImmichAlbumId)
            .HasMaxLength(255);

        builder.Property(e => e.CaseCode)
            .HasMaxLength(100);

        builder.Property(e => e.CrimeType)
            .HasMaxLength(100);

        builder.Property(e => e.CaseStatus)
            .HasMaxLength(50);

        builder.Property(e => e.IncidentTimeNotes)
            .HasMaxLength(500);

        builder.Property(e => e.DamageAssessment)
            .HasColumnType("text");

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => new { e.UserId, e.StartDate });
        builder.HasIndex(e => new { e.UserId, e.Title });
        builder.HasIndex(e => new { e.UserId, e.DeletedAt });
        builder.HasIndex(e => e.CaseCode);
        builder.HasIndex(e => e.CaseStatus);
        builder.HasIndex(e => e.CrimeType);

        builder.HasOne(e => e.User)
            .WithMany(u => u.Events)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Groups)
            .WithOne(eg => eg.Event)
            .HasForeignKey(eg => eg.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.People)
            .WithOne(ep => ep.Event)
            .HasForeignKey(ep => ep.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Addresses)
            .WithOne(ea => ea.Event)
            .HasForeignKey(ea => ea.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.Urls)
            .WithOne(eu => eu.Event)
            .HasForeignKey(eu => eu.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.CustomFields)
            .WithOne(ec => ec.Event)
            .HasForeignKey(ec => ec.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(e => e.JournalEntries)
            .WithOne(je => je.Event)
            .HasForeignKey(je => je.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

