-- ============================================
-- Credit Card Payment System Schema Update
-- ============================================

-- 1. Create CreditCardPayments table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CreditCardPayments' AND schema_id = SCHEMA_ID('Finance'))
BEGIN
    CREATE TABLE [Finance].[CreditCardPayments] (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL,
        CreditCardId UNIQUEIDENTIFIER NOT NULL,
        AccountId UNIQUEIDENTIFIER NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        PaymentDate DATETIME NOT NULL,
        ReferenceMonth INT NOT NULL, -- YYYYMM format
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_CreditCardPayments_Users FOREIGN KEY (UserId) REFERENCES [Finance].[Users](Id),
        CONSTRAINT FK_CreditCardPayments_CreditCards FOREIGN KEY (CreditCardId) REFERENCES [Finance].[CreditCards](Id),
        CONSTRAINT FK_CreditCardPayments_Accounts FOREIGN KEY (AccountId) REFERENCES [Finance].[Accounts](Id)
    );

    CREATE INDEX IX_CreditCardPayments_CreditCard ON [Finance].[CreditCardPayments](CreditCardId);
    CREATE INDEX IX_CreditCardPayments_User ON [Finance].[CreditCardPayments](UserId);
    
    PRINT 'Created table [Finance].[CreditCardPayments]';
END
GO

-- 2. Add BillPaymentId column to Transactions
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Finance].[Transactions]') AND name = 'BillPaymentId')
BEGIN
    ALTER TABLE [Finance].[Transactions]
    ADD BillPaymentId UNIQUEIDENTIFIER NULL;
    
    ALTER TABLE [Finance].[Transactions]
    ADD CONSTRAINT FK_Transactions_CreditCardPayments 
        FOREIGN KEY (BillPaymentId) REFERENCES [Finance].[CreditCardPayments](Id);
    
    CREATE INDEX IX_Transactions_BillPaymentId ON [Finance].[Transactions](BillPaymentId);
    
    PRINT 'Added BillPaymentId column to [Finance].[Transactions]';
END
GO

PRINT 'Schema update completed successfully.';
