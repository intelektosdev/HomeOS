-- =====================================================
-- Migration: Add PostingDate to CreditCardTransactions
-- Date: 2026-01-13
-- Description: Adds PostingDate field to support delayed transaction posting
-- =====================================================

USE finance_dev;
GO

-- Adicionar nova coluna PostingDate na tabela CreditCardTransactions
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[Finance].[CreditCardTransactions]') 
    AND name = 'PostingDate'
)
BEGIN
    ALTER TABLE [Finance].[CreditCardTransactions]
    ADD PostingDate DATETIME2 NULL;
    PRINT 'Column PostingDate added to CreditCardTransactions';
END
ELSE
BEGIN
    PRINT 'Column PostingDate already exists in CreditCardTransactions';
END
GO

-- Popular dados existentes: PostingDate = TransactionDate (manter comportamento atual)
UPDATE [Finance].[CreditCardTransactions]
SET PostingDate = TransactionDate
WHERE PostingDate IS NULL;
GO

PRINT 'Existing transactions updated with PostingDate = TransactionDate';
GO

-- Tornar coluna obrigatória após popular dados
ALTER TABLE [Finance].[CreditCardTransactions]
ALTER COLUMN PostingDate DATETIME2 NOT NULL;
GO

PRINT 'PostingDate column set to NOT NULL';
GO

-- Criar índice para otimizar consultas por PostingDate
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_CreditCardTransactions_PostingDate' 
    AND object_id = OBJECT_ID(N'[Finance].[CreditCardTransactions]')
)
BEGIN
    CREATE INDEX IX_CreditCardTransactions_PostingDate 
    ON [Finance].[CreditCardTransactions](PostingDate);
    PRINT 'Index IX_CreditCardTransactions_PostingDate created';
END
ELSE
BEGIN
    PRINT 'Index IX_CreditCardTransactions_PostingDate already exists';
END
GO

PRINT 'Migration completed successfully!';
GO
