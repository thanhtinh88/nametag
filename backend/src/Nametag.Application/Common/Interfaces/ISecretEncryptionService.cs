namespace Nametag.Application.Common.Interfaces;

public interface ISecretEncryptionService
{
    string EncryptSecret(string plainSecret);
    string DecryptSecret(string encryptedSecret);
}
