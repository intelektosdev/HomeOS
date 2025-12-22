using System.ComponentModel.DataAnnotations;

namespace HomeOS.Api.Contracts;

public record RegisterRequest(
    [Required][EmailAddress] string Email,
    [Required][MinLength(6)] string Password,
    [Required] string Name
);

public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

public record LoginResponse(
    string Token,
    UserResponse User
);

public record UserResponse(
    Guid Id,
    string Email,
    string Name
);
