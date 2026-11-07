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
    }
}
