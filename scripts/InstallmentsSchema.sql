IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Finance].[Transactions]') AND name = 'InstallmentId')
BEGIN
    ALTER TABLE [Finance].[Transactions]
    ADD [InstallmentId] UNIQUEIDENTIFIER NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Finance].[Transactions]') AND name = 'InstallmentNumber')
BEGIN
    ALTER TABLE [Finance].[Transactions]
    ADD [InstallmentNumber] INT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Finance].[Transactions]') AND name = 'TotalInstallments')
BEGIN
    ALTER TABLE [Finance].[Transactions]
    ADD [TotalInstallments] INT NULL;
END
GO
