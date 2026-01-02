-- ============================================
-- FIX: Credit Card Payment Foreign Key
-- Run this script to fix the SQL Error 547
-- ============================================

USE finance_dev;
GO

-- 1. Drop potential conflicting constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('[Finance].[Transactions]') AND name = 'FK_Transactions_CreditCardPayments')
BEGIN
    ALTER TABLE [Finance].[Transactions] DROP CONSTRAINT FK_Transactions_CreditCardPayments;
    PRINT 'Dropped existing FK_Transactions_CreditCardPayments';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('[Finance].[Transactions]') AND name = 'FK_Transactions_BillPayments')
BEGIN
    ALTER TABLE [Finance].[Transactions] DROP CONSTRAINT FK_Transactions_BillPayments;
    PRINT 'Dropped legacy FK_Transactions_BillPayments';
END

-- 2. Ensure BillPaymentId column exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Finance].[Transactions]') AND name = 'BillPaymentId')
BEGIN
    ALTER TABLE [Finance].[Transactions] ADD BillPaymentId UNIQUEIDENTIFIER NULL;
    PRINT 'Created BillPaymentId column';
END

-- 3. Create the correct Foreign Key constraint
-- Verify CreditCardPayments table exists first
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CreditCardPayments' AND schema_id = SCHEMA_ID('Finance'))
BEGIN
    ALTER TABLE [Finance].[Transactions]
    ADD CONSTRAINT FK_Transactions_CreditCardPayments 
        FOREIGN KEY (BillPaymentId) REFERENCES [Finance].[CreditCardPayments](Id);
    PRINT 'Created correct FK_Transactions_CreditCardPayments constraint';
END
ELSE
BEGIN
    PRINT 'ERROR: Table [Finance].[CreditCardPayments] does not exist! Please run CreditCardPaymentSchema.sql first.';
END
GO
