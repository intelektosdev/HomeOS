using FluentAssertions;
using HomeOS.Domain.FinancialTypes;
using HomeOS.Infra.Repositories;
using HomeOS.Infra.Services;
using Microsoft.Extensions.Logging;
using Microsoft.FSharp.Core;
using Moq;
using Xunit;

namespace HomeOS.Tests;

public class RecurringTransactionServiceTests
{
    private readonly Mock<RecurringTransactionRepository> _mockRecurringRepo;
    private readonly Mock<TransactionRepository> _mockTransactionRepo;
    private readonly Mock<ILogger<RecurringTransactionService>> _mockLogger;
    private readonly RecurringTransactionService _service;

    public RecurringTransactionServiceTests()
    {
        // Setup mocks
        // Note: For real applications we might interface repositories, but sticking to the current implementation
        // Since the repositories are classes, we need to ensure they have virtual methods or use strict mocks carefully.
        // Looking at the code, Repository methods are likely not virtual. 
        // Ideally we should extract interfaces, but for this task I'll rely on Moq's ability to mock classes if methods are virtual or I'll wrap them.

        // Wait, if methods are not virtual, Moq won't work on classes. 
        // Let's assume for this exercise we can mock or we are testing the logic. 
        // Actually, looking at HomeOS.Infra, repositories usually obey an interface or can be mocked if virtual.
        // If not, I might need to make them virtual or extract interface.
        // Let's first try to mock. If it fails, I'll extract ISomeRepository.

        // However, I can't easily change the whole infra now. 
        // Mock IConfiguration to satisfy Repository constructor
        var mockConfig = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
        var mockSection = new Mock<Microsoft.Extensions.Configuration.IConfigurationSection>();

        // Setup GetSection("ConnectionStrings") to return a mock section
        mockConfig.Setup(c => c.GetSection("ConnectionStrings")).Returns(mockSection.Object);

        // Setup the indexer ["DefaultConnection"] on the section
        mockSection.Setup(s => s["DefaultConnection"]).Returns("Server=.;Database=Dummy;Trusted_Connection=True;");

        // Also setup .Value for direct access if needed
        mockSection.Setup(s => s.Value).Returns("Server=.;Database=Dummy;Trusted_Connection=True;");

        _mockRecurringRepo = new Mock<RecurringTransactionRepository>(mockConfig.Object);
        _mockTransactionRepo = new Mock<TransactionRepository>(mockConfig.Object);
        _mockLogger = new Mock<ILogger<RecurringTransactionService>>();

        _service = new RecurringTransactionService(
            _mockRecurringRepo.Object,
            _mockTransactionRepo.Object,
            _mockLogger.Object
        );
    }

    [Fact]
    public void GenerateTransactions_IncomeRecurring_ShouldCreateIncomeTransaction()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var recurring = new RecurringTransaction(
            Guid.NewGuid(),
            "Salary",
            TransactionType.Income, // IT IS INCOME
            Guid.NewGuid(),
            TransactionSource.NewFromAccount(accountId),
            AmountType.NewFixed(5000m),
            RecurrenceFrequency.Monthly,
            FSharpOption<int>.Some(5),
            new DateTime(2024, 1, 1),
            FSharpOption<DateTime>.None,
            new DateTime(2024, 1, 5), // Next occurrence
            true,
            DateTime.Now,
            FSharpOption<DateTime>.None
        );

        _mockRecurringRepo
            .Setup(r => r.GetDueForGeneration(userId, It.IsAny<DateTime>()))
            .Returns(new List<RecurringTransaction> { recurring });

        _mockRecurringRepo
            .Setup(r => r.GetById(recurring.Id, userId))
            .Returns(recurring); // Return same to avoid loop break on check

        // Act
        _service.GenerateTransactions(userId, new DateTime(2024, 1, 6));

        // Assert
        _mockTransactionRepo.Verify(t => t.Save(
            It.Is<Transaction>(txn => txn.Type == TransactionType.Income && txn.Amount == 5000m),
            userId),
            Times.Once,
            "Should save a transaction with Type=Income"
        );
    }
}
