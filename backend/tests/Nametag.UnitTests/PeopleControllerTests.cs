using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Person;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class PeopleControllerTests
{
    private readonly FakePersonService _fakePersonService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly PeopleController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public PeopleControllerTests()
    {
        _fakePersonService = new FakePersonService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new PeopleController(_fakePersonService, _fakeCurrentUserService);
        _controller = new PeopleController(_fakePersonService, _fakeCurrentUserService, null!);
    }

    [Fact]
    public async Task GetPeople_ReturnsOkWithPagination()
    {
        var result = await _controller.GetPeople(limit: 10, offset: 0);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetPeople_InvalidLimit_ReturnsBadRequest()
    {
        var result = await _controller.GetPeople(limit: 0, offset: 0);

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task GetPeople_InvalidOffset_ReturnsBadRequest()
    {
        var result = await _controller.GetPeople(limit: 10, offset: -1);

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task GetPeople_IncludeAllWithoutLimit_ReturnsPeopleOnly()
    {
        var result = await _controller.GetPeople(limit: null, offset: 0, includeAll: true);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreatePerson_ReturnsCreated()
    {
        var request = new CreatePersonRequest { Name = "John Doe" };
        var result = await _controller.CreatePerson(request);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetPersonById_ReturnsOk()
    {
        var personId = Guid.NewGuid();
        var result = await _controller.GetPersonById(personId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task UpdatePerson_ReturnsOk()
    {
        var personId = Guid.NewGuid();
        var request = new UpdatePersonRequest { Name = "Updated Name" };
        var result = await _controller.UpdatePerson(personId, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeletePerson_ReturnsOk()
    {
        var personId = Guid.NewGuid();
        var result = await _controller.DeletePerson(personId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RestorePerson_ReturnsOk()
    {
        var personId = Guid.NewGuid();
        var result = await _controller.RestorePerson(personId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task PermanentDeletePerson_ReturnsOk()
    {
        var personId = Guid.NewGuid();
        var result = await _controller.PermanentDeletePerson(personId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task SearchPeople_ReturnsOk()
    {
        var result = await _controller.SearchPeople("john");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakePersonService : IPersonService
    {
        public Task<PersonListResponse> GetPeopleAsync(Guid userId, int? limit, int? offset, bool includeAll, bool includeDetails, string? groupIds, CancellationToken ct = default)
        {
            return Task.FromResult(new PersonListResponse
            {
                People = new List<PersonDto>
                {
                    new() { Id = Guid.NewGuid(), Name = "Test Person" }
                },
                Pagination = includeAll && !limit.HasValue ? null : new PaginationDto { Total = 1, Limit = limit ?? 50, Offset = offset ?? 0, HasMore = false }
            });
        }

        public Task<PersonDto> GetPersonByIdAsync(Guid userId, Guid personId, CancellationToken ct = default)
        {
            return Task.FromResult(new PersonDto { Id = personId, Name = "Test Person" });
        }

        public Task<PersonDto> CreatePersonAsync(Guid userId, CreatePersonRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new PersonDto { Id = Guid.NewGuid(), Name = request.Name });
        }

        public Task<PersonDto> UpdatePersonAsync(Guid userId, Guid personId, UpdatePersonRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new PersonDto { Id = personId, Name = request.Name ?? "Updated" });
        }

        public Task SoftDeletePersonAsync(Guid userId, Guid personId, DeletePersonRequest? request = null, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<PersonDto> RestorePersonAsync(Guid userId, Guid personId, CancellationToken ct = default)
        {
            return Task.FromResult(new PersonDto { Id = personId, Name = "Restored" });
        }

        public Task PermanentDeletePersonAsync(Guid userId, Guid personId, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<List<PersonSummaryDto>> SearchPeopleAsync(Guid userId, string query, CancellationToken ct = default)
        {
            return Task.FromResult(new List<PersonSummaryDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Search Match" }
            });
        }

        public Task<List<SuspectVehicleDto>> GetVehiclesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<SuspectVehicleDto>());
        public Task<SuspectVehicleDto> CreateVehicleAsync(Guid userId, Guid personId, CreateSuspectVehicleRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectVehicleDto { Id = Guid.NewGuid(), PersonId = personId });
        public Task<SuspectVehicleDto> UpdateVehicleAsync(Guid userId, Guid personId, Guid vehicleId, UpdateSuspectVehicleRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectVehicleDto { Id = vehicleId, PersonId = personId });
        public Task DeleteVehicleAsync(Guid userId, Guid personId, Guid vehicleId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<List<PhysicalMarkDto>> GetPhysicalMarksAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<PhysicalMarkDto>());
        public Task<PhysicalMarkDto> CreatePhysicalMarkAsync(Guid userId, Guid personId, CreatePhysicalMarkRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PhysicalMarkDto { Id = Guid.NewGuid(), PersonId = personId });
        public Task<PhysicalMarkDto> UpdatePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, UpdatePhysicalMarkRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PhysicalMarkDto { Id = markId, PersonId = personId });
        public Task DeletePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<List<CriminalRecordDto>> GetCriminalRecordsAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<CriminalRecordDto>());
        public Task<CriminalRecordDto> CreateCriminalRecordAsync(Guid userId, Guid personId, CreateCriminalRecordRequest request, CancellationToken ct = default) =>
            Task.FromResult(new CriminalRecordDto { Id = Guid.NewGuid(), PersonId = personId });
        public Task<CriminalRecordDto> UpdateCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, UpdateCriminalRecordRequest request, CancellationToken ct = default) =>
            Task.FromResult(new CriminalRecordDto { Id = recordId, PersonId = personId });
        public Task DeleteCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<List<SuspectBankAccountDto>> GetBankAccountsAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<SuspectBankAccountDto>());
        public Task<SuspectBankAccountDto> CreateBankAccountAsync(Guid userId, Guid personId, CreateSuspectBankAccountRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectBankAccountDto { Id = Guid.NewGuid(), PersonId = personId });
        public Task<SuspectBankAccountDto> UpdateBankAccountAsync(Guid userId, Guid personId, Guid accountId, UpdateSuspectBankAccountRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectBankAccountDto { Id = accountId, PersonId = personId });
        public Task DeleteBankAccountAsync(Guid userId, Guid personId, Guid accountId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<List<ImportantDateDto>> GetImportantDatesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<ImportantDateDto>());
        public Task<ImportantDateDto> CreateImportantDateAsync(Guid userId, Guid personId, CreateImportantDateDto request, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = Guid.NewGuid(), PersonId = personId });
        public Task<ImportantDateDto> UpdateImportantDateAsync(Guid userId, Guid personId, Guid dateId, CreateImportantDateDto request, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = dateId, PersonId = personId });
        public Task DeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) => Task.CompletedTask;
        public Task<ImportantDateDto> RestoreImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = dateId, PersonId = personId });
        public Task PermanentDeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<List<DuplicateGroupDto>> GetAllDuplicatesAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new List<DuplicateGroupDto>());
        public Task<List<DuplicateCandidateDto>> GetPersonDuplicatesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<DuplicateCandidateDto>());
        public Task DismissDuplicateAsync(Guid userId, Guid personAId, Guid personBId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<Guid> MergePeopleAsync(Guid userId, MergePeopleRequest request, CancellationToken ct = default) =>
            Task.FromResult(request.PrimaryId);

        public Task<List<PersonOrphanDto>> GetPersonOrphansAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<PersonOrphanDto>());
        public Task<BulkOrphansResponse> GetBulkOrphansAsync(Guid userId, BulkOrphansRequest request, CancellationToken ct = default) =>
            Task.FromResult(new BulkOrphansResponse());

        public Task<List<PersonSearchIndexItemDto>> GetSearchIndexAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new List<PersonSearchIndexItemDto>());

        public Task<PersonGraphResponse> GetPersonGraphAsync(Guid userId, Guid personId, bool hideUserNode, bool includeSolvedCases, bool includeRuledOut, CancellationToken ct = default) =>
            Task.FromResult(new PersonGraphResponse());

        public Task<string> UploadPersonPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken ct = default) =>
            Task.FromResult("photo.jpg");
        public Task DeletePersonPhotoAsync(Guid userId, Guid personId, CancellationToken ct = default) => Task.CompletedTask;
        public Task<(string photoUrl, string filename)> UploadPhysicalMarkPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken ct = default) =>
            Task.FromResult(("/api/photos/marks/mark.jpg", "mark.jpg"));
    }
}
