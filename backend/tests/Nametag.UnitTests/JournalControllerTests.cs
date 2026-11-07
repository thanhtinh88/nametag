using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Journal;
using Nametag.Application.Services;
using Nametag.Application.Validators.Journal;
using Xunit;

namespace Nametag.UnitTests;

public class JournalControllerTests
{
    private readonly FakeJournalService _fakeJournalService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly JournalController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public JournalControllerTests()
    {
        _fakeJournalService = new FakeJournalService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new JournalController(
            _fakeJournalService,
            _fakeCurrentUserService,
            new CreateJournalEntryRequestValidator(),
            new UpdateJournalEntryRequestValidator());
    }

    [Fact]
    public async Task GetEntries_ReturnsOk()
    {
        var result = await _controller.GetEntries(new JournalListQuery());
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetEntryById_ReturnsOk()
    {
        var entryId = Guid.NewGuid();
        var result = await _controller.GetEntryById(entryId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateEntry_ReturnsCreated()
    {
        var request = new CreateJournalEntryRequest
        {
            Title = "Investigation Note",
            Body = "Checked the surveillance footage.",
            Date = DateTime.UtcNow
        };
        var result = await _controller.CreateEntry(request);
        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objResult.StatusCode);
    }

    [Fact]
    public async Task UpdateEntry_ReturnsOk()
    {
        var entryId = Guid.NewGuid();
        var request = new UpdateJournalEntryRequest
        {
            Title = "Updated Note"
        };
        var result = await _controller.UpdateEntry(entryId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteEntry_ReturnsOk()
    {
        var entryId = Guid.NewGuid();
        var result = await _controller.DeleteEntry(entryId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RestoreEntry_ReturnsOk()
    {
        var entryId = Guid.NewGuid();
        var result = await _controller.RestoreEntry(entryId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task PermanentDeleteEntry_ReturnsOk()
    {
        var entryId = Guid.NewGuid();
        var result = await _controller.PermanentDeleteEntry(entryId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeJournalService : IJournalService
    {
        public Task<JournalListResponseDto> GetEntriesAsync(Guid userId, JournalListQuery query, CancellationToken ct = default)
        {
            return Task.FromResult(new JournalListResponseDto
            {
                Entries = new List<JournalEntryDto>
                {
                    new() { Id = Guid.NewGuid(), Title = "First Note", Body = "Test" }
                },
                Pagination = new JournalPaginationDto
                {
                    Page = 1,
                    PageSize = 50,
                    TotalCount = 1,
                    TotalPages = 1
                }
            });
        }

        public Task<JournalEntryDto> GetEntryByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new JournalEntryDto { Id = id, Title = "Test Note", Body = "Test" });
        }

        public Task<JournalEntryDto> CreateEntryAsync(Guid userId, CreateJournalEntryRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new JournalEntryDto { Id = Guid.NewGuid(), Title = request.Title, Body = request.Body });
        }

        public Task<JournalEntryDto> UpdateEntryAsync(Guid userId, Guid id, UpdateJournalEntryRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new JournalEntryDto { Id = id, Title = request.Title ?? "Updated", Body = "Test" });
        }

        public Task SoftDeleteEntryAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<JournalEntryDto> RestoreEntryAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new JournalEntryDto { Id = id, Title = "Restored Note" });
        }

        public Task PermanentDeleteEntryAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }
    }
}

