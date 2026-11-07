using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class GangConfiguration : IEntityTypeConfiguration<Gang>
{
    public void Configure(EntityTypeBuilder<Gang> builder)
    {
        builder.ToTable("gangs");

        builder.HasKey(g => g.Id);

        builder.Property(g => g.Name)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(g => g.Description)
            .HasColumnType("text");

        builder.Property(g => g.Turf)
            .HasMaxLength(255);

        builder.Property(g => g.Color)
            .HasMaxLength(50);

        builder.HasIndex(g => g.UserId);
        builder.HasIndex(g => new { g.UserId, g.DeletedAt });

        builder.HasOne(g => g.User)
            .WithMany(u => u.Gangs)
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(g => g.Members)
            .WithOne(m => m.Gang)
            .HasForeignKey(m => m.GangId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

