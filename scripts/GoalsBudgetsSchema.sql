IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Budgets' AND schema_id = SCHEMA_ID('Finance'))
BEGIN
    CREATE TABLE Finance.Budgets (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        AmountLimit DECIMAL(18, 2) NOT NULL,
        PeriodType INT NOT NULL, -- 0: Monthly, 1: Yearly
        CategoryId UNIQUEIDENTIFIER NULL, -- Se NULL e Scope=Global, aplica a tudo
        AlertThreshold DECIMAL(5, 2) DEFAULT 0.8,
        CreatedAt DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_Budgets_Users FOREIGN KEY (UserId) REFERENCES Finance.Users(Id),
        CONSTRAINT FK_Budgets_Categories FOREIGN KEY (CategoryId) REFERENCES Finance.Categories(Id)
    );
    
    CREATE INDEX IX_Budgets_UserId ON Finance.Budgets(UserId);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Goals' AND schema_id = SCHEMA_ID('Finance'))
BEGIN
    CREATE TABLE Finance.Goals (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        TargetAmount DECIMAL(18, 2) NOT NULL,
        CurrentAmount DECIMAL(18, 2) DEFAULT 0,
        Deadline DATETIME NULL,
        LinkedInvestmentId UNIQUEIDENTIFIER NULL,
        Status INT NOT NULL, -- 0: InProgress, 1: Achieved, 2: Paused, 3: Cancelled
        CreatedAt DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_Goals_Users FOREIGN KEY (UserId) REFERENCES Finance.Users(Id),
        CONSTRAINT FK_Goals_Investments FOREIGN KEY (LinkedInvestmentId) REFERENCES Finance.Investments(Id)
    );

    CREATE INDEX IX_Goals_UserId ON Finance.Goals(UserId);
END
