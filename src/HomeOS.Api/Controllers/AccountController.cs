using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;
using System.Security.Claims;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/accounts")]
[Authorize]
public class AccountController(AccountRepository repository) : ControllerBase
{
    private readonly AccountRepository _repository = repository;

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    [HttpPost]
    public IActionResult Create([FromBody] CreateAccountRequest request)
    {
        var userId = GetCurrentUserId();

        AccountType type = request.Type.ToLower() switch
        {
            "checking" => AccountType.Checking,
            "wallet" => AccountType.Wallet,
            "investment" => AccountType.Investment,
            _ => AccountType.Checking
        };

        var account = AccountModule.create(request.Name, type, request.InitialBalance);

        _repository.Save(account, userId);

        var response = new AccountResponse(
            account.Id,
            account.Name,
            account.Type.ToString(),
            account.InitialBalance,
            account.IsActive
        );

        return CreatedAtAction(nameof(GetById), new { id = account.Id }, response);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var account = _repository.GetById(id, userId);
        if (account == null) return NotFound();

        var response = new AccountResponse(
            account.Id,
            account.Name,
            account.Type.ToString(),
            account.InitialBalance,
            account.IsActive
        );

        return Ok(response);
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var userId = GetCurrentUserId();
        var accounts = _repository.GetAll(userId);
        var response = accounts.Select(a => new AccountResponse(
            a.Id,
            a.Name,
            a.Type.ToString(),
            a.InitialBalance,
            a.IsActive
        ));

        return Ok(response);
    }

    [HttpPut("{id}")]
    public IActionResult Update(Guid id, [FromBody] CreateAccountRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _repository.GetById(id, userId);
        if (existing == null) return NotFound();

        AccountType type = request.Type.ToLower() switch
        {
            "checking" => AccountType.Checking,
            "wallet" => AccountType.Wallet,
            "investment" => AccountType.Investment,
            _ => AccountType.Checking
        };

        var updated = AccountModule.update(existing, request.Name, type, request.InitialBalance);
        _repository.Save(updated, userId);

        var response = new AccountResponse(
            updated.Id,
            updated.Name,
            updated.Type.ToString(),
            updated.InitialBalance,
            updated.IsActive
        );

        return Ok(response);
    }

    [HttpPatch("{id}/toggle-status")]
    public IActionResult ToggleStatus(Guid id)
    {
        var userId = GetCurrentUserId();
        var account = _repository.GetById(id, userId);
        if (account == null) return NotFound();

        // Toggle the IsActive status
        var updatedAccount = AccountModule.toggleActive(account);
        _repository.Save(updatedAccount, userId);

        var response = new AccountResponse(
            updatedAccount.Id,
            updatedAccount.Name,
            updatedAccount.Type.ToString(),
            updatedAccount.InitialBalance,
            updatedAccount.IsActive
        );

        return Ok(response);
    }
}
