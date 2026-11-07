using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Journal;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class JournalController : ControllerBase
{
    private readonly IJournalService _journalService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreateJournalEntryRequest> _createValidator;
    private readonly IValidator<UpdateJournalEntryRequest> _updateValidator;

    public JournalController(
        IJournalService journalService,
        ICurrentUserService currentUserService,
        IValidator<CreateJournalEntryRequest> createValidator,
        IValidator<UpdateJournalEntryRequest> updateValidator)
    {
        _journalService = journalService;
        _currentUserService = currentUserService;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
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
    public async Task<IActionResult> GetEntries([FromQuery] JournalListQuery query)
    {
        var res = await _journalService.GetEntriesAsync(GetUserId(), query);
        return Ok(new { entries = res.Entries, pagination = res.Pagination });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEntryById(Guid id)
    {
        var entry = await _journalService.GetEntryByIdAsync(GetUserId(), id);
        return Ok(new { entry });
    }

    [HttpPost]
    public async Task<IActionResult> CreateEntry([FromBody] CreateJournalEntryRequest request)
    {
        var validationResult = await _createValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var entry = await _journalService.CreateEntryAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { entry });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEntry(Guid id, [FromBody] UpdateJournalEntryRequest request)
    {
        var validationResult = await _updateValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var entry = await _journalService.UpdateEntryAsync(GetUserId(), id, request);
        return Ok(new { entry });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid id)
    {
        await _journalService.SoftDeleteEntryAsync(GetUserId(), id);
        return Ok(new { message = "Journal entry deleted successfully" });
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestoreEntry(Guid id)
    {
        var entry = await _journalService.RestoreEntryAsync(GetUserId(), id);
        return Ok(new { entry });
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteEntry(Guid id)
    {
        await _journalService.PermanentDeleteEntryAsync(GetUserId(), id);
        return Ok(new { success = true });
    }
}
