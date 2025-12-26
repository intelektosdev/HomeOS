-- =============================================
-- Script: DebtSchema.sql
-- Descrição: Schema para controle de dívidas (financiamentos, empréstimos)
-- =============================================

-- Tabela de Dívidas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[Debts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[Debts] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(200) NOT NULL,
        [Category] NVARCHAR(MAX) NOT NULL,  -- JSON: DebtCategory
        [Creditor] NVARCHAR(200) NOT NULL,
        
        -- Valores Financeiros
        [OriginalAmount] DECIMAL(19,4) NOT NULL CHECK ([OriginalAmount] > 0),
        [CurrentBalance] DECIMAL(19,4) NOT NULL,
        [InterestType] NVARCHAR(MAX) NOT NULL,  -- JSON: InterestType (Fixed/Variable)
        [AmortizationType] NVARCHAR(50) NOT NULL,  -- Price, SAC, Bullet, Custom
        
        -- Prazos
        [StartDate] DATETIME2 NOT NULL,
        [TotalInstallments] INT NOT NULL CHECK ([TotalInstallments] > 0),
        [InstallmentsPaid] INT NOT NULL DEFAULT 0,
        
        -- Controle
        [Status] NVARCHAR(MAX) NOT NULL,  -- JSON: DebtStatus (Active/PaidOff/Refinanced/Defaulted)
        [LinkedAccountId] UNIQUEIDENTIFIER NULL,
        [Notes] NVARCHAR(MAX) NULL,
        
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_Debts_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id]),
        CONSTRAINT FK_Debts_Accounts FOREIGN KEY ([LinkedAccountId]) REFERENCES [Finance].[Accounts]([Id])
    );
    
    PRINT 'Tabela [Finance].[Debts] criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela [Finance].[Debts] já existe.';
END
GO

-- Tabela de Parcelas (Histórico e Projeção de Amortização)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[DebtInstallments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[DebtInstallments] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [DebtId] UNIQUEIDENTIFIER NOT NULL,
        [InstallmentNumber] INT NOT NULL,
        [DueDate] DATETIME2 NOT NULL,
        [PaidDate] DATETIME2 NULL,
        
        -- Decomposição da Parcela (Principal + Juros)
        [TotalAmount] DECIMAL(19,4) NOT NULL,
        [PrincipalAmount] DECIMAL(19,4) NOT NULL,
        [InterestAmount] DECIMAL(19,4) NOT NULL,
        [RemainingBalance] DECIMAL(19,4) NOT NULL,
        
        -- Integração com Transações Financeiras
        [TransactionId] UNIQUEIDENTIFIER NULL,
        
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_DebtInstallments_Debts FOREIGN KEY ([DebtId]) REFERENCES [Finance].[Debts]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_DebtInstallments_Transactions FOREIGN KEY ([TransactionId]) REFERENCES [Finance].[Transactions]([Id]),
        CONSTRAINT UQ_DebtInstallment UNIQUE ([DebtId], [InstallmentNumber])
    );
    
    PRINT 'Tabela [Finance].[DebtInstallments] criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela [Finance].[DebtInstallments] já existe.';
END
GO

-- Índices para Performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Debts_User' AND object_id = OBJECT_ID('[Finance].[Debts]'))
BEGIN
    CREATE INDEX IX_Debts_User ON [Finance].[Debts] ([UserId]);
    PRINT 'Índice IX_Debts_User criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Debts_LinkedAccount' AND object_id = OBJECT_ID('[Finance].[Debts]'))
BEGIN
    CREATE INDEX IX_Debts_LinkedAccount ON [Finance].[Debts] ([LinkedAccountId]) WHERE [LinkedAccountId] IS NOT NULL;
    PRINT 'Índice IX_Debts_LinkedAccount criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DebtInstallments_Debt' AND object_id = OBJECT_ID('[Finance].[DebtInstallments]'))
BEGIN
    CREATE INDEX IX_DebtInstallments_Debt ON [Finance].[DebtInstallments] ([DebtId], [InstallmentNumber]);
    PRINT 'Índice IX_DebtInstallments_Debt criado.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DebtInstallments_DueDate' AND object_id = OBJECT_ID('[Finance].[DebtInstallments]'))
BEGIN
    CREATE INDEX IX_DebtInstallments_DueDate ON [Finance].[DebtInstallments] ([DueDate]) WHERE [PaidDate] IS NULL;
    PRINT 'Índice IX_DebtInstallments_DueDate criado.';
END
GO

PRINT 'Schema de Dívidas configurado com sucesso!';
GO
