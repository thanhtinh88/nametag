using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Group;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class GroupsControllerTests
{
    private readonly FakeGroupService _fakeGroupService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly GroupsController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public GroupsControllerTests()
    {
        _fakeGroupService = new FakeGroupService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new GroupsController(_fakeGroupService, _fakeCurrentUserService);
    }

    [Fact]
    public async Task GetGroups_ReturnsOk()
    {
        var result = await _controller.GetGroups();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetGroupById_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var result = await _controller.GetGroupById(groupId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateGroup_ReturnsCreated()
    {
        var request = new CreateGroupRequest { Name = "Family", Color = "#ff0000" };
        var result = await _controller.CreateGroup(request);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
    }

    [Fact]
    public async Task UpdateGroup_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var request = new UpdateGroupRequest { Name = "Friends" };
        var result = await _controller.UpdateGroup(groupId, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteGroup_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var result = await _controller.DeleteGroup(groupId, deletePeople: false);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RestoreGroup_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var result = await _controller.RestoreGroup(groupId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task PermanentDeleteGroup_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var result = await _controller.PermanentDeleteGroup(groupId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task AddMember_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var request = new AddGroupMemberRequest { PersonId = Guid.NewGuid() };
        var result = await _controller.AddMember(groupId, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RemoveMember_ReturnsOk()
    {
        var groupId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        var result = await _controller.RemoveMember(groupId, personId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeGroupService : IGroupService
    {
        public Task<List<GroupDto>> GetGroupsAsync(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(new List<GroupDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Colleagues" }
            });
        }

        public Task<GroupDto> GetGroupByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new GroupDto { Id = id, Name = "Colleagues" });
        }

        public Task<GroupDto> CreateGroupAsync(Guid userId, CreateGroupRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new GroupDto { Id = Guid.NewGuid(), Name = request.Name });
        }

        public Task<GroupDto> UpdateGroupAsync(Guid userId, Guid id, UpdateGroupRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new GroupDto { Id = id, Name = request.Name });
        }

        public Task SoftDeleteGroupAsync(Guid userId, Guid id, bool deletePeople, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<GroupDto> RestoreGroupAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new GroupDto { Id = id, Name = "Restored Group" });
        }

        public Task PermanentDeleteGroupAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task AddMemberAsync(Guid userId, Guid id, Guid personId, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task RemoveMemberAsync(Guid userId, Guid id, Guid personId, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }
    }
}

