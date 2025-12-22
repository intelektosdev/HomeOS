using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.UserTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using HomeOS.Api.Services;
using BCrypt.Net;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserRepository userRepository,
    JwtService jwtService) : ControllerBase
{
    private readonly UserRepository _userRepository = userRepository;
    private readonly JwtService _jwtService = jwtService;

    [HttpPost("register")]
    [AllowAnonymous]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        // Check if email already exists
        if (_userRepository.EmailExists(request.Email))
        {
            return BadRequest(new { error = "Email already registered" });
        }

        // Validate password
        var passwordValidation = UserModule.validatePassword(request.Password);
        if (passwordValidation.IsError)
        {
            return BadRequest(new { error = passwordValidation.ErrorValue.ToString() });
        }

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Create user
        var userResult = UserModule.create(request.Email, passwordHash, request.Name);
        if (userResult.IsError)
        {
            return BadRequest(new { error = userResult.ErrorValue.ToString() });
        }

        var user = userResult.ResultValue;
        _userRepository.Save(user);

        // Generate token
        var token = _jwtService.GenerateToken(user.Id, user.Email, user.Name);

        var response = new LoginResponse(
            token,
            new UserResponse(user.Id, user.Email, user.Name)
        );

        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Get user by email
        var user = _userRepository.GetByEmail(request.Email);
        if (user == null)
        {
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { error = "Invalid credentials" });
        }

        // Generate token
        var token = _jwtService.GenerateToken(user.Id, user.Email, user.Name);

        var response = new LoginResponse(
            token,
            new UserResponse(user.Id, user.Email, user.Name)
        );

        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var user = _userRepository.GetById(userId);
        if (user == null)
        {
            return NotFound();
        }

        var response = new UserResponse(user.Id, user.Email, user.Name);
        return Ok(response);
    }
}
