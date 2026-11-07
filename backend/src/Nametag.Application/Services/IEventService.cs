using Nametag.Application.DTOs.Event;

namespace Nametag.Application.Services;

public interface IEventService
{
    Task<List<EventDto>> GetEventsAsync(Guid userId, EventListQuery query, CancellationToken ct = default);
    Task<EventDto> GetEventByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<EventDto> CreateEventAsync(Guid userId, CreateEventRequest request, CancellationToken ct = default);
    Task<EventDto> UpdateEventAsync(Guid userId, Guid id, UpdateEventRequest request, CancellationToken ct = default);
    Task SoftDeleteEventAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<EventDto> RestoreEventAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task PermanentDeleteEventAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<EventParticipantDto> AddPersonAsync(Guid userId, Guid eventId, AddEventPersonRequest request, CancellationToken ct = default);
    Task<EventParticipantDto> UpdatePersonAsync(Guid userId, Guid eventId, UpdateEventPersonRequest request, CancellationToken ct = default);
    Task RemovePersonAsync(Guid userId, Guid eventId, Guid? linkId, Guid? personId, CancellationToken ct = default);
    Task<BulkActionResultDto> BulkActionAsync(Guid userId, BulkEventActionRequest request, CancellationToken ct = default);
}

