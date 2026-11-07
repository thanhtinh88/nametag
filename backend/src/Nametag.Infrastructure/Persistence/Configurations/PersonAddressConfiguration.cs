using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonAddressConfiguration : IEntityTypeConfiguration<PersonAddress>
{
    public void Configure(EntityTypeBuilder<PersonAddress> builder)
    {
        builder.ToTable("person_addresses");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.StreetLine1)
            .HasMaxLength(200);

        builder.Property(a => a.StreetLine2)
            .HasMaxLength(200);

        builder.Property(a => a.Locality)
            .HasMaxLength(100);

        builder.Property(a => a.Region)
            .HasMaxLength(100);

        builder.Property(a => a.PostalCode)
            .HasMaxLength(50);

        builder.Property(a => a.Country)
            .HasMaxLength(100);

        builder.Property(a => a.GeocodeStatus)
            .HasMaxLength(50);

        builder.Property(a => a.GeocodeHash)
            .HasMaxLength(100);

        builder.HasIndex(a => a.PersonId);

        builder.HasOne(a => a.Person)
            .WithMany(p => p.Addresses)
            .HasForeignKey(a => a.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

