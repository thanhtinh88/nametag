using Microsoft.Extensions.Configuration;
using Nametag.Infrastructure.Security;
using Xunit;

namespace Nametag.UnitTests;

public class SecretEncryptionServiceTests
{
    private readonly SecretEncryptionService _service;

    public SecretEncryptionServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-jwt-secret-with-plenty-of-characters-for-testing"
            })
            .Build();

        _service = new SecretEncryptionService(config);
    }

    [Fact]
    public void EncryptAndDecrypt_RoundTripsSuccessfully()
    {
        string plainText = "immich_api_key_secret_1234567890";
        var encrypted = _service.EncryptSecret(plainText);

        Assert.NotNull(encrypted);
        Assert.NotEqual(plainText, encrypted);

        var parts = encrypted.Split(':');
        Assert.Equal(3, parts.Length); // iv:tag:ciphertext

        var decrypted = _service.DecryptSecret(encrypted);
        Assert.Equal(plainText, decrypted);
    }

    [Fact]
    public void Decrypt_ThrowsOnInvalidFormat()
    {
        Assert.Throws<FormatException>(() => _service.DecryptSecret("invalid-format-without-colons"));
        Assert.Throws<FormatException>(() => _service.DecryptSecret("part1:part2"));
    }
}
