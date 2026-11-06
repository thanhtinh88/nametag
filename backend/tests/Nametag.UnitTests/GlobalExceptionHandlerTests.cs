using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Nametag.Api.Middleware;
using Nametag.Application.Common.Exceptions;
using Xunit;

namespace Nametag.UnitTests;

public class GlobalExceptionHandlerTests
{
    private readonly GlobalExceptionHandler _handler;

    public GlobalExceptionHandlerTests()
    {
        _handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
    }

    [Theory]
    [InlineData(typeof(NotFoundException), "Entity not found", StatusCodes.Status404NotFound)]
    [InlineData(typeof(BadRequestException), "Invalid request data", StatusCodes.Status400BadRequest)]
    [InlineData(typeof(ForbiddenException), "Access denied", StatusCodes.Status403Forbidden)]
    [InlineData(typeof(ConflictException), "Data conflict", StatusCodes.Status409Conflict)]
    [InlineData(typeof(UnauthorizedException), "Unauthorized user", StatusCodes.Status401Unauthorized)]
    public async Task TryHandleAsync_ShouldReturnExpectedStatusCodeAndJson(Type exceptionType, string message, int expectedStatusCode)
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = (Exception)Activator.CreateInstance(exceptionType, message)!;

        // Act
        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(expectedStatusCode, context.Response.StatusCode);
        Assert.StartsWith("application/json", context.Response.ContentType);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var json = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(json);

        Assert.Equal(message, doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_ValidationException_ShouldFormatErrors()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = new ValidationException("Field is invalid");

        // Act
        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var json = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(json);

        Assert.Equal("Field is invalid", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_AccountLocked_ShouldReturn423()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = new InvalidOperationException("ACCOUNT_LOCKED");

        // Act
        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status423Locked, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var json = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(json);

        Assert.Equal("Account temporarily locked due to too many failed attempts", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_UnhandledException_ShouldReturn500()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = new Exception("Database crashed unexpected");

        // Act
        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var json = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(json);

        Assert.Equal("Internal server error", doc.RootElement.GetProperty("error").GetString());
    }
}
