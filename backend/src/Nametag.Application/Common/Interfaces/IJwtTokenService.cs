using System.Security.Claims;
using Nametag.Application.DTOs.Auth;
using Nametag.Domain.Entities;

namespace Nametag.Application.Common.Interfaces;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt, string Jti) GenerateAccessToken(User user);
    (string PlainToken, string TokenHash) GenerateRefreshToken();
    string GetJwkSetJson();
}

