-- =============================================
-- Script: InvestmentSchema.sql
-- Descrição: Schema para controle de investimentos (ações, renda fixa, etc)
-- =============================================

-- Tabela de Investimentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[Investments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[Investments] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(200) NOT NULL,
        [Type] NVARCHAR(MAX) NOT NULL,  -- JSON: InvestmentType (Stock/FixedIncome/RealEstate/Crypto/Other)
        
        -- Informações Financeiras
        [InitialAmount] DECIMAL(19,4) NOT NULL CHECK ([InitialAmount] > 0),
        [CurrentQuantity] DECIMAL(19,6) NOT NULL,  -- Precisão maior para ações fracionadas
        [AveragePrice] DECIMAL(19,4) NOT NULL,
        [CurrentPrice] DECIMAL(19,4) NOT NULL,
        
        -- Prazos (aplicável principalmente para Renda Fixa)
        [InvestmentDate] DATETIME2 NOT NULL,
        [MaturityDate] DATETIME2 NULL,
        [AnnualYield] DECIMAL(10,4) NULL,  -- Taxa anual (ex: 0.1250 = 12.5% a.a.)
        
        -- Controle
        [Status] NVARCHAR(MAX) NOT NULL,  -- JSON: InvestmentStatus (Active/Redeemed/Matured)
        [LinkedAccountId] UNIQUEIDENTIFIER NULL,
        [Notes] NVARCHAR(MAX) NULL,
        
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2 NULL,
        
        CONSTRAINT FK_Investments_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id]),
        CONSTRAINT FK_Investments_Accounts FOREIGN KEY ([LinkedAccountId]) REFERENCES [Finance].[Accounts]([Id])
    );
    
    PRINT 'Tabela [Finance].[Investments] criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela [Finance].[Investments] já existe.';
END
GO

-- Tabela de Transações de Investimento (Compra/Venda/Proventos)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[InvestmentTransactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[InvestmentTransactions] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [InvestmentId] UNIQUEIDENTIFIER NOT NULL,
        [Type] NVARCHAR(50) NOT NULL,  -- Buy, Sell, Dividend, InterestPayment
        [Date] DATETIME2 NOT NULL,
        
        -- Detalhes da Transação
        [Quantity] DECIMAL(19,6) NOT NULL,
        [UnitPrice] DECIMAL(19,4) NOT NULL,
        [TotalAmount] DECIMAL(19,4) NOT NULL,
        [Fees] DECIMAL(19,4) NOT NULL DEFAULT 0,  -- Corretagem, impostos, etc.
        
        -- Link com transação financeira (débito/crédito na conta)
        [FinancialTransactionId] UNIQUEIDENTIFIER NULL,
        
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_InvestmentTransactions_Investments FOREIGN KEY ([InvestmentId]) REFERENCES [Finance].[Investments]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_InvestmentTransactions_Transactions FOREIGN KEY ([FinancialTransactionId]) REFERENCES [Finance].[Transactions]([Id]),
        CONSTRAINT CK_InvestmentTransaction_Type CHECK ([Type] IN ('Buy', 'Sell', 'Dividend', 'InterestPayment'))
    );
    
    PRINT 'Tabela [Finance].[InvestmentTransactions] criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela [Finance].[InvestmentTransactions] já existe.';
END
GO

-- Índices para Performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Investments_User' AND object_id = OBJECT_ID('[Finance].[Investments]'))
BEGIN
    CREATE INDEX IX_Investments_User ON [Finance].[Investments] ([UserId]);
    PRINT 'Índice IX_Investments_User criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Investments_LinkedAccount' AND object_id = OBJECT_ID('[Finance].[Investments]'))
BEGIN
    CREATE INDEX IX_Investments_LinkedAccount ON [Finance].[Investments] ([LinkedAccountId]) WHERE [LinkedAccountId] IS NOT NULL;
    PRINT 'Índice IX_Investments_LinkedAccount criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvestmentTransactions_Investment' AND object_id = OBJECT_ID('[Finance].[InvestmentTransactions]'))
BEGIN
    CREATE INDEX IX_InvestmentTransactions_Investment ON [Finance].[InvestmentTransactions] ([InvestmentId], [Date]);
    PRINT 'Índice IX_InvestmentTransactions_Investment criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvestmentTransactions_Type' AND object_id = OBJECT_ID('[Finance].[InvestmentTransactions]'))
BEGIN
    CREATE INDEX IX_InvestmentTransactions_Type ON [Finance].[InvestmentTransactions] ([Type], [Date]);
    PRINT 'Índice IX_InvestmentTransactions_Type criado.';
END
GO

-- View para resumo de portfólio (opcional, mas útil)
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_PortfolioSummary')
BEGIN
    EXEC('
    CREATE VIEW [Finance].[vw_PortfolioSummary] AS
    SELECT 
        i.UserId,
        i.Type,
        COUNT(*) as TotalInvestments,
        SUM(i.InitialAmount) as TotalInvested,
        SUM(i.CurrentPrice * i.CurrentQuantity) as CurrentValue,
        SUM(i.CurrentPrice * i.CurrentQuantity) - SUM(i.InitialAmount) as TotalReturn,
        CASE 
            WHEN SUM(i.InitialAmount) > 0 
            THEN ((SUM(i.CurrentPrice * i.CurrentQuantity) - SUM(i.InitialAmount)) / SUM(i.InitialAmount) * 100)
            ELSE 0 
        END as ReturnPercentage
    FROM [Finance].[Investments] i
    WHERE JSON_VALUE(i.Status, ''$.Case'') = ''Active''
    GROUP BY i.UserId, i.Type
    ');
    PRINT 'View vw_PortfolioSummary criada.';
END
GO

PRINT 'Schema de Investimentos configurado com sucesso!';
GO
