using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class ImmichConnectionConfiguration : IEntityTypeConfiguration<ImmichConnection>
{
    public void Configure(EntityTypeBuilder<ImmichConnection> builder)
    {
        builder.ToTable("immich_connections");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.ServerUrl)
            .IsRequired()
            .HasMaxLength(2048);

        builder.Property(c => c.PublicUrl)
            .HasMaxLength(2048);

        builder.Property(c => c.ApiKey)
            .IsRequired()
            .HasMaxLength(4096);

        builder.Property(c => c.LastError)
            .HasMaxLength(1024);

        builder.HasOne(c => c.User)
            .WithOne(u => u.ImmichConnection)
            .HasForeignKey<ImmichConnection>(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.UserId)
            .IsUnique();
    }
}
