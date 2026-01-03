-- ==========================================================
-- MIGRATION: Separate Credit Card Transactions
-- 1. Create CreditCardTransactions table
-- 2. Migrate data from Transactions table
-- 3. Clean up Transactions table
-- ==========================================================

USE finance_dev;
GO

-- 1. Create Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CreditCardTransactions' AND schema_id = SCHEMA_ID('Finance'))
BEGIN
    CREATE TABLE [Finance].[CreditCardTransactions] (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        CreditCardId UNIQUEIDENTIFIER NOT NULL,
        CategoryId UNIQUEIDENTIFIER NOT NULL,
        
        Description NVARCHAR(255) NOT NULL,
        Amount DECIMAL(19,4) NOT NULL CHECK (Amount > 0),
        TransactionDate DATETIME2 NOT NULL,
        CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        -- Installments
        InstallmentId UNIQUEIDENTIFIER NULL,
        InstallmentNumber INT NULL,
        TotalInstallments INT NULL,
        
        -- Status Control
        -- 1: Open, 2: Paid/Invoiced
        StatusId TINYINT NOT NULL DEFAULT 1,
        BillPaymentId UNIQUEIDENTIFIER NULL, -- Link to the payment event

        CONSTRAINT FK_CCTransactions_Users FOREIGN KEY (UserId) REFERENCES [Finance].[Users](Id),
        CONSTRAINT FK_CCTransactions_CreditCards FOREIGN KEY (CreditCardId) REFERENCES [Finance].[CreditCards](Id),
        CONSTRAINT FK_CCTransactions_Categories FOREIGN KEY (CategoryId) REFERENCES [Finance].[Categories](Id),
        CONSTRAINT FK_CCTransactions_CreditCardPayments FOREIGN KEY (BillPaymentId) REFERENCES [Finance].[CreditCardPayments](Id)
    );
    
    CREATE INDEX IX_CCTransactions_Card_Date ON [Finance].[CreditCardTransactions](CreditCardId, TransactionDate);
    CREATE INDEX IX_CCTransactions_Payment ON [Finance].[CreditCardTransactions](BillPaymentId);

    PRINT 'Table [Finance].[CreditCardTransactions] created.';
END
GO

-- 2. Migrate Data
-- Move transactions that have a CreditCardId defined
INSERT INTO [Finance].[CreditCardTransactions] 
    (Id, UserId, CreditCardId, CategoryId, Description, Amount, TransactionDate, CreatedAt, InstallmentId, InstallmentNumber, TotalInstallments, StatusId, BillPaymentId)
SELECT 
    t.Id, 
    t.UserId, 
    t.CreditCardId, 
    t.CategoryId, 
    t.Description, 
    t.Amount, 
    t.DueDate, -- Use DueDate as TransactionDate for CC expenses (usually the same in this system)
    t.CreatedAt, 
    t.InstallmentId, 
    t.InstallmentNumber, 
    t.TotalInstallments,
    CASE 
        WHEN t.StatusId = 3 THEN 2 -- Conciliated -> Paid
        WHEN t.BillPaymentId IS NOT NULL THEN 2 -- Has Link -> Paid
        ELSE 1 -- Pending -> Open
    END as StatusId,
    t.BillPaymentId
FROM [Finance].[Transactions] t
WHERE t.CreditCardId IS NOT NULL;

PRINT 'Data migrated from Transactions to CreditCardTransactions.';
GO

-- 3. Clean up Transactions table
-- Delete migrated rows from the old table
DELETE FROM [Finance].[Transactions]
WHERE CreditCardId IS NOT NULL;

PRINT 'Cleaned up [Finance].[Transactions].';
GO

-- 4. Drop columns if desired (Optional, maybe keep for safety for now, or drop to enforce separation)
-- ALTER TABLE [Finance].[Transactions] DROP CONSTRAINT FK_Transactions_CreditCards;
-- ALTER TABLE [Finance].[Transactions] DROP COLUMN CreditCardId;
-- ALTER TABLE [Finance].[Transactions] DROP COLUMN InstallmentId;
-- ALTER TABLE [Finance].[Transactions] DROP COLUMN InstallmentNumber;
-- ALTER TABLE [Finance].[Transactions] DROP COLUMN TotalInstallments;
-- PRINT 'Dropped unused columns from [Finance].[Transactions].';
-- GO
