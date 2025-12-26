-- Criação do Schema para separar as tabelas do sistema (boa prática)
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Finance')
BEGIN
    EXEC('CREATE SCHEMA [Finance]')
END
GO

-- 1. Tabela de Usuários (ou Famílias/Tenants)
CREATE TABLE [Finance].[Users] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(150) NOT NULL UNIQUE,
    [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

-- 2. Categorias (Alimentação, Moradia, Salário)
CREATE TABLE [Finance].[Categories] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL, -- Cada usuário tem suas categorias ou NULL para padrão global
    [Name] NVARCHAR(50) NOT NULL,
    [Type] TINYINT NOT NULL, -- 1: Receita, 2: Despesa
    [Icon] NVARCHAR(50) NULL, -- Referência ao ícone no front
    
    CONSTRAINT FK_Categories_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id])
);
GO

-- 3. Contas Bancárias / Carteiras
CREATE TABLE [Finance].[Accounts] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Type] TINYINT NOT NULL, -- 1: Corrente, 2: Dinheiro, 3: Investimento
    [InitialBalance] DECIMAL(19,4) NOT NULL DEFAULT 0,
    [IsActive] BIT DEFAULT 1,
    
    CONSTRAINT FK_Accounts_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id])
);
GO

-- 4. Cartões de Crédito
CREATE TABLE [Finance].[CreditCards] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [ClosingDay] INT NOT NULL CHECK (ClosingDay BETWEEN 1 AND 31),
    [DueDay] INT NOT NULL CHECK (DueDay BETWEEN 1 AND 31),
    [Limit] DECIMAL(19,4) NOT NULL,
    
    CONSTRAINT FK_CreditCards_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id])
);
GO

-- 5. Transações (O Coração do Sistema)
CREATE TABLE [Finance].[Transactions] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    
    -- Detalhes Básicos
    [Description] NVARCHAR(255) NOT NULL,
    [Amount] DECIMAL(19,4) NOT NULL CHECK ([Amount] > 0), -- Sempre positivo, o Type define o sinal
    [Type] TINYINT NOT NULL, -- 1: Receita, 2: Despesa, 3: Transferência
    
    -- Classificação
    [CategoryId] UNIQUEIDENTIFIER NOT NULL,
    
    -- Origem do Recurso (Pode ser Conta OU Cartão)
    [AccountId] UNIQUEIDENTIFIER NULL,
    [CreditCardId] UNIQUEIDENTIFIER NULL,
    
    -- Controle de Datas
    [DueDate] DATETIME2 NOT NULL,   -- Data de Vencimento/Competência
    [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
    
    -- Mapeamento do F# Discriminated Union: TransactionStatus
    -- 1: Pending, 2: Paid, 3: Cancelled
    [StatusId] TINYINT NOT NULL DEFAULT 1, 
    [PaymentDate] DATETIME2 NULL,
    [CancellationReason] NVARCHAR(255) NULL,
    
    -- Controle de Parcelamento (Opcional, mas útil)
    [RecurrenceId] UNIQUEIDENTIFIER NULL, -- Para agrupar parcelas da mesma compra
    [InstallmentNumber] INT DEFAULT 1,
    [TotalInstallments] INT DEFAULT 1,

    -- Chaves Estrangeiras
    CONSTRAINT FK_Transactions_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id]),
    CONSTRAINT FK_Transactions_Categories FOREIGN KEY ([CategoryId]) REFERENCES [Finance].[Categories]([Id]),
    CONSTRAINT FK_Transactions_Accounts FOREIGN KEY ([AccountId]) REFERENCES [Finance].[Accounts]([Id]),
    CONSTRAINT FK_Transactions_CreditCards FOREIGN KEY ([CreditCardId]) REFERENCES [Finance].[CreditCards]([Id]),
    
    -- CONSTRAINT DE NEGÓCIO (Complexa):
    -- Uma transação deve estar vinculada a uma Conta OU a um Cartão, mas não ambos (simplificação)
    CONSTRAINT CK_Transaction_Source CHECK (
        ([AccountId] IS NOT NULL AND [CreditCardId] IS NULL) OR 
        ([AccountId] IS NULL AND [CreditCardId] IS NOT NULL)
    ),

    -- CONSTRAINTS PARA STATUS (Mapeamento F#):
    -- Se Status = 2 (Paid), PaymentDate é obrigatório
    CONSTRAINT CK_Status_Paid CHECK (
        ([StatusId] = 2 AND [PaymentDate] IS NOT NULL) OR 
        ([StatusId] <> 2)
    ),
    -- Se Status = 3 (Cancelled), CancellationReason é obrigatório
    CONSTRAINT CK_Status_Cancelled CHECK (
        ([StatusId] = 3 AND [CancellationReason] IS NOT NULL) OR 
        ([StatusId] <> 3)
    )
);
GO

-- Índices para Performance (Baseados nas queries de Dashboard)
CREATE INDEX IX_Transactions_User_Date ON [Finance].[Transactions] ([UserId], [DueDate]) INCLUDE ([Amount], [Type], [StatusId]);
CREATE INDEX IX_Transactions_Account ON [Finance].[Transactions] ([AccountId]);
CREATE INDEX IX_Transactions_CreditCard ON [Finance].[Transactions] ([CreditCardId], [DueDate]);