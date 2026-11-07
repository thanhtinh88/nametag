using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Person;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class PeopleAdvancedInvestigationTests
{
    private readonly FakePersonInvestigationService _fakeService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly PeopleController _controller;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _personId = Guid.NewGuid();

    public PeopleAdvancedInvestigationTests()
    {
        _fakeService = new FakePersonInvestigationService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new PeopleController(_fakeService, _fakeCurrentUserService);
    }

    [Fact]
    public async Task GetAllDuplicates_ReturnsOk()
    {
        var result = await _controller.GetAllDuplicates();
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetPersonDuplicates_ReturnsOk()
    {
        var result = await _controller.GetPersonDuplicates(_personId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DismissDuplicate_ReturnsOk()
    {
        var request = new DismissDuplicateRequest
        {
            PersonAId = Guid.NewGuid(),
            PersonBId = Guid.NewGuid()
        };
        var result = await _controller.DismissDuplicate(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task MergePeople_ReturnsOk()
    {
        var request = new MergePeopleRequest
        {
            PrimaryId = Guid.NewGuid(),
            SecondaryId = Guid.NewGuid()
        };
        var result = await _controller.MergePeople(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetPersonOrphans_ReturnsOk()
    {
        var result = await _controller.GetPersonOrphans(_personId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetBulkOrphans_ReturnsOk()
    {
        var request = new BulkOrphansRequest { SelectAll = true };
        var result = await _controller.GetBulkOrphans(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetSearchIndex_ReturnsOk()
    {
        var result = await _controller.GetSearchIndex();
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetPersonGraph_ReturnsOk()
    {
        var result = await _controller.GetPersonGraph(_personId, hideUserNode: false);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakePersonInvestigationService : IPersonService
    {
        public Task<PersonListResponse> GetPeopleAsync(Guid userId, int? limit, int? offset, bool includeAll, bool includeDetails, string? groupIds, CancellationToken ct = default) =>
            Task.FromResult(new PersonListResponse { People = new() });

        public Task<PersonDto> GetPersonByIdAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = personId, Name = "Alice" });

        public Task<PersonDto> CreatePersonAsync(Guid userId, CreatePersonRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = Guid.NewGuid(), Name = request.Name });

        public Task<PersonDto> UpdatePersonAsync(Guid userId, Guid personId, UpdatePersonRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = personId, Name = request.Name ?? "Alice" });

        public Task SoftDeletePersonAsync(Guid userId, Guid personId, DeletePersonRequest? request = null, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<PersonDto> RestorePersonAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = personId, Name = "Restored" });

        public Task PermanentDeletePersonAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<List<PersonSummaryDto>> SearchPeopleAsync(Guid userId, string query, CancellationToken ct = default) =>
            Task.FromResult(new List<PersonSummaryDto>());

        public Task<List<SuspectVehicleDto>> GetVehiclesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<SuspectVehicleDto>());

        public Task<SuspectVehicleDto> CreateVehicleAsync(Guid userId, Guid personId, CreateSuspectVehicleRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectVehicleDto { Id = Guid.NewGuid(), PersonId = personId });

        public Task<SuspectVehicleDto> UpdateVehicleAsync(Guid userId, Guid personId, Guid vehicleId, UpdateSuspectVehicleRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectVehicleDto { Id = vehicleId, PersonId = personId });

        public Task DeleteVehicleAsync(Guid userId, Guid personId, Guid vehicleId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<List<PhysicalMarkDto>> GetPhysicalMarksAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<PhysicalMarkDto>());

        public Task<PhysicalMarkDto> CreatePhysicalMarkAsync(Guid userId, Guid personId, CreatePhysicalMarkRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PhysicalMarkDto { Id = Guid.NewGuid(), PersonId = personId });

        public Task<PhysicalMarkDto> UpdatePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, UpdatePhysicalMarkRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PhysicalMarkDto { Id = markId, PersonId = personId });

        public Task DeletePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<List<CriminalRecordDto>> GetCriminalRecordsAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<CriminalRecordDto>());

        public Task<CriminalRecordDto> CreateCriminalRecordAsync(Guid userId, Guid personId, CreateCriminalRecordRequest request, CancellationToken ct = default) =>
            Task.FromResult(new CriminalRecordDto { Id = Guid.NewGuid(), PersonId = personId });

        public Task<CriminalRecordDto> UpdateCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, UpdateCriminalRecordRequest request, CancellationToken ct = default) =>
            Task.FromResult(new CriminalRecordDto { Id = recordId, PersonId = personId });

        public Task DeleteCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<List<SuspectBankAccountDto>> GetBankAccountsAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<SuspectBankAccountDto>());

        public Task<SuspectBankAccountDto> CreateBankAccountAsync(Guid userId, Guid personId, CreateSuspectBankAccountRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectBankAccountDto { Id = Guid.NewGuid(), PersonId = personId });

        public Task<SuspectBankAccountDto> UpdateBankAccountAsync(Guid userId, Guid personId, Guid accountId, UpdateSuspectBankAccountRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectBankAccountDto { Id = accountId, PersonId = personId });

        public Task DeleteBankAccountAsync(Guid userId, Guid personId, Guid accountId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<List<ImportantDateDto>> GetImportantDatesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<ImportantDateDto>());

        public Task<ImportantDateDto> CreateImportantDateAsync(Guid userId, Guid personId, CreateImportantDateDto request, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = Guid.NewGuid(), PersonId = personId });

        public Task<ImportantDateDto> UpdateImportantDateAsync(Guid userId, Guid personId, Guid dateId, CreateImportantDateDto request, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = dateId, PersonId = personId });

        public Task DeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<ImportantDateDto> RestoreImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = dateId, PersonId = personId });

        public Task PermanentDeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.CompletedTask;

        // Advanced
        public Task<List<DuplicateGroupDto>> GetAllDuplicatesAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new List<DuplicateGroupDto>
            {
                new()
                {
                    People = new List<DuplicatePersonItemDto>
                    {
                        new() { Id = Guid.NewGuid(), Name = "Alice" },
                        new() { Id = Guid.NewGuid(), Name = "Alyce" }
                    },
                    Similarity = 0.85
                }
            });

        public Task<List<DuplicateCandidateDto>> GetPersonDuplicatesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<DuplicateCandidateDto>
            {
                new() { PersonId = Guid.NewGuid(), Name = "Alyce", Similarity = 0.85 }
            });

        public Task DismissDuplicateAsync(Guid userId, Guid personAId, Guid personBId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<Guid> MergePeopleAsync(Guid userId, MergePeopleRequest request, CancellationToken ct = default) =>
            Task.FromResult(request.PrimaryId);

        public Task<List<PersonOrphanDto>> GetPersonOrphansAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<PersonOrphanDto> { new() { Id = Guid.NewGuid(), FullName = "Bob Smith" } });

        public Task<BulkOrphansResponse> GetBulkOrphansAsync(Guid userId, BulkOrphansRequest request, CancellationToken ct = default) =>
            Task.FromResult(new BulkOrphansResponse
            {
                Orphans = new List<PersonOrphanDto> { new() { Id = Guid.NewGuid(), FullName = "Bob Smith" } },
                HasCardDavSync = false
            });

        public Task<List<PersonSearchIndexItemDto>> GetSearchIndexAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new List<PersonSearchIndexItemDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Alice" }
            });

        public Task<PersonGraphResponse> GetPersonGraphAsync(Guid userId, Guid personId, bool hideUserNode, bool includeSolvedCases, bool includeRuledOut, CancellationToken ct = default) =>
            Task.FromResult(new PersonGraphResponse
            {
                Nodes = new List<GraphNodeDto> { new() { Id = personId.ToString(), Label = "Alice", IsCenter = true } },
                Edges = new List<GraphEdgeDto>()
            });
    }
}
