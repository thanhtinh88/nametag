using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class AddressHashHelperTests
{
    [Fact]
    public void NormalizePart_TrimsAndLowercasesAndCollapsesSpaces()
    {
        var raw = "  123   Main   STREET  \n ";
        var normalized = AddressHashHelper.NormalizePart(raw);
        Assert.Equal("123 main street", normalized);
    }

    [Fact]
    public void NormalizePart_HandlesNullAndEmpty()
    {
        Assert.Equal(string.Empty, AddressHashHelper.NormalizePart(null));
        Assert.Equal(string.Empty, AddressHashHelper.NormalizePart("   "));
    }

    [Fact]
    public void BuildAddressHash_ProducesConsistentSha256Hex()
    {
        var hash1 = AddressHashHelper.BuildAddressHash("123 Main St", "Apt 4", "Hanoi", "HN", "10000", "Vietnam");
        var hash2 = AddressHashHelper.BuildAddressHash("  123  main  st ", " apt 4", "HANOI", "hn", "10000", "vietnam");
        Assert.Equal(hash1, hash2);
        Assert.Equal(64, hash1.Length);
    }

    [Fact]
    public void HasGeocodableContent_ReturnsTrueIfAnyPartHasText()
    {
        Assert.True(AddressHashHelper.HasGeocodableContent(null, null, "Hanoi", null, null, null));
        Assert.True(AddressHashHelper.HasGeocodableContent("123 Main", null, null, null, null, null));
    }

    [Fact]
    public void HasGeocodableContent_ReturnsFalseIfAllPartsEmptyOrWhitespace()
    {
        Assert.False(AddressHashHelper.HasGeocodableContent(null, null, null, null, null, null));
        Assert.False(AddressHashHelper.HasGeocodableContent("  ", "", null, " \t ", null, ""));
    }
}
