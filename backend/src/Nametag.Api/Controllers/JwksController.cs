using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Interfaces;

namespace Nametag.Api.Controllers;

[ApiController]
public class JwksController : ControllerBase
{
    private readonly IJwtTokenService _jwtTokenService;

    public JwksController(IJwtTokenService jwtTokenService)
    {
        _jwtTokenService = jwtTokenService;
    }

    [HttpGet(".well-known/jwks.json")]
    [Produces("application/json")]
    public IActionResult GetJwks()
    {
        var json = _jwtTokenService.GetJwkSetJson();
        return Content(json, "application/json");
    }
}

