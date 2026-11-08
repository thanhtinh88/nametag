using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Person;
using Nametag.Application.DTOs.Immich;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[Route("api/contacts")]
public class PeopleController : ControllerBase
{
    private readonly IPersonService _personService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IImmichService _immichService;

    public PeopleController(IPersonService personService, ICurrentUserService currentUserService)
    public PeopleController(
        IPersonService personService,
        ICurrentUserService currentUserService,
        IImmichService immichService)
    {
        _personService = personService;
        _currentUserService = currentUserService;
        _immichService = immichService;
    }

    private Guid GetUserId()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new UnauthorizedException("Unauthorized");
        }
        return userId.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetPeople(
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        [FromQuery] bool includeAll = false,
        [FromQuery] bool includeDetails = true,
        [FromQuery] string? groupIds = null)
    {
        if (limit.HasValue && limit.Value <= 0)
        {
            return BadRequest(new { error = "limit must be a positive integer" });
        }

        if (offset.HasValue && offset.Value < 0)
        {
            return BadRequest(new { error = "offset must be a non-negative integer" });
        }

        var response = await _personService.GetPeopleAsync(
            GetUserId(),
            limit,
            offset,
            includeAll,
            includeDetails,
            groupIds);

        if (includeAll && !limit.HasValue)
        {
            return Ok(new { people = response.People });
        }

        return Ok(new
        {
            people = response.People,
            pagination = response.Pagination
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreatePerson([FromBody] CreatePersonRequest request)
    {
        var person = await _personService.CreatePersonAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { person });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPersonById(Guid id)
    {
        var person = await _personService.GetPersonByIdAsync(GetUserId(), id);
        return Ok(new { person });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePerson(Guid id, [FromBody] UpdatePersonRequest request)
    {
        var person = await _personService.UpdatePersonAsync(GetUserId(), id, request);
        return Ok(new { person });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePerson(Guid id, [FromBody] DeletePersonRequest? request = null)
    {
        await _personService.SoftDeletePersonAsync(GetUserId(), id, request);
        return Ok(new { message = "Person deleted successfully" });
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestorePerson(Guid id)
    {
        var person = await _personService.RestorePersonAsync(GetUserId(), id);
        return Ok(new { person });
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeletePerson(Guid id)
    {
        await _personService.PermanentDeletePersonAsync(GetUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/photo")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> UploadPhoto(Guid id, CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType)
            throw new BadRequestException("Invalid form data");

        var form = await Request.ReadFormAsync(cancellationToken);
        var file = form.Files["photo"];
        if (file == null || file.Length == 0)
            throw new BadRequestException("No photo file provided");

        if (file.Length > 50 * 1024 * 1024)
            throw new BadRequestException("Photo exceeds maximum size of 50MB");

        using var stream = file.OpenReadStream();
        var filename = await _personService.UploadPersonPhotoAsync(GetUserId(), id, stream, cancellationToken);
        return Ok(new { photo = filename });
    }

    [HttpDelete("{id:guid}/photo")]
    public async Task<IActionResult> DeletePhoto(Guid id, CancellationToken cancellationToken)
    {
        await _personService.DeletePersonPhotoAsync(GetUserId(), id, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpPut("{id:guid}/immich")]
    public async Task<IActionResult> LinkImmich(Guid id, [FromBody] PersonImmichLinkRequest request, CancellationToken ct)
    {
        var result = await _immichService.LinkPersonImmichAsync(GetUserId(), id, request, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/immich")]
    public async Task<IActionResult> SetPhotoFromImmich(Guid id, [FromBody] ImmichSetPhotoRequest request, CancellationToken ct)
    {
        var (photo, photoUrl) = await _immichService.SetPersonPhotoFromImmichAsync(GetUserId(), id, request.AssetId, ct);
        return Ok(new { success = true, photo, photoUrl });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchPeople([FromQuery] string? q)
    {
        var people = await _personService.SearchPeopleAsync(GetUserId(), q ?? string.Empty);
        return Ok(new { people });
    }

    // ─── Sub-resource: Vehicles ──────────────────────────────────────────────────

    [HttpGet("{id:guid}/vehicles")]
    public async Task<IActionResult> GetVehicles(Guid id)
    {
        var vehicles = await _personService.GetVehiclesAsync(GetUserId(), id);
        return Ok(new { vehicles });
    }

    [HttpPost("{id:guid}/vehicles")]
    public async Task<IActionResult> CreateVehicle(Guid id, [FromBody] CreateSuspectVehicleRequest request)
    {
        var vehicle = await _personService.CreateVehicleAsync(GetUserId(), id, request);
        return StatusCode(StatusCodes.Status201Created, new { vehicle });
    }

    [HttpPut("{id:guid}/vehicles/{vehicleId:guid}")]
    public async Task<IActionResult> UpdateVehicle(Guid id, Guid vehicleId, [FromBody] UpdateSuspectVehicleRequest request)
    {
        var vehicle = await _personService.UpdateVehicleAsync(GetUserId(), id, vehicleId, request);
        return Ok(new { vehicle });
    }

    [HttpDelete("{id:guid}/vehicles/{vehicleId:guid}")]
    public async Task<IActionResult> DeleteVehicle(Guid id, Guid vehicleId)
    {
        await _personService.DeleteVehicleAsync(GetUserId(), id, vehicleId);
        return Ok(new { success = true });
    }

    // ─── Sub-resource: Physical Marks ─────────────────────────────────────────────

    [HttpGet("{id:guid}/physical-marks")]
    public async Task<IActionResult> GetPhysicalMarks(Guid id)
    {
        var physicalMarks = await _personService.GetPhysicalMarksAsync(GetUserId(), id);
        return Ok(new { physicalMarks });
    }

    [HttpPost("{id:guid}/physical-marks")]
    public async Task<IActionResult> CreatePhysicalMark(Guid id, [FromBody] CreatePhysicalMarkRequest request)
    {
        var physicalMark = await _personService.CreatePhysicalMarkAsync(GetUserId(), id, request);
        return StatusCode(StatusCodes.Status201Created, new { physicalMark });
    }

    [HttpPut("{id:guid}/physical-marks/{markId:guid}")]
    public async Task<IActionResult> UpdatePhysicalMark(Guid id, Guid markId, [FromBody] UpdatePhysicalMarkRequest request)
    {
        var physicalMark = await _personService.UpdatePhysicalMarkAsync(GetUserId(), id, markId, request);
        return Ok(new { physicalMark });
    }

    [HttpDelete("{id:guid}/physical-marks/{markId:guid}")]
    public async Task<IActionResult> DeletePhysicalMark(Guid id, Guid markId)
    {
        await _personService.DeletePhysicalMarkAsync(GetUserId(), id, markId);
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/physical-marks/photo")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> UploadPhysicalMarkPhoto(Guid id, CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType)
            throw new BadRequestException("Invalid form data");

        var form = await Request.ReadFormAsync(cancellationToken);
        var file = form.Files["photo"];
        if (file == null || file.Length == 0)
            throw new BadRequestException("No photo file provided");

        if (file.Length > 50 * 1024 * 1024)
            throw new BadRequestException("Photo exceeds maximum size of 50MB");

        using var stream = file.OpenReadStream();
        var (photoUrl, filename) = await _personService.UploadPhysicalMarkPhotoAsync(GetUserId(), id, stream, cancellationToken);
        return Ok(new { photoUrl, filename });
    }

    // ─── Sub-resource: Criminal Records ───────────────────────────────────────────

    [HttpGet("{id:guid}/criminal-records")]
    public async Task<IActionResult> GetCriminalRecords(Guid id)
    {
        var criminalRecords = await _personService.GetCriminalRecordsAsync(GetUserId(), id);
        return Ok(new { criminalRecords });
    }

    [HttpPost("{id:guid}/criminal-records")]
    public async Task<IActionResult> CreateCriminalRecord(Guid id, [FromBody] CreateCriminalRecordRequest request)
    {
        var criminalRecord = await _personService.CreateCriminalRecordAsync(GetUserId(), id, request);
        return StatusCode(StatusCodes.Status201Created, new { criminalRecord });
    }

    [HttpPut("{id:guid}/criminal-records/{recordId:guid}")]
    public async Task<IActionResult> UpdateCriminalRecord(Guid id, Guid recordId, [FromBody] UpdateCriminalRecordRequest request)
    {
        var criminalRecord = await _personService.UpdateCriminalRecordAsync(GetUserId(), id, recordId, request);
        return Ok(new { criminalRecord });
    }

    [HttpDelete("{id:guid}/criminal-records/{recordId:guid}")]
    public async Task<IActionResult> DeleteCriminalRecord(Guid id, Guid recordId)
    {
        await _personService.DeleteCriminalRecordAsync(GetUserId(), id, recordId);
        return Ok(new { success = true });
    }

    // ─── Sub-resource: Bank Accounts ──────────────────────────────────────────────

    [HttpGet("{id:guid}/bank-accounts")]
    public async Task<IActionResult> GetBankAccounts(Guid id)
    {
        var bankAccounts = await _personService.GetBankAccountsAsync(GetUserId(), id);
        return Ok(new { bankAccounts });
    }

    [HttpPost("{id:guid}/bank-accounts")]
    public async Task<IActionResult> CreateBankAccount(Guid id, [FromBody] CreateSuspectBankAccountRequest request)
    {
        var bankAccount = await _personService.CreateBankAccountAsync(GetUserId(), id, request);
        return StatusCode(StatusCodes.Status201Created, new { bankAccount });
    }

    [HttpPut("{id:guid}/bank-accounts/{accountId:guid}")]
    public async Task<IActionResult> UpdateBankAccount(Guid id, Guid accountId, [FromBody] UpdateSuspectBankAccountRequest request)
    {
        var bankAccount = await _personService.UpdateBankAccountAsync(GetUserId(), id, accountId, request);
        return Ok(new { bankAccount });
    }

    [HttpDelete("{id:guid}/bank-accounts/{accountId:guid}")]
    public async Task<IActionResult> DeleteBankAccount(Guid id, Guid accountId)
    {
        await _personService.DeleteBankAccountAsync(GetUserId(), id, accountId);
        return Ok(new { message = "Bank account deleted successfully" });
    }

    // ─── Sub-resource: Important Dates ────────────────────────────────────────────

    [HttpGet("{id:guid}/important-dates")]
    public async Task<IActionResult> GetImportantDates(Guid id)
    {
        var importantDates = await _personService.GetImportantDatesAsync(GetUserId(), id);
        return Ok(new { importantDates });
    }

    [HttpPost("{id:guid}/important-dates")]
    public async Task<IActionResult> CreateImportantDate(Guid id, [FromBody] CreateImportantDateDto request)
    {
        var importantDate = await _personService.CreateImportantDateAsync(GetUserId(), id, request);
        return StatusCode(StatusCodes.Status201Created, new { importantDate });
    }

    [HttpPut("{id:guid}/important-dates/{dateId:guid}")]
    public async Task<IActionResult> UpdateImportantDate(Guid id, Guid dateId, [FromBody] CreateImportantDateDto request)
    {
        var importantDate = await _personService.UpdateImportantDateAsync(GetUserId(), id, dateId, request);
        return Ok(new { importantDate });
    }

    [HttpDelete("{id:guid}/important-dates/{dateId:guid}")]
    public async Task<IActionResult> DeleteImportantDate(Guid id, Guid dateId)
    {
        await _personService.DeleteImportantDateAsync(GetUserId(), id, dateId);
        return Ok(new { message = "Important date deleted successfully" });
    }

    [HttpPost("{id:guid}/important-dates/{dateId:guid}/restore")]
    public async Task<IActionResult> RestoreImportantDate(Guid id, Guid dateId)
    {
        var importantDate = await _personService.RestoreImportantDateAsync(GetUserId(), id, dateId);
        return Ok(new { importantDate });
    }

    [HttpDelete("{id:guid}/important-dates/{dateId:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteImportantDate(Guid id, Guid dateId)
    {
        await _personService.PermanentDeleteImportantDateAsync(GetUserId(), id, dateId);
        return Ok(new { success = true });
    }

    // ─── Advanced: Duplicates ─────────────────────────────────────────────────────

    [HttpGet("duplicates")]
    public async Task<IActionResult> GetAllDuplicates()
    {
        var groups = await _personService.GetAllDuplicatesAsync(GetUserId());
        return Ok(new { groups });
    }

    [HttpGet("{id:guid}/duplicates")]
    public async Task<IActionResult> GetPersonDuplicates(Guid id)
    {
        var duplicates = await _personService.GetPersonDuplicatesAsync(GetUserId(), id);
        return Ok(new { duplicates });
    }

    [HttpPost("duplicates/dismiss")]
    public async Task<IActionResult> DismissDuplicate([FromBody] DismissDuplicateRequest request)
    {
        await _personService.DismissDuplicateAsync(GetUserId(), request.PersonAId, request.PersonBId);
        return Ok(new { dismissed = true });
    }

    // ─── Advanced: Merge ──────────────────────────────────────────────────────────

    [HttpPost("merge")]
    public async Task<IActionResult> MergePeople([FromBody] MergePeopleRequest request)
    {
        var mergedInto = await _personService.MergePeopleAsync(GetUserId(), request);
        return Ok(new { mergedInto });
    }

    // ─── Advanced: Orphans ────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/orphans")]
    public async Task<IActionResult> GetPersonOrphans(Guid id)
    {
        var orphans = await _personService.GetPersonOrphansAsync(GetUserId(), id);
        return Ok(new { orphans });
    }

    [HttpPost("bulk/orphans")]
    public async Task<IActionResult> GetBulkOrphans([FromBody] BulkOrphansRequest request)
    {
        var response = await _personService.GetBulkOrphansAsync(GetUserId(), request);
        return Ok(new { orphans = response.Orphans, hasCardDavSync = response.HasCardDavSync });
    }

    // ─── Advanced: Search Index ───────────────────────────────────────────────────

    [HttpGet("search-index")]
    public async Task<IActionResult> GetSearchIndex()
    {
        var people = await _personService.GetSearchIndexAsync(GetUserId());
        return Ok(new { people });
    }

    // ─── Advanced: Graph ──────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/graph")]
    public async Task<IActionResult> GetPersonGraph(
        Guid id,
        [FromQuery] bool hideUserNode = true,
        [FromQuery] bool includeSolvedCases = true,
        [FromQuery] bool includeRuledOut = true)
    {
        var graph = await _personService.GetPersonGraphAsync(
            GetUserId(),
            id,
            hideUserNode,
            includeSolvedCases,
            includeRuledOut);

        return Ok(new { nodes = graph.Nodes, edges = graph.Edges });
    }
}

