using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonPhoneConfiguration : IEntityTypeConfiguration<PersonPhone>
{
    public void Configure(EntityTypeBuilder<PersonPhone> builder)
    {
        builder.ToTable("person_phones");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.Number)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(p => p.PersonId);

        builder.HasOne(p => p.Person)
            .WithMany(p => p.PhoneNumbers)
            .HasForeignKey(p => p.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

