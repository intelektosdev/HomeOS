-- ========================================
-- RECURRING TRANSACTIONS SCHEMA
-- ========================================

-- Create RecurringTransactions table
CREATE TABLE [Finance].[RecurringTransactions] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Description] NVARCHAR(500) NOT NULL,
    [Type] TINYINT NOT NULL, -- 1=Income, 2=Expense
    [CategoryId] UNIQUEIDENTIFIER NOT NULL,
    [AccountId] UNIQUEIDENTIFIER NULL,
    [CreditCardId] UNIQUEIDENTIFIER NULL,
    
    -- Amount Type: 1=Fixed, 2=Variable
    [AmountTypeId] TINYINT NOT NULL,
    [FixedAmount] DECIMAL(18,2) NULL,
    [AverageAmount] DECIMAL(18,2) NULL,
    
    -- Frequency: 1=Daily, 2=Weekly, 3=Biweekly, 4=Monthly, 5=Bimonthly, 6=Quarterly, 7=Semiannual, 8=Annual
    [FrequencyId] TINYINT NOT NULL,
    [DayOfMonth] INT NULL, -- For monthly recurrences: 1-31, NULL means last day
    
    [StartDate] DATE NOT NULL,
    [EndDate] DATE NULL, -- NULL means indefinite
    [NextOccurrence] DATE NOT NULL,
    
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [LastGeneratedAt] DATETIME2 NULL,
    
    -- Foreign Keys
    CONSTRAINT [FK_RecurringTransactions_Users] FOREIGN KEY ([UserId]) 
        REFERENCES [Finance].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RecurringTransactions_Categories] FOREIGN KEY ([CategoryId]) 
        REFERENCES [Finance].[Categories]([Id]),
    CONSTRAINT [FK_RecurringTransactions_Accounts] FOREIGN KEY ([AccountId]) 
        REFERENCES [Finance].[Accounts]([Id]),
    CONSTRAINT [FK_RecurringTransactions_CreditCards] FOREIGN KEY ([CreditCardId]) 
        REFERENCES [Finance].[CreditCards]([Id]),
    
    -- Constraints
    CONSTRAINT [CK_RecurringTransactions_Type] CHECK ([Type] IN (1, 2)),
    CONSTRAINT [CK_RecurringTransactions_AmountType] CHECK ([AmountTypeId] IN (1, 2)),
    CONSTRAINT [CK_RecurringTransactions_Frequency] CHECK ([FrequencyId] BETWEEN 1 AND 8),
    CONSTRAINT [CK_RecurringTransactions_DayOfMonth] CHECK ([DayOfMonth] IS NULL OR ([DayOfMonth] BETWEEN 1 AND 31)),
    CONSTRAINT [CK_RecurringTransactions_Source] CHECK (
        ([AccountId] IS NOT NULL AND [CreditCardId] IS NULL) 
        OR ([AccountId] IS NULL AND [CreditCardId] IS NOT NULL)
    ),
    CONSTRAINT [CK_RecurringTransactions_FixedAmount] CHECK (
        ([AmountTypeId] = 1 AND [FixedAmount] IS NOT NULL AND [AverageAmount] IS NULL)
        OR ([AmountTypeId] = 2 AND [FixedAmount] IS NULL AND [AverageAmount] IS NOT NULL)
    )
);

-- Create GeneratedTransactions table for traceability
CREATE TABLE [Finance].[GeneratedTransactions] (
    [TransactionId] UNIQUEIDENTIFIER NOT NULL,
    [RecurringTransactionId] UNIQUEIDENTIFIER NOT NULL,
    [GeneratedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [WasModified] BIT NOT NULL DEFAULT 0,
    
    PRIMARY KEY ([TransactionId]),
    
    CONSTRAINT [FK_GeneratedTransactions_Transactions] FOREIGN KEY ([TransactionId]) 
        REFERENCES [Finance].[Transactions]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_GeneratedTransactions_RecurringTransactions] FOREIGN KEY ([RecurringTransactionId]) 
        REFERENCES [Finance].[RecurringTransactions]([Id])
);

-- Create indexes for performance
CREATE INDEX [IX_RecurringTransactions_UserId_IsActive] 
    ON [Finance].[RecurringTransactions]([UserId], [IsActive]);

CREATE INDEX [IX_RecurringTransactions_NextOccurrence] 
    ON [Finance].[RecurringTransactions]([NextOccurrence]) 
    WHERE [IsActive] = 1;

CREATE INDEX [IX_GeneratedTransactions_RecurringTransactionId] 
    ON [Finance].[GeneratedTransactions]([RecurringTransactionId]);

GO
