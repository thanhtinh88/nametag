using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonLocation : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string Type { get; set; } = "home";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Label { get; set; }
}

