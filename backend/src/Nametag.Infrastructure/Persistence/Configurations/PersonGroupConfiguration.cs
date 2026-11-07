using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class PersonGroupConfiguration : IEntityTypeConfiguration<PersonGroup>
{
    public void Configure(EntityTypeBuilder<PersonGroup> builder)
    {
        builder.ToTable("person_groups");

        builder.HasKey(pg => new { pg.PersonId, pg.GroupId });

        builder.HasIndex(pg => pg.PersonId);
        builder.HasIndex(pg => pg.GroupId);

        builder.HasOne(pg => pg.Person)
            .WithMany(p => p.Groups)
            .HasForeignKey(pg => pg.PersonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pg => pg.Group)
            .WithMany(g => g.People)
            .HasForeignKey(pg => pg.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

