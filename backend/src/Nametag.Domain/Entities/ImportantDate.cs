using Nametag.Domain.Common;
using Nametag.Domain.Enums;

namespace Nametag.Domain.Entities;

public class ImportantDate : BaseAuditableEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }
    public DateTime Date { get; set; }
    public bool YearUnknown { get; set; } = false;
    public bool ReminderEnabled { get; set; } = false;
    public ReminderType? ReminderType { get; set; }
    public int? ReminderInterval { get; set; }
    public ReminderIntervalUnit? ReminderIntervalUnit { get; set; }
    public int? ReminderLeadDays { get; set; }
    public DateTime? LastReminderSent { get; set; }
    public DateTime? LastLeadReminderSent { get; set; }
    public DateTime? DeletedAt { get; set; }
}

