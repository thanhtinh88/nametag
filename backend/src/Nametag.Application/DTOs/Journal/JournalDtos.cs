using Nametag.Application.DTOs.Person;

namespace Nametag.Application.DTOs.Journal;

public class JournalEventSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? Category { get; set; }
}

public class JournalEntryPersonDto
{
    public Guid Id { get; set; }
    public Guid JournalEntryId { get; set; }
    public Guid PersonId { get; set; }
    public PersonSummaryDto? Person { get; set; }
}

public class JournalEntryEventDto
{
    public Guid Id { get; set; }
    public Guid JournalEntryId { get; set; }
    public Guid EventId { get; set; }
    public JournalEventSummaryDto? Event { get; set; }
}

public class JournalEntryDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public bool HasTime { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public List<JournalEntryPersonDto> People { get; set; } = new();
    public List<JournalEntryEventDto> Events { get; set; } = new();
}

public class CreateJournalEntryRequest
{
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public bool? HasTime { get; set; }
    public string Body { get; set; } = string.Empty;
    public List<Guid>? PersonIds { get; set; }
    public List<Guid>? EventIds { get; set; }
    public bool? UpdateLastContact { get; set; }
}

public class UpdateJournalEntryRequest
{
    public string? Title { get; set; }
    public DateTime? Date { get; set; }
    public bool? HasTime { get; set; }
    public string? Body { get; set; }
    public List<Guid>? PersonIds { get; set; }
    public List<Guid>? EventIds { get; set; }
    public bool? UpdateLastContact { get; set; }
}

public class JournalListQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public Guid? Person { get; set; }
    public Guid? Event { get; set; }
    public string? Q { get; set; }
}

public class JournalPaginationDto
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}

public class JournalListResponseDto
{
    public List<JournalEntryDto> Entries { get; set; } = new();
    public JournalPaginationDto Pagination { get; set; } = new();
}

