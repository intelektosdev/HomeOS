-- Script de Atualização (Migration) para HomeOS
-- Garante que as novas tabelas e colunas existam

USE [HomeOS]; -- Ou o nome do seu banco
GO

-- 1. Criação das novas tabelas se não existirem

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[Categories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[Categories] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(50) NOT NULL,
        [Type] TINYINT NOT NULL, -- 1: Receita, 2: Despesa
        [Icon] NVARCHAR(50) NULL
    );
    PRINT 'Tabela Categories criada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[Accounts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[Accounts] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Type] TINYINT NOT NULL, -- 1: Corrente, 2: Dinheiro, 3: Investimento
        [InitialBalance] DECIMAL(19,4) NOT NULL DEFAULT 0,
        [IsActive] BIT DEFAULT 1
    );
    PRINT 'Tabela Accounts criada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[CreditCards]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[CreditCards] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [ClosingDay] INT NOT NULL,
        [DueDay] INT NOT NULL,
        [Limit] DECIMAL(19,4) NOT NULL
    );
    PRINT 'Tabela CreditCards criada.';
END
GO

-- 2. Alteração da Tabela Transactions (Adicionar colunas novas se não existirem)

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'CategoryId' AND Object_ID = OBJECT_ID(N'[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] ADD [CategoryId] UNIQUEIDENTIFIER NULL; -- NULL inicialmente para permitir migração de dados antigos
    PRINT 'Coluna CategoryId adicionada em Transactions.';
END
GO

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'AccountId' AND Object_ID = OBJECT_ID(N'[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] ADD [AccountId] UNIQUEIDENTIFIER NULL;
    PRINT 'Coluna AccountId adicionada em Transactions.';
END
GO

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'CreditCardId' AND Object_ID = OBJECT_ID(N'[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] ADD [CreditCardId] UNIQUEIDENTIFIER NULL;
    PRINT 'Coluna CreditCardId adicionada em Transactions.';
END
GO

-- 3. Criação de Constraints (Foreign Keys e Checks) de forma segura

-- FK Category
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[Finance].[FK_Transactions_Categories]') AND parent_object_id = OBJECT_ID(N'[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] WITH CHECK ADD CONSTRAINT [FK_Transactions_Categories] FOREIGN KEY([CategoryId])
    REFERENCES [Finance].[Categories] ([Id]);
    ALTER TABLE [Finance].[Transactions] CHECK CONSTRAINT [FK_Transactions_Categories];
    PRINT 'FK Transactions -> Categories criada.';
END
GO

-- FK Account
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[Finance].[FK_Transactions_Accounts]') AND parent_object_id = OBJECT_ID(N'[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] WITH CHECK ADD CONSTRAINT [FK_Transactions_Accounts] FOREIGN KEY([AccountId])
    REFERENCES [Finance].[Accounts] ([Id]);
    ALTER TABLE [Finance].[Transactions] CHECK CONSTRAINT [FK_Transactions_Accounts];
    PRINT 'FK Transactions -> Accounts criada.';
END
GO

-- FK CreditCard
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[Finance].[FK_Transactions_CreditCards]') AND parent_object_id = OBJECT_ID(N'[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] WITH CHECK ADD CONSTRAINT [FK_Transactions_CreditCards] FOREIGN KEY([CreditCardId])
    REFERENCES [Finance].[CreditCards] ([Id]);
    ALTER TABLE [Finance].[Transactions] CHECK CONSTRAINT [FK_Transactions_CreditCards];
    PRINT 'FK Transactions -> CreditCards criada.';
END
GO

-- Check Constraint: Ou Conta ou Cartão (XOR)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE object_id = OBJECT_ID(N'[Finance].[CK_Transaction_Source]'))
BEGIN
    ALTER TABLE [Finance].[Transactions]  WITH CHECK ADD  CONSTRAINT [CK_Transaction_Source] CHECK 
    (
        ([AccountId] IS NOT NULL AND [CreditCardId] IS NULL) OR 
        ([AccountId] IS NULL AND [CreditCardId] IS NOT NULL)
    );
    ALTER TABLE [Finance].[Transactions] CHECK CONSTRAINT [CK_Transaction_Source];
    PRINT 'Constraint CK_Transaction_Source (Source XOR) criada.';
END
GO

ALTER TABLE [Finance].[Users] ADD [PasswordHash] NVARCHAR(255) NULL
go
ALTER TABLE [Finance].[Users] ADD CONSTRAINT [UQ_Users_Email] UNIQUE ([Email])
go
PRINT 'Atualização de banco de dados concluída com sucesso!';
