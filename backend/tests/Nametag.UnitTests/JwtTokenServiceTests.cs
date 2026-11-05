using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Nametag.Domain.Entities;
using Nametag.Infrastructure.Security;
using Xunit;

namespace Nametag.UnitTests;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _sut;

    public JwtTokenServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience",
                ["Jwt:KeyId"] = "test-key-id",
                ["Jwt:AccessTokenLifetimeMinutes"] = "15"
            })
            .Build();

        _sut = new JwtTokenService(config);
    }

    [Fact]
    public void GenerateAccessToken_ShouldProduceValidRS256Token_WithExpectedClaims()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Email = "tester@nametag.one",
            Name = "John",
            Surname = "Doe",
            Nickname = "JD"
        };

        // Act
        var (token, expiresAt, jti) = _sut.GenerateAccessToken(user);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(jti);
        Assert.True(expiresAt > DateTime.UtcNow);

        var handler = new JwtSecurityTokenHandler();
        Assert.True(handler.CanReadToken(token));

        var jwt = handler.ReadJwtToken(token);
        Assert.Equal("RS256", jwt.Header.Alg);
        Assert.Equal("test-key-id", jwt.Header.Kid);
        Assert.Equal("test-issuer", jwt.Issuer);
        Assert.Contains("test-audience", jwt.Audiences);
        Assert.Equal(user.Id.ToString(), jwt.Subject);
        Assert.Equal("tester@nametag.one", jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
    }

    [Fact]
    public void GetJwkSetJson_ShouldReturnValidJwkSet()
    {
        // Act
        var jwksJson = _sut.GetJwkSetJson();

        // Assert
        Assert.NotNull(jwksJson);
        using var doc = JsonDocument.Parse(jwksJson);
        var keys = doc.RootElement.GetProperty("keys");
        Assert.Equal(1, keys.GetArrayLength());

        var key = keys[0];
        Assert.Equal("RSA", key.GetProperty("kty").GetString());
        Assert.Equal("sig", key.GetProperty("use").GetString());
        Assert.Equal("RS256", key.GetProperty("alg").GetString());
        Assert.Equal("test-key-id", key.GetProperty("kid").GetString());
        Assert.True(key.TryGetProperty("n", out _));
        Assert.True(key.TryGetProperty("e", out _));
    }

    [Fact]
    public void GenerateRefreshToken_ShouldProduceCryptographicallySecurePlainAndHash()
    {
        // Act
        var (plain1, hash1) = _sut.GenerateRefreshToken();
        var (plain2, hash2) = _sut.GenerateRefreshToken();

        // Assert
        Assert.NotEqual(plain1, plain2);
        Assert.NotEqual(hash1, hash2);
        Assert.Equal(64, hash1.Length); // SHA-256 hex is 64 chars
    }
}

