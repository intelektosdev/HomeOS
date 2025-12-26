using HomeOS.Infra.Repositories;
using HomeOS.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Register Repositories
builder.Services.AddScoped<TransactionRepository>();
builder.Services.AddScoped<CategoryRepository>();
builder.Services.AddScoped<AccountRepository>();
builder.Services.AddScoped<CreditCardRepository>();
builder.Services.AddScoped<UserRepository>();

// Inventory Repositories
builder.Services.AddScoped<ProductRepository>();
builder.Services.AddScoped<ProductGroupRepository>();
builder.Services.AddScoped<SupplierRepository>();
builder.Services.AddScoped<ShoppingListRepository>();
builder.Services.AddScoped<PurchaseItemRepository>();
builder.Services.AddScoped<CreditCardPaymentRepository>();
builder.Services.AddScoped<RecurringTransactionRepository>();

// Debt and Investment Repositories
builder.Services.AddScoped<DebtRepository>();
builder.Services.AddScoped<InvestmentRepository>();

// Register Services
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<HomeOS.Infra.Services.RecurringTransactionService>();

// Add HttpContextAccessor for getting current user in controllers
builder.Services.AddHttpContextAccessor();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // System.Text.Json com suporte a F#
        options.JsonSerializerOptions.Converters.Add(new JsonFSharpConverter(
            unionEncoding: JsonUnionEncoding.UnwrapFieldlessTags |
                           JsonUnionEncoding.UnwrapOption));
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod());
});

// Configure JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "your-super-secret-key-change-this-in-production-min-32-chars";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "HomeOS";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "HomeOS";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

var app = builder.Build();

app.UseCors("AllowFrontend");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

// IMPORTANT: Authentication must come before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

// Isso torna a classe Program pública para o projeto de testes
