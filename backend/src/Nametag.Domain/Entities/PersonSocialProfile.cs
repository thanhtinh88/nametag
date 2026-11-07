using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonSocialProfile : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string Type { get; set; } = "url";
    public string? Url { get; set; }
    public string? Network { get; set; }
    public string? Username { get; set; }
}

