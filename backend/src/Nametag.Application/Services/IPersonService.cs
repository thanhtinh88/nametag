using Nametag.Application.DTOs.Person;

namespace Nametag.Application.Services;

public interface IPersonService
{
    Task<PersonListResponse> GetPeopleAsync(
        Guid userId,
        int? limit,
        int? offset,
        bool includeAll,
        bool includeDetails,
        string? groupIds,
        CancellationToken ct = default);

    Task<PersonDto> GetPersonByIdAsync(Guid userId, Guid personId, CancellationToken ct = default);

    Task<PersonDto> CreatePersonAsync(Guid userId, CreatePersonRequest request, CancellationToken ct = default);

    Task<PersonDto> UpdatePersonAsync(Guid userId, Guid personId, UpdatePersonRequest request, CancellationToken ct = default);

    Task SoftDeletePersonAsync(Guid userId, Guid personId, DeletePersonRequest? request = null, CancellationToken ct = default);

    Task<PersonDto> RestorePersonAsync(Guid userId, Guid personId, CancellationToken ct = default);

    Task PermanentDeletePersonAsync(Guid userId, Guid personId, CancellationToken ct = default);

    Task<List<PersonSummaryDto>> SearchPeopleAsync(Guid userId, string query, CancellationToken ct = default);
}

