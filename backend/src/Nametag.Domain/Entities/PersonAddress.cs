using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonAddress : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string Type { get; set; } = "home";
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? GeocodedAt { get; set; }
    public string? GeocodeStatus { get; set; }
    public string? GeocodeHash { get; set; }
}

