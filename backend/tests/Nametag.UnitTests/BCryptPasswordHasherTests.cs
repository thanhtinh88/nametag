using Nametag.Infrastructure.Security;
using Xunit;

namespace Nametag.UnitTests;

public class BCryptPasswordHasherTests
{
    private readonly BCryptPasswordHasher _hasher = new();

    [Fact]
    public void HashPassword_ShouldReturnValidBCryptHash()
    {
        var password = "SuperSecretPassword123!";
        var hash = _hasher.HashPassword(password);

        Assert.NotNull(hash);
        Assert.StartsWith("$2", hash);
        Assert.True(_hasher.VerifyPassword(password, hash));
        Assert.False(_hasher.VerifyPassword("WrongPassword", hash));
    }
}

