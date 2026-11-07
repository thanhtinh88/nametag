using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonSocialProfileConfiguration : IEntityTypeConfiguration<PersonSocialProfile>
{
    public void Configure(EntityTypeBuilder<PersonSocialProfile> builder)
    {
        builder.ToTable("person_social_profiles");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.Url)
            .HasMaxLength(500);

        builder.Property(s => s.Network)
            .HasMaxLength(50);

        builder.Property(s => s.Username)
            .HasMaxLength(100);

        builder.HasIndex(s => s.PersonId);

        builder.HasOne(s => s.Person)
            .WithMany(p => p.SocialProfiles)
            .HasForeignKey(s => s.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

