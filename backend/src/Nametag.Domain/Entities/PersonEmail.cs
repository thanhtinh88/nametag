using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonEmail : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string Type { get; set; } = "home";
    public string Email { get; set; } = string.Empty;
}

