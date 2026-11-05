namespace Nametag.Application.DTOs.Auth;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string? Photo { get; set; }
    public string Theme { get; set; } = "DARK";
    public string DateFormat { get; set; } = "MDY";
    public string NameOrder { get; set; } = "WESTERN";
    public string NameDisplayFormat { get; set; } = "FULL";
    public string Language { get; set; } = "en";
}

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public UserDto User { get; set; } = null!;
}

