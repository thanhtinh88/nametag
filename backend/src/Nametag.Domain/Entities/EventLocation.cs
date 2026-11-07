using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class EventLocation : BaseEntity
{
    public Guid EventId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? StreetLine1 { get; set; }
    public string? StreetLine2 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime? GeocodedAt { get; set; }
    public string? GeocodeStatus { get; set; }
    public string? GeocodeHash { get; set; }

    // Navigation
    public Event? Event { get; set; }
}

