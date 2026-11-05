using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.Surname)
            .HasMaxLength(100);

        builder.Property(u => u.Nickname)
            .HasMaxLength(100);

        builder.Property(u => u.Theme)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(u => u.DateFormat)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(u => u.NameOrder)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(u => u.NameDisplayFormat)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(u => u.Language)
            .HasMaxLength(10)
            .HasDefaultValue("en");

        builder.HasIndex(u => new { u.Provider, u.ProviderAccountId })
            .IsUnique();
    }
}

