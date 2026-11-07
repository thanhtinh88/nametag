using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Person;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class PeopleSubResourcesControllerTests
{
    private readonly FakePersonSubResourceService _fakeService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly PeopleController _controller;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _personId = Guid.NewGuid();

    public PeopleSubResourcesControllerTests()
    {
        _fakeService = new FakePersonSubResourceService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new PeopleController(_fakeService, _fakeCurrentUserService);
    }

    [Fact]
    public async Task Vehicles_Crud_ReturnsSuccess()
    {
        var listResult = await _controller.GetVehicles(_personId);
        Assert.IsType<OkObjectResult>(listResult);

        var createResult = await _controller.CreateVehicle(_personId, new CreateSuspectVehicleRequest { PlateNumber = "29A-123.45", VehicleType = "Car" });
        var created = Assert.IsType<ObjectResult>(createResult);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);

        var updateResult = await _controller.UpdateVehicle(_personId, Guid.NewGuid(), new UpdateSuspectVehicleRequest { Color = "Black" });
        Assert.IsType<OkObjectResult>(updateResult);

        var deleteResult = await _controller.DeleteVehicle(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(deleteResult);
    }

    [Fact]
    public async Task PhysicalMarks_Crud_ReturnsSuccess()
    {
        var listResult = await _controller.GetPhysicalMarks(_personId);
        Assert.IsType<OkObjectResult>(listResult);

        var createResult = await _controller.CreatePhysicalMark(_personId, new CreatePhysicalMarkRequest { Type = "TATTOO", Location = "Arm", Description = "Dragon" });
        var created = Assert.IsType<ObjectResult>(createResult);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);

        var updateResult = await _controller.UpdatePhysicalMark(_personId, Guid.NewGuid(), new UpdatePhysicalMarkRequest { Description = "Dragon head" });
        Assert.IsType<OkObjectResult>(updateResult);

        var deleteResult = await _controller.DeletePhysicalMark(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(deleteResult);
    }

    [Fact]
    public async Task CriminalRecords_Crud_ReturnsSuccess()
    {
        var listResult = await _controller.GetCriminalRecords(_personId);
        Assert.IsType<OkObjectResult>(listResult);

        var createResult = await _controller.CreateCriminalRecord(_personId, new CreateCriminalRecordRequest { Charge = "Theft" });
        var created = Assert.IsType<ObjectResult>(createResult);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);

        var updateResult = await _controller.UpdateCriminalRecord(_personId, Guid.NewGuid(), new UpdateCriminalRecordRequest { SentenceDetail = "2 years" });
        Assert.IsType<OkObjectResult>(updateResult);

        var deleteResult = await _controller.DeleteCriminalRecord(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(deleteResult);
    }

    [Fact]
    public async Task BankAccounts_Crud_ReturnsSuccess()
    {
        var listResult = await _controller.GetBankAccounts(_personId);
        Assert.IsType<OkObjectResult>(listResult);

        var createResult = await _controller.CreateBankAccount(_personId, new CreateSuspectBankAccountRequest { BankName = "VCB", AccountNumber = "123456" });
        var created = Assert.IsType<ObjectResult>(createResult);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);

        var updateResult = await _controller.UpdateBankAccount(_personId, Guid.NewGuid(), new UpdateSuspectBankAccountRequest { IsPrimary = true });
        Assert.IsType<OkObjectResult>(updateResult);

        var deleteResult = await _controller.DeleteBankAccount(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(deleteResult);
    }

    [Fact]
    public async Task ImportantDates_Crud_ReturnsSuccess()
    {
        var listResult = await _controller.GetImportantDates(_personId);
        Assert.IsType<OkObjectResult>(listResult);

        var createResult = await _controller.CreateImportantDate(_personId, new CreateImportantDateDto { Title = "Birthday", Date = DateTime.UtcNow });
        var created = Assert.IsType<ObjectResult>(createResult);
        Assert.Equal(StatusCodes.Status201Created, created.StatusCode);

        var updateResult = await _controller.UpdateImportantDate(_personId, Guid.NewGuid(), new CreateImportantDateDto { Title = "Anniversary", Date = DateTime.UtcNow });
        Assert.IsType<OkObjectResult>(updateResult);

        var deleteResult = await _controller.DeleteImportantDate(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(deleteResult);

        var restoreResult = await _controller.RestoreImportantDate(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(restoreResult);

        var permanentResult = await _controller.PermanentDeleteImportantDate(_personId, Guid.NewGuid());
        Assert.IsType<OkObjectResult>(permanentResult);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakePersonSubResourceService : IPersonService
    {
        public Task<PersonListResponse> GetPeopleAsync(Guid userId, int? limit, int? offset, bool includeAll, bool includeDetails, string? groupIds, CancellationToken ct = default) =>
            Task.FromResult(new PersonListResponse { People = new() });

        public Task<PersonDto> GetPersonByIdAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = personId, Name = "John" });

        public Task<PersonDto> CreatePersonAsync(Guid userId, CreatePersonRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = Guid.NewGuid(), Name = request.Name });

        public Task<PersonDto> UpdatePersonAsync(Guid userId, Guid personId, UpdatePersonRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = personId, Name = request.Name ?? "John" });

        public Task SoftDeletePersonAsync(Guid userId, Guid personId, DeletePersonRequest? request = null, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<PersonDto> RestorePersonAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new PersonDto { Id = personId, Name = "Restored" });

        public Task PermanentDeletePersonAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<List<PersonSummaryDto>> SearchPeopleAsync(Guid userId, string query, CancellationToken ct = default) =>
            Task.FromResult(new List<PersonSummaryDto>());

        // Vehicles
        public Task<List<SuspectVehicleDto>> GetVehiclesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<SuspectVehicleDto> { new() { Id = Guid.NewGuid(), PlateNumber = "29A-123.45" } });

        public Task<SuspectVehicleDto> CreateVehicleAsync(Guid userId, Guid personId, CreateSuspectVehicleRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectVehicleDto { Id = Guid.NewGuid(), PersonId = personId, PlateNumber = request.PlateNumber });

        public Task<SuspectVehicleDto> UpdateVehicleAsync(Guid userId, Guid personId, Guid vehicleId, UpdateSuspectVehicleRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectVehicleDto { Id = vehicleId, PersonId = personId, PlateNumber = request.PlateNumber ?? "29A-123.45" });

        public Task DeleteVehicleAsync(Guid userId, Guid personId, Guid vehicleId, CancellationToken ct = default) =>
            Task.CompletedTask;

        // Physical Marks
        public Task<List<PhysicalMarkDto>> GetPhysicalMarksAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<PhysicalMarkDto> { new() { Id = Guid.NewGuid(), Type = "TATTOO" } });

        public Task<PhysicalMarkDto> CreatePhysicalMarkAsync(Guid userId, Guid personId, CreatePhysicalMarkRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PhysicalMarkDto { Id = Guid.NewGuid(), PersonId = personId, Type = request.Type });

        public Task<PhysicalMarkDto> UpdatePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, UpdatePhysicalMarkRequest request, CancellationToken ct = default) =>
            Task.FromResult(new PhysicalMarkDto { Id = markId, PersonId = personId, Type = request.Type ?? "TATTOO" });

        public Task DeletePhysicalMarkAsync(Guid userId, Guid personId, Guid markId, CancellationToken ct = default) =>
            Task.CompletedTask;

        // Criminal Records
        public Task<List<CriminalRecordDto>> GetCriminalRecordsAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<CriminalRecordDto> { new() { Id = Guid.NewGuid(), Charge = "Theft" } });

        public Task<CriminalRecordDto> CreateCriminalRecordAsync(Guid userId, Guid personId, CreateCriminalRecordRequest request, CancellationToken ct = default) =>
            Task.FromResult(new CriminalRecordDto { Id = Guid.NewGuid(), PersonId = personId, Charge = request.Charge });

        public Task<CriminalRecordDto> UpdateCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, UpdateCriminalRecordRequest request, CancellationToken ct = default) =>
            Task.FromResult(new CriminalRecordDto { Id = recordId, PersonId = personId, Charge = request.Charge ?? "Theft" });

        public Task DeleteCriminalRecordAsync(Guid userId, Guid personId, Guid recordId, CancellationToken ct = default) =>
            Task.CompletedTask;

        // Bank Accounts
        public Task<List<SuspectBankAccountDto>> GetBankAccountsAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<SuspectBankAccountDto> { new() { Id = Guid.NewGuid(), BankName = "VCB" } });

        public Task<SuspectBankAccountDto> CreateBankAccountAsync(Guid userId, Guid personId, CreateSuspectBankAccountRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectBankAccountDto { Id = Guid.NewGuid(), PersonId = personId, BankName = request.BankName });

        public Task<SuspectBankAccountDto> UpdateBankAccountAsync(Guid userId, Guid personId, Guid accountId, UpdateSuspectBankAccountRequest request, CancellationToken ct = default) =>
            Task.FromResult(new SuspectBankAccountDto { Id = accountId, PersonId = personId, BankName = request.BankName ?? "VCB" });

        public Task DeleteBankAccountAsync(Guid userId, Guid personId, Guid accountId, CancellationToken ct = default) =>
            Task.CompletedTask;

        // Important Dates
        public Task<List<ImportantDateDto>> GetImportantDatesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<ImportantDateDto> { new() { Id = Guid.NewGuid(), Title = "Birthday" } });

        public Task<ImportantDateDto> CreateImportantDateAsync(Guid userId, Guid personId, CreateImportantDateDto request, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = Guid.NewGuid(), PersonId = personId, Title = request.Title });

        public Task<ImportantDateDto> UpdateImportantDateAsync(Guid userId, Guid personId, Guid dateId, CreateImportantDateDto request, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = dateId, PersonId = personId, Title = request.Title });

        public Task DeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<ImportantDateDto> RestoreImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.FromResult(new ImportantDateDto { Id = dateId, PersonId = personId, Title = "Restored" });

        public Task PermanentDeleteImportantDateAsync(Guid userId, Guid personId, Guid dateId, CancellationToken ct = default) =>
            Task.CompletedTask;

        // Advanced
        public Task<List<DuplicateGroupDto>> GetAllDuplicatesAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new List<DuplicateGroupDto>());

        public Task<List<DuplicateCandidateDto>> GetPersonDuplicatesAsync(Guid userId, Guid personId, CancellationToken ct = default) =>
            Task.FromResult(new List<DuplicateCandidateDto>());

        public Task DismissDuplicateAsync(Guid userId, Guid personAId, Guid personBId, CancellationToken ct = default) =>
            Task.CompletedTask;

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
    }
}

