using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonEmailConfiguration : IEntityTypeConfiguration<PersonEmail>
{
    public void Configure(EntityTypeBuilder<PersonEmail> builder)
    {
        builder.ToTable("person_emails");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.Email)
            .IsRequired()
            .HasMaxLength(255);

        builder.HasIndex(e => e.PersonId);

        builder.HasOne(e => e.Person)
            .WithMany(p => p.Emails)
            .HasForeignKey(e => e.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

