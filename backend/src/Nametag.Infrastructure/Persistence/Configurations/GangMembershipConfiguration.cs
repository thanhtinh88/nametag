using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class GangMembershipConfiguration : IEntityTypeConfiguration<GangMembership>
{
    public void Configure(EntityTypeBuilder<GangMembership> builder)
    {
        builder.ToTable("gang_memberships");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Role)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("MEMBER");

        builder.Property(m => m.Notes)
            .HasColumnType("text");

        builder.HasIndex(m => new { m.GangId, m.PersonId })
            .IsUnique();

        builder.HasIndex(m => m.GangId);
        builder.HasIndex(m => m.PersonId);

        builder.HasOne(m => m.Gang)
            .WithMany(g => g.Members)
            .HasForeignKey(m => m.GangId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.Person)
            .WithMany(p => p.GangMemberships)
            .HasForeignKey(m => m.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

