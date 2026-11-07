using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.CustomFieldTemplate;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class CustomFieldTemplatesControllerTests
{
    private readonly FakeCustomFieldTemplateService _fakeTemplateService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly CustomFieldTemplatesController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public CustomFieldTemplatesControllerTests()
    {
        _fakeTemplateService = new FakeCustomFieldTemplateService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new CustomFieldTemplatesController(_fakeTemplateService, _fakeCurrentUserService);
    }

    [Fact]
    public async Task GetTemplates_ReturnsOk()
    {
        var result = await _controller.GetTemplates();
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateTemplate_ReturnsCreated()
    {
        var request = new CreateCustomFieldTemplateRequest { Name = "Rank", Type = "TEXT" };
        var result = await _controller.CreateTemplate(request);
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetTemplateById_ReturnsOk()
    {
        var templateId = Guid.NewGuid();
        var result = await _controller.GetTemplateById(templateId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task UpdateTemplate_ReturnsOk()
    {
        var templateId = Guid.NewGuid();
        var request = new UpdateCustomFieldTemplateRequest { Name = "Updated Rank" };
        var result = await _controller.UpdateTemplate(templateId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteTemplate_ReturnsOk()
    {
        var templateId = Guid.NewGuid();
        var result = await _controller.DeleteTemplate(templateId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task ReorderTemplates_ReturnsOk()
    {
        var request = new ReorderCustomFieldTemplatesRequest { Ids = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() } };
        var result = await _controller.ReorderTemplates(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeCustomFieldTemplateService : ICustomFieldTemplateService
    {
        public Task<List<CustomFieldTemplateDto>> GetTemplatesAsync(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(new List<CustomFieldTemplateDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Rank", Type = "TEXT", Slug = "rank" }
            });
        }

        public Task<CustomFieldTemplateDto> GetTemplateByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new CustomFieldTemplateDto { Id = id, Name = "Rank", Type = "TEXT", Slug = "rank" });
        }

        public Task<CustomFieldTemplateDto> CreateTemplateAsync(Guid userId, CreateCustomFieldTemplateRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new CustomFieldTemplateDto { Id = Guid.NewGuid(), Name = request.Name, Type = request.Type, Slug = "slug" });
        }

        public Task<CustomFieldTemplateDto> UpdateTemplateAsync(Guid userId, Guid id, UpdateCustomFieldTemplateRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new CustomFieldTemplateDto { Id = id, Name = request.Name ?? "Updated", Type = "TEXT", Slug = "slug" });
        }

        public Task DeleteTemplateAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task ReorderTemplatesAsync(Guid userId, ReorderCustomFieldTemplatesRequest request, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }
    }
}

