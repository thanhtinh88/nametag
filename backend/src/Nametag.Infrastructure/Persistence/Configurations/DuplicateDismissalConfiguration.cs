using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class DuplicateDismissalConfiguration : IEntityTypeConfiguration<DuplicateDismissal>
{
    public void Configure(EntityTypeBuilder<DuplicateDismissal> builder)
    {
        builder.ToTable("duplicate_dismissals");

        builder.HasKey(d => d.Id);

        builder.Ignore(d => d.UpdatedAt);

        builder.HasIndex(d => new { d.UserId, d.PersonAId, d.PersonBId })
            .IsUnique();

        builder.HasIndex(d => d.UserId);

        builder.HasOne(d => d.User)
            .WithMany(u => u.DuplicateDismissals)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.PersonA)
            .WithMany()
            .HasForeignKey(d => d.PersonAId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.PersonB)
            .WithMany()
            .HasForeignKey(d => d.PersonBId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

