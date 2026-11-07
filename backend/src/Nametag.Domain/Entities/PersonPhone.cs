using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonPhone : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string Type { get; set; } = "home";
    public string Number { get; set; } = string.Empty;
}

