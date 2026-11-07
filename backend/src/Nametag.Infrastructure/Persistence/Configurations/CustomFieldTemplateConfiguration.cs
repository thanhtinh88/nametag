using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class CustomFieldTemplateConfiguration : IEntityTypeConfiguration<CustomFieldTemplate>
{
    public void Configure(EntityTypeBuilder<CustomFieldTemplate> builder)
    {
        builder.ToTable("custom_field_templates");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(c => c.Slug)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(c => c.Type)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(c => c.Order)
            .HasDefaultValue(0);

        builder.HasIndex(c => new { c.UserId, c.Slug });
        builder.HasIndex(c => new { c.UserId, c.DeletedAt });

        builder.HasOne(c => c.User)
            .WithMany(u => u.CustomFieldTemplates)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.Values)
            .WithOne(v => v.Template)
            .HasForeignKey(v => v.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

