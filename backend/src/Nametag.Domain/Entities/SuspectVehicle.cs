using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class SuspectVehicle : BaseEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string PlateNumber { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string? BrandModel { get; set; }
    public string? Color { get; set; }
    public string? IdentifyingFeatures { get; set; }
    public string? RegisteredOwner { get; set; }
    public bool IsSuspicious { get; set; } = false;

    public DateTime? DeletedAt { get; set; }
}

