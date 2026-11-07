using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Person;
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

    public PeopleController(IPersonService personService, ICurrentUserService currentUserService)
    {
        _personService = personService;
        _currentUserService = currentUserService;
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

    [HttpGet("search")]
    public async Task<IActionResult> SearchPeople([FromQuery] string? q)
    {
        var people = await _personService.SearchPeopleAsync(GetUserId(), q ?? string.Empty);
        return Ok(new { people });
    }
}

