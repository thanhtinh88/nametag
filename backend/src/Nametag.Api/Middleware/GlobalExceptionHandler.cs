using Microsoft.AspNetCore.Diagnostics;
using Nametag.Application.Common.Exceptions;

namespace Nametag.Api.Middleware;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, message) = exception switch
        {
            ValidationException valEx => (StatusCodes.Status400BadRequest, valEx.GetFormattedMessage()),
            FluentValidation.ValidationException fvEx => (
                StatusCodes.Status400BadRequest,
                string.Join("; ", fvEx.Errors.Select(e => e.ErrorMessage))),
            BadRequestException badReqEx => (StatusCodes.Status400BadRequest, badReqEx.Message),
            BadHttpRequestException badHttpEx => (StatusCodes.Status400BadRequest, badHttpEx.Message),
            NotFoundException notFoundEx => (StatusCodes.Status404NotFound, notFoundEx.Message),
            ForbiddenException forbiddenEx => (StatusCodes.Status403Forbidden, forbiddenEx.Message),
            UnauthorizedException unauthEx => (StatusCodes.Status401Unauthorized, unauthEx.Message),
            UnauthorizedAccessException unauthAccessEx => (StatusCodes.Status401Unauthorized, unauthAccessEx.Message),
            ConflictException conflictEx => (StatusCodes.Status409Conflict, conflictEx.Message),
            InvalidOperationException invOpEx when invOpEx.Message == "ACCOUNT_LOCKED" => (
                StatusCodes.Status423Locked,
                "Account temporarily locked due to too many failed attempts"),
            _ => (StatusCodes.Status500InternalServerError, "Internal server error")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception occurred while processing request {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
        }
        else
        {
            _logger.LogWarning("Handled application exception ({StatusCode}): {Message} on {Method} {Path}",
                statusCode, message, httpContext.Request.Method, httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";

        await httpContext.Response.WriteAsJsonAsync(new { error = message }, cancellationToken);

        return true;
    }
}

