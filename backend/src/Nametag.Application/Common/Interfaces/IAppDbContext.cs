using Microsoft.EntityFrameworkCore;
using Nametag.Domain.Entities;

namespace Nametag.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Person> People { get; }
    DbSet<PersonEmail> PersonEmails { get; }
    DbSet<PersonPhone> PersonPhones { get; }
    DbSet<PersonAddress> PersonAddresses { get; }
    DbSet<PersonSocialProfile> PersonSocialProfiles { get; }
    DbSet<PersonCustomField> PersonCustomFields { get; }
    DbSet<ImportantDate> ImportantDates { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

