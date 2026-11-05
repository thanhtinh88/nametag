using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using Nametag.Domain.Entities;
using Nametag.Infrastructure.Security;

namespace Nametag.UnitTests;

public class TokenRevocationTests
{
    [Fact]
    public async Task NoopTokenRevocationService_AlwaysReturnsFalse()
    {
        var service = new NoopTokenRevocationService();
        var isRevoked = await service.IsRevokedAsync("some-jti", Guid.NewGuid(), DateTime.UtcNow);
        Assert.False(isRevoked);

        // Does not throw
        await service.RevokeJtiAsync("some-jti", TimeSpan.FromMinutes(15));
        await service.RevokeUserTokensAsync(Guid.NewGuid());
    }

    [Fact]
    public void JwtToken_Includes_Jti_And_Iat_Claims()
    {
        var config = new ConfigurationBuilder().Build();
        var jwtService = new JwtTokenService(config);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            Name = "Test User"
        };

        var (token, expiresAt, jti) = jwtService.GenerateAccessToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal(jti, jwt.Id);
        Assert.NotNull(jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Iat));
        Assert.True(expiresAt > DateTime.UtcNow);
    }
}

