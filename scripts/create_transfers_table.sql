-- =====================================================
-- Create Transfers Table
-- Date: 2026-01-13
-- Description: Creates table for account-to-account transfers
-- =====================================================

USE finance_dev;
GO

-- Criar tabela de Transferências
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Transfers' AND schema_id = SCHEMA_ID('Finance'))
BEGIN
    CREATE TABLE [Finance].[Transfers] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [FromAccountId] UNIQUEIDENTIFIER NOT NULL,
        [ToAccountId] UNIQUEIDENTIFIER NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Description] NVARCHAR(500) NOT NULL,
        [TransferDate] DATETIME2 NOT NULL,
        [StatusId] TINYINT NOT NULL, -- 1=Pending, 2=Completed, 3=Cancelled
        [CompletedAt] DATETIME2 NULL,
        [CancelReason] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Foreign Keys
        CONSTRAINT FK_Transfers_Users FOREIGN KEY ([UserId]) 
            REFERENCES [Finance].[Users]([Id]),
        CONSTRAINT FK_Transfers_FromAccount FOREIGN KEY ([FromAccountId]) 
            REFERENCES [Finance].[Accounts]([Id]),
        CONSTRAINT FK_Transfers_ToAccount FOREIGN KEY ([ToAccountId]) 
            REFERENCES [Finance].[Accounts]([Id]),
        
        -- Validações
        CONSTRAINT CHK_Transfers_Amount CHECK ([Amount] > 0),
        CONSTRAINT CHK_Transfers_DifferentAccounts CHECK ([FromAccountId] <> [ToAccountId]),
        CONSTRAINT CHK_Transfers_Status CHECK ([StatusId] IN (1, 2, 3))
    );

    PRINT 'Transfers table created successfully!';
END
ELSE
BEGIN
    PRINT 'Transfers table already exists.';
END
GO

-- Criar índices para performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transfers_UserId_TransferDate')
BEGIN
    CREATE INDEX IX_Transfers_UserId_TransferDate 
        ON [Finance].[Transfers]([UserId], [TransferDate] DESC);
    PRINT 'Index IX_Transfers_UserId_TransferDate created.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transfers_FromAccount')
BEGIN
    CREATE INDEX IX_Transfers_FromAccount 
        ON [Finance].[Transfers]([FromAccountId]);
    PRINT 'Index IX_Transfers_FromAccount created.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transfers_ToAccount')
BEGIN
    CREATE INDEX IX_Transfers_ToAccount 
        ON [Finance].[Transfers]([ToAccountId]);
    PRINT 'Index IX_Transfers_ToAccount created.';
END
GO

PRINT 'Transfers schema setup complete!';
GO
