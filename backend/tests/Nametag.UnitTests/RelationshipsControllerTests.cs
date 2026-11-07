using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Relationship;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class RelationshipsControllerTests
{
    private readonly FakeRelationshipService _fakeRelationshipService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly RelationshipsController _relationshipsController;
    private readonly RelationshipTypesController _relationshipTypesController;
    private readonly Guid _userId = Guid.NewGuid();

    public RelationshipsControllerTests()
    {
        _fakeRelationshipService = new FakeRelationshipService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _relationshipsController = new RelationshipsController(_fakeRelationshipService, _fakeCurrentUserService);
        _relationshipTypesController = new RelationshipTypesController(_fakeRelationshipService, _fakeCurrentUserService);
    }

    [Fact]
    public async Task GetRelationships_ReturnsOk()
    {
        var result = await _relationshipsController.GetRelationships();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateRelationship_ReturnsCreated()
    {
        var request = new CreateRelationshipRequest
        {
            PersonId = Guid.NewGuid(),
            RelatedPersonId = Guid.NewGuid(),
            RelationshipTypeId = Guid.NewGuid(),
        };

        var result = await _relationshipsController.CreateRelationship(request);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetRelationshipById_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipsController.GetRelationshipById(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task UpdateRelationship_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var request = new UpdateRelationshipRequest { RelationshipTypeId = Guid.NewGuid() };
        var result = await _relationshipsController.UpdateRelationship(id, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteRelationship_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipsController.DeleteRelationship(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RestoreRelationship_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipsController.RestoreRelationship(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task PermanentDeleteRelationship_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipsController.PermanentDeleteRelationship(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    // Relationship Types Controller Tests

    [Fact]
    public async Task GetRelationshipTypes_ReturnsOk()
    {
        var result = await _relationshipTypesController.GetRelationshipTypes();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateRelationshipType_ReturnsCreated()
    {
        var request = new CreateRelationshipTypeRequest
        {
            Name = "PARENT",
            Label = "Parent",
            Color = "#3b82f6"
        };

        var result = await _relationshipTypesController.CreateRelationshipType(request);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetRelationshipTypeById_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipTypesController.GetRelationshipTypeById(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task UpdateRelationshipType_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var request = new UpdateRelationshipTypeRequest
        {
            Name = "GUARDIAN",
            Label = "Guardian",
        };

        var result = await _relationshipTypesController.UpdateRelationshipType(id, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteRelationshipType_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipTypesController.DeleteRelationshipType(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RestoreRelationshipType_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipTypesController.RestoreRelationshipType(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task PermanentDeleteRelationshipType_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var result = await _relationshipTypesController.PermanentDeleteRelationshipType(id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeRelationshipService : IRelationshipService
    {
        public Task<List<RelationshipDto>> GetRelationshipsAsync(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(new List<RelationshipDto> { new() { Id = Guid.NewGuid() } });
        }

        public Task<RelationshipDto> GetRelationshipByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipDto { Id = id });
        }

        public Task<RelationshipDto> CreateRelationshipAsync(Guid userId, CreateRelationshipRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipDto { Id = Guid.NewGuid() });
        }

        public Task<RelationshipDto> UpdateRelationshipAsync(Guid userId, Guid id, UpdateRelationshipRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipDto { Id = id });
        }

        public Task SoftDeleteRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<RelationshipDto> RestoreRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipDto { Id = id });
        }

        public Task PermanentDeleteRelationshipAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<List<RelationshipTypeDto>> GetRelationshipTypesAsync(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(new List<RelationshipTypeDto> { new() { Id = Guid.NewGuid(), Name = "FRIEND", Label = "Friend" } });
        }

        public Task<RelationshipTypeDto> GetRelationshipTypeByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipTypeDto { Id = id, Name = "FRIEND", Label = "Friend" });
        }

        public Task<RelationshipTypeDto> CreateRelationshipTypeAsync(Guid userId, CreateRelationshipTypeRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipTypeDto { Id = Guid.NewGuid(), Name = request.Name, Label = request.Label });
        }

        public Task<RelationshipTypeDto> UpdateRelationshipTypeAsync(Guid userId, Guid id, UpdateRelationshipTypeRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipTypeDto { Id = id, Name = request.Name, Label = request.Label });
        }

        public Task SoftDeleteRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<RelationshipTypeDto> RestoreRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new RelationshipTypeDto { Id = id, Name = "RESTORED", Label = "Restored" });
        }

        public Task PermanentDeleteRelationshipTypeAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }
    }
}

