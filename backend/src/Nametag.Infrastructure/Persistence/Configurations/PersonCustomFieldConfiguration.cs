using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonCustomFieldConfiguration : IEntityTypeConfiguration<PersonCustomField>
{
    public void Configure(EntityTypeBuilder<PersonCustomField> builder)
    {
        builder.ToTable("person_custom_fields");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Key)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Value)
            .IsRequired();

        builder.Property(c => c.Type)
            .HasMaxLength(50);

        builder.HasIndex(c => c.PersonId);

        builder.HasOne(c => c.Person)
            .WithMany(p => p.CustomFields)
            .HasForeignKey(c => c.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

