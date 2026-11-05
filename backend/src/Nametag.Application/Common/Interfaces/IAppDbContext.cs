using Microsoft.EntityFrameworkCore;
using Nametag.Domain.Entities;

namespace Nametag.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

