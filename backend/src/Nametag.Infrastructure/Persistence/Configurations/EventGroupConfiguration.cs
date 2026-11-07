using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class EventGroupConfiguration : IEntityTypeConfiguration<EventGroup>
{
    public void Configure(EntityTypeBuilder<EventGroup> builder)
    {
        builder.ToTable("event_groups");

        builder.HasKey(eg => new { eg.EventId, eg.GroupId });

        builder.HasIndex(eg => eg.EventId);
        builder.HasIndex(eg => eg.GroupId);

        builder.HasOne(eg => eg.Event)
            .WithMany(e => e.Groups)
            .HasForeignKey(eg => eg.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(eg => eg.Group)
            .WithMany(g => g.Events)
            .HasForeignKey(eg => eg.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

