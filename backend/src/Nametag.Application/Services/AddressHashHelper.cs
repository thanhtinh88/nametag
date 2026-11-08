using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Nametag.Application.Services;

public static class AddressHashHelper
{
    private static readonly Regex MultiSpace = new(@"\s+", RegexOptions.Compiled);

    public static string NormalizePart(string? part)
    {
        return MultiSpace.Replace((part ?? string.Empty).Trim().ToLowerInvariant(), " ");
    }

    public static string BuildAddressHash(string? street1, string? street2, string? locality, string? region, string? postalCode, string? country)
    {
        var parts = new[]
        {
            NormalizePart(street1),
            NormalizePart(street2),
            NormalizePart(locality),
            NormalizePart(region),
            NormalizePart(postalCode),
            NormalizePart(country)
        };
        var combined = string.Join('|', parts);
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(combined));
        return Convert.ToHexStringLower(bytes);
    }

    public static bool HasGeocodableContent(string? street1, string? street2, string? locality, string? region, string? postalCode, string? country)
    {
        var parts = new[] { street1, street2, locality, region, postalCode, country };
        return parts.Any(p => !string.IsNullOrWhiteSpace(p));
    }
}
