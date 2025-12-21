using Microsoft.AspNetCore.Mvc;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Api.Contracts;

namespace HomeOS.Api.Controllers;

[ApiController]
[Route("api/accounts")]
public class AccountController(AccountRepository repository) : ControllerBase
{
    private readonly AccountRepository _repository = repository;

    [HttpPost]
    public IActionResult Create([FromBody] CreateAccountRequest request)
    {
        AccountType type = request.Type.ToLower() switch
        {
            "checking" => AccountType.Checking,
            "wallet" => AccountType.Wallet,
            "investment" => AccountType.Investment,
            _ => AccountType.Checking
        };

        var account = AccountModule.create(request.Name, type, request.InitialBalance);

        _repository.Save(account);

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
        var account = _repository.GetById(id);
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
        var accounts = _repository.GetAll();
        var response = accounts.Select(a => new AccountResponse(
            a.Id,
            a.Name,
            a.Type.ToString(),
            a.InitialBalance,
            a.IsActive
        ));

        return Ok(response);
    }
}
