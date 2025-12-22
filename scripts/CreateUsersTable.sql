-- Script to create Users table in Finance schema
-- Run this against your SQL Server database

USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- Create Users table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Finance].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Finance].[Users] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [Email] NVARCHAR(255) NOT NULL,
        [PasswordHash] NVARCHAR(255) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [UQ_Users_Email] UNIQUE ([Email])
    );

    CREATE NONCLUSTERED INDEX [IX_Users_Email] ON [Finance].[Users] ([Email]);
    
    PRINT 'Table [Finance].[Users] created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [Finance].[Users] already exists.';
END
GO
