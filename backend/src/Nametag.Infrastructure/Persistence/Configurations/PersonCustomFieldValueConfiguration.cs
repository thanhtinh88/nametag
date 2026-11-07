using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonCustomFieldValueConfiguration : IEntityTypeConfiguration<PersonCustomFieldValue>
{
    public void Configure(EntityTypeBuilder<PersonCustomFieldValue> builder)
    {
        builder.ToTable("person_custom_field_values");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Value)
            .IsRequired()
            .HasColumnType("text");

        builder.HasIndex(v => new { v.PersonId, v.TemplateId })
            .IsUnique();

        builder.HasIndex(v => new { v.TemplateId, v.Value });

        builder.HasOne(v => v.Person)
            .WithMany(p => p.CustomFieldValues)
            .HasForeignKey(v => v.PersonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.Template)
            .WithMany(t => t.Values)
            .HasForeignKey(v => v.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

