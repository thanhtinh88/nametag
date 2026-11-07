using Nametag.Application.DTOs.Journal;

namespace Nametag.Application.Services;

public interface IJournalService
{
    Task<JournalListResponseDto> GetEntriesAsync(Guid userId, JournalListQuery query, CancellationToken ct = default);
    Task<JournalEntryDto> GetEntryByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<JournalEntryDto> CreateEntryAsync(Guid userId, CreateJournalEntryRequest request, CancellationToken ct = default);
    Task<JournalEntryDto> UpdateEntryAsync(Guid userId, Guid id, UpdateJournalEntryRequest request, CancellationToken ct = default);
    Task SoftDeleteEntryAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<JournalEntryDto> RestoreEntryAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task PermanentDeleteEntryAsync(Guid userId, Guid id, CancellationToken ct = default);
}

