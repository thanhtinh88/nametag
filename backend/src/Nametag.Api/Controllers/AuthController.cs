using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Auth;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITokenRevocationService _revocationService;
    private readonly IConfiguration _configuration;

    public AuthController(
        IAuthService authService,
        ICurrentUserService currentUserService,
        ITokenRevocationService revocationService,
        IConfiguration configuration)
    {
        _authService = authService;
        _currentUserService = currentUserService;
        _revocationService = revocationService;
        _configuration = configuration;
    }

    [HttpGet("registration-status")]
    public IActionResult GetRegistrationStatus()
    {
        var disableRegistration = _configuration.GetValue<bool>("Auth:DisableRegistration");
        return Ok(new { enabled = !disableRegistration });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var response = await _authService.LoginAsync(request, ipAddress, userAgent);
            if (response == null)
            {
                return BadRequest(new { error = "Invalid credentials" });
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex) when (ex.Message == "ACCOUNT_LOCKED")
        {
            return StatusCode(423, new { error = "Account temporarily locked due to too many failed attempts" });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var disableRegistration = _configuration.GetValue<bool>("Auth:DisableRegistration");
        if (disableRegistration)
        {
            return BadRequest(new { error = "Registration is currently disabled" });
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        var response = await _authService.RegisterAsync(request, ipAddress, userAgent);
        if (response == null)
        {
            return BadRequest(new { error = "Email is already registered" });
        }

        return Ok(response);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Unauthorized(new { error = "Refresh token is required" });
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        var response = await _authService.RefreshTokenAsync(request.RefreshToken, ipAddress, userAgent);
        if (response == null)
        {
            return Unauthorized(new { error = "Invalid or expired refresh token" });
        }

        return Ok(response);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request)
    {
        // 1. Revoke Access Token JTI if authenticated
        var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (!string.IsNullOrWhiteSpace(jti))
        {
            // Access tokens expire in at most 15 minutes
            await _revocationService.RevokeJtiAsync(jti, TimeSpan.FromMinutes(15));
        }

        // 2. Revoke Refresh Token if provided
        if (!string.IsNullOrWhiteSpace(request?.RefreshToken))
        {
            await _authService.RevokeTokenAsync(request.RefreshToken);
        }

        return Ok(new { success = true });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            return Unauthorized(new { error = "Unauthorized" });
        }

        var user = await _authService.GetCurrentUserAsync(userId.Value);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return Ok(user);
    }
}


