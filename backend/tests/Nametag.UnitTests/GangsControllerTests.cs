using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Gang;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class GangsControllerTests
{
    private readonly FakeGangService _fakeGangService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly GangsController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public GangsControllerTests()
    {
        _fakeGangService = new FakeGangService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new GangsController(_fakeGangService, _fakeCurrentUserService);
    }

    [Fact]
    public async Task GetGangs_ReturnsOk()
    {
        var result = await _controller.GetGangs();
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateGang_ReturnsCreated()
    {
        var request = new CreateGangRequest { Name = "Red Dragons", Color = "#FF0000" };
        var result = await _controller.CreateGang(request);
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetGangById_ReturnsOk()
    {
        var gangId = Guid.NewGuid();
        var result = await _controller.GetGangById(gangId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task UpdateGang_ReturnsOk()
    {
        var gangId = Guid.NewGuid();
        var request = new UpdateGangRequest { Name = "Blue Dragons" };
        var result = await _controller.UpdateGang(gangId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteGang_ReturnsOk()
    {
        var gangId = Guid.NewGuid();
        var result = await _controller.DeleteGang(gangId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task AddOrUpdateMember_ReturnsOk()
    {
        var gangId = Guid.NewGuid();
        var request = new AddGangMemberRequest { PersonId = Guid.NewGuid(), Role = "LEADER" };
        var result = await _controller.AddOrUpdateMember(gangId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RemoveMember_ReturnsOk()
    {
        var gangId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        var result = await _controller.RemoveMember(gangId, personId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeGangService : IGangService
    {
        public Task<List<GangDto>> GetGangsAsync(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(new List<GangDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Red Dragons" }
            });
        }

        public Task<GangDto> GetGangByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new GangDto { Id = id, Name = "Red Dragons" });
        }

        public Task<GangDto> CreateGangAsync(Guid userId, CreateGangRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new GangDto { Id = Guid.NewGuid(), Name = request.Name });
        }

        public Task<GangDto> UpdateGangAsync(Guid userId, Guid id, UpdateGangRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new GangDto { Id = id, Name = request.Name ?? "Updated Gang" });
        }

        public Task DeleteGangAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<GangMemberDto> AddOrUpdateMemberAsync(Guid userId, Guid gangId, AddGangMemberRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new GangMemberDto
            {
                Id = Guid.NewGuid(),
                GangId = gangId,
                PersonId = request.PersonId,
                Role = request.Role ?? "MEMBER"
            });
        }

        public Task RemoveMemberAsync(Guid userId, Guid gangId, Guid personId, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }
    }
}

