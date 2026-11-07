using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class CriminalRecord : BaseEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string Charge { get; set; } = string.Empty;
    public string RecordType { get; set; } = "CONVICTION"; // "CONVICTION" | "ADMIN_VIOLATION"
    public string? SentenceDetail { get; set; }
    public string? AdjudicatedBy { get; set; }
    public DateTime? IncidentDate { get; set; }
    public DateTime? VerdictDate { get; set; }
    public bool IsPardoned { get; set; } = false;
    public string? Notes { get; set; }

    public DateTime? DeletedAt { get; set; }
}

