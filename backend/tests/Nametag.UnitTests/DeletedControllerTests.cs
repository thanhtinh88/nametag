using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Deleted;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class FakeDeletedService : IDeletedService
{
    public Task<DeletedResponseDto> GetDeletedAsync(Guid userId, string? type, CancellationToken ct = default)
    {
        return Task.FromResult(new DeletedResponseDto
        {
            Deleted = new List<DeletedPersonDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Deleted Person", DeletedAt = DateTime.UtcNow }
            },
            RetentionDays = 30,
            CutoffDate = DateTime.UtcNow.AddDays(-30).ToString("o")
        });
    }
}

public class DeletedControllerTests
{
    private readonly FakeDeletedService _service;
    private readonly FakeCurrentUserService _currentUserService;
    private readonly DeletedController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public DeletedControllerTests()
    {
        _service = new FakeDeletedService();
        _currentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new DeletedController(_service, _currentUserService);
    }

    [Fact]
    public async Task GetDeleted_ReturnsOk()
    {
        var result = await _controller.GetDeleted("people");
        var okResult = Assert.IsType<OkObjectResult>(result);
        var resp = Assert.IsType<DeletedResponseDto>(okResult.Value);
        Assert.Equal(30, resp.RetentionDays);
        Assert.NotNull(resp.Deleted);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }
}
