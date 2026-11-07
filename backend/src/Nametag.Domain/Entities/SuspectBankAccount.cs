using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class SuspectBankAccount : BaseEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountHolder { get; set; }
    public string AccountType { get; set; } = "OWNER"; // "OWNER" | "MULE" | "SUSPICIOUS"
    public bool IsPrimary { get; set; } = false;
    public string? Notes { get; set; }

    public DateTime? DeletedAt { get; set; }
}

