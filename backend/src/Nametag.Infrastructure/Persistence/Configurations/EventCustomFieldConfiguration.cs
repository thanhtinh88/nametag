using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventCustomFieldConfiguration : IEntityTypeConfiguration<EventCustomField>
{
    public void Configure(EntityTypeBuilder<EventCustomField> builder)
    {
        builder.ToTable("event_custom_fields");

        builder.HasKey(ec => ec.Id);

        builder.Property(ec => ec.Key)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(ec => ec.Value)
            .IsRequired()
            .HasColumnType("text");

        builder.Property(ec => ec.Type)
            .HasMaxLength(50);

        builder.HasIndex(ec => ec.EventId);

        builder.HasOne(ec => ec.Event)
            .WithMany(e => e.CustomFields)
            .HasForeignKey(ec => ec.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

