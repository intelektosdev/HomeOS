-- Migration: Add ProductId to Financial Transactions
-- This allows tracking which product was purchased in expense transactions

-- Add ProductId to Transactions table
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID(N'[Finance].[Transactions]') 
               AND name = 'ProductId')
BEGIN
    ALTER TABLE [Finance].[Transactions] 
    ADD ProductId UNIQUEIDENTIFIER NULL;
    
    PRINT 'Added ProductId column to Finance.Transactions';
END
ELSE
BEGIN
    PRINT 'ProductId column already exists in Finance.Transactions';
END

-- Add ProductId to CreditCardTransactions table
IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID(N'[Finance].[CreditCardTransactions]') 
               AND name = 'ProductId')
BEGIN
    ALTER TABLE [Finance].[CreditCardTransactions] 
    ADD ProductId UNIQUEIDENTIFIER NULL;
    
    PRINT 'Added ProductId column to Finance.CreditCardTransactions';
END
ELSE
BEGIN
    PRINT 'ProductId column already exists in Finance.CreditCardTransactions';
END

PRINT 'Migration completed successfully';
