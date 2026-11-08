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

    // Vehicles
    Task<List<SuspectVehicleDto>> GetVehiclesAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<SuspectVehicleDto> CreateVehicleAsync(Guid userId, Guid personId, CreateSuspectVehicleRequest request, CancellationToken ct = default);
    Task<SuspectVehicleDto> UpdateVehicleAsync(Guid userId, Guid personId, Guid vehicleId, UpdateSuspectVehicleRequest request, CancellationToken ct = default);
    Task DeleteVehicleAsync(Guid userId, Guid personId, Guid vehicleId, CancellationToken ct = default);

    // Physical Marks
    Task<List<PhysicalMarkDto>> GetPhysicalMarksAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<PhysicalMarkDto> CreatePhysicalMarkAsync(Guid userId, Guid personId, CreatePhysicalMarkRequest request, CancellationToken ct = default);
    Task<PhysicalMarkDto> UpdatePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, UpdatePhysicalMarkRequest request, CancellationToken ct = default);
    Task DeletePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, CancellationToken ct = default);

    // Criminal Records
    Task<List<CriminalRecordDto>> GetCriminalRecordsAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<CriminalRecordDto> CreateCriminalRecordAsync(Guid userId, Guid personId, CreateCriminalRecordRequest request, CancellationToken ct = default);
    Task<CriminalRecordDto> UpdateCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, UpdateCriminalRecordRequest request, CancellationToken ct = default);
    Task DeleteCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, CancellationToken ct = default);

    // Bank Accounts
    Task<List<SuspectBankAccountDto>> GetBankAccountsAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<SuspectBankAccountDto> CreateBankAccountAsync(Guid userId, Guid personId, CreateSuspectBankAccountRequest request, CancellationToken ct = default);
    Task<SuspectBankAccountDto> UpdateBankAccountAsync(Guid userId, Guid personId, Guid accountId, UpdateSuspectBankAccountRequest request, CancellationToken ct = default);
    Task DeleteBankAccountAsync(Guid userId, Guid personId, Guid accountId, CancellationToken ct = default);

    // Important Dates
    Task<List<ImportantDateDto>> GetImportantDatesAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<ImportantDateDto> CreateImportantDateAsync(Guid userId, Guid personId, CreateImportantDateDto request, CancellationToken ct = default);
    Task<ImportantDateDto> UpdateImportantDateAsync(Guid userId, Guid personId, Guid dateId, CreateImportantDateDto request, CancellationToken ct = default);
    Task DeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default);
    Task<ImportantDateDto> RestoreImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default);
    Task PermanentDeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default);

    // Advanced: Duplicates
    Task<List<DuplicateGroupDto>> GetAllDuplicatesAsync(Guid userId, CancellationToken ct = default);
    Task<List<DuplicateCandidateDto>> GetPersonDuplicatesAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task DismissDuplicateAsync(Guid userId, Guid personAId, Guid personBId, CancellationToken ct = default);

    // Advanced: Merge
    Task<Guid> MergePeopleAsync(Guid userId, MergePeopleRequest request, CancellationToken ct = default);

    // Advanced: Orphans
    Task<List<PersonOrphanDto>> GetPersonOrphansAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<BulkOrphansResponse> GetBulkOrphansAsync(Guid userId, BulkOrphansRequest request, CancellationToken ct = default);

    // Advanced: Search Index
    Task<List<PersonSearchIndexItemDto>> GetSearchIndexAsync(Guid userId, CancellationToken ct = default);

    // Advanced: Graph
    Task<PersonGraphResponse> GetPersonGraphAsync(Guid userId, Guid personId, bool hideUserNode, bool includeSolvedCases, bool includeRuledOut, CancellationToken ct = default);

    // Photos
    Task<string> UploadPersonPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken ct = default);
    Task DeletePersonPhotoAsync(Guid userId, Guid personId, CancellationToken ct = default);
    Task<(string photoUrl, string filename)> UploadPhysicalMarkPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken ct = default);
}

