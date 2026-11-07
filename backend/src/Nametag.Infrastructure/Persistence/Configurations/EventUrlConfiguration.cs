using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventUrlConfiguration : IEntityTypeConfiguration<EventUrl>
{
    public void Configure(EntityTypeBuilder<EventUrl> builder)
    {
        builder.ToTable("event_urls");

        builder.HasKey(eu => eu.Id);

        builder.Property(eu => eu.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(eu => eu.Url)
            .IsRequired()
            .HasMaxLength(2000);

        builder.HasIndex(eu => eu.EventId);

        builder.HasOne(eu => eu.Event)
            .WithMany(e => e.Urls)
            .HasForeignKey(eu => eu.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

