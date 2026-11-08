using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Nametag.Application.Common.Interfaces;

namespace Nametag.Infrastructure.Security;

public class SecretEncryptionService : ISecretEncryptionService
{
    private const int IvLength = 12; // 96-bit IV
    private const int TagLength = 16; // 128-bit Tag
    private readonly byte[] _key;

    public SecretEncryptionService(IConfiguration configuration)
    {
        var secret = Environment.GetEnvironmentVariable("NEXTAUTH_SECRET")
                     ?? Environment.GetEnvironmentVariable("JWT_SECRET")
                     ?? configuration["Jwt:Secret"]
                     ?? configuration["Immich:SecretKey"]
                     ?? "fallback-secret-key-for-dev-environment-min-32-chars";

        // Derive 32-byte key using SHA-256 (matching Node.js crypto.createHash('sha256').update(secret).digest())
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
    }

    public string EncryptSecret(string plainSecret)
    {
        ArgumentNullException.ThrowIfNull(plainSecret);

        var iv = new byte[IvLength];
        RandomNumberGenerator.Fill(iv);

        var plaintextBytes = Encoding.UTF8.GetBytes(plainSecret);
        var ciphertextBytes = new byte[plaintextBytes.Length];
        var tagBytes = new byte[TagLength];

        using var aesGcm = new AesGcm(_key, TagLength);
        aesGcm.Encrypt(iv, plaintextBytes, ciphertextBytes, tagBytes);

        var ivHex = Convert.ToHexString(iv).ToLowerInvariant();
        var tagHex = Convert.ToHexString(tagBytes).ToLowerInvariant();
        var cipherHex = Convert.ToHexString(ciphertextBytes).ToLowerInvariant();

        return $"{ivHex}:{tagHex}:{cipherHex}";
    }

    public string DecryptSecret(string encryptedSecret)
    {
        ArgumentNullException.ThrowIfNull(encryptedSecret);

        var parts = encryptedSecret.Split(':');
        if (parts.Length != 3)
        {
            throw new FormatException("Invalid encrypted password format");
        }

        var iv = Convert.FromHexString(parts[0]);
        var tag = Convert.FromHexString(parts[1]);
        var ciphertext = Convert.FromHexString(parts[2]);
        var plaintextBytes = new byte[ciphertext.Length];

        using var aesGcm = new AesGcm(_key, TagLength);
        aesGcm.Decrypt(iv, ciphertext, tag, plaintextBytes);

        return Encoding.UTF8.GetString(plaintextBytes);
    }
}
