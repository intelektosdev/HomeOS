-- =====================================================
-- HomeOS Database Initialization Script
-- Run this script to create a default user for testing
-- =====================================================

USE finance_dev;
GO

-- Create Schema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Finance')
BEGIN
    EXEC('CREATE SCHEMA [Finance]')
END
GO

-- Insert default user (same ID used in local dev mode)
IF NOT EXISTS (SELECT * FROM [Finance].[Users] WHERE Id = '22f4bd46-313d-424a-83b9-0c367ad46c3b')
BEGIN
    INSERT INTO [Finance].[Users] (Id, Email, PasswordHash, Name, CreatedAt)
    VALUES (
        '22f4bd46-313d-424a-83b9-0c367ad46c3b',
        'local@homeos.dev',
        'not-used-in-dev-mode',
        'Local User',
        GETDATE()
    );
    PRINT 'Default user created.';
END
GO

-- Insert default categories
IF NOT EXISTS (SELECT * FROM [Finance].[Categories] WHERE UserId = '22f4bd46-313d-424a-83b9-0c367ad46c3b')
BEGIN
    INSERT INTO [Finance].[Categories] (UserId, Name, Type, Icon) VALUES
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Salário', 1, '💰'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Freelance', 1, '💻'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Investimentos', 1, '📈'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Alimentação', 2, '🍔'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Transporte', 2, '🚗'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Moradia', 2, '🏠'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Lazer', 2, '🎮'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Saúde', 2, '🏥'),
    ('22f4bd46-313d-424a-83b9-0c367ad46c3b', 'Educação', 2, '📚');
    PRINT 'Default categories created.';
END
GO

PRINT 'Database initialization complete!';
GO
