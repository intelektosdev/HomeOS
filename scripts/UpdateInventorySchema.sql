-- Script de Atualização do Schema Inventory para HomeOS (Evolução)

USE [finance_dev];
GO

-- 1. Tabela de Grupos de Produtos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Inventory].[ProductGroups]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Inventory].[ProductGroups] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(250) NULL,
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_ProductGroups_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id])
    );
    PRINT 'Tabela Inventory.ProductGroups criada.';
END
GO

-- 2. Tabela de Fornecedores
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Inventory].[Suppliers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Inventory].[Suppliers] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [Email] NVARCHAR(150) NULL,
        [Phone] NVARCHAR(20) NULL,
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_Suppliers_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id])
    );
    PRINT 'Tabela Inventory.Suppliers criada.';
END
GO

-- 3. Atualizar Tabela Products (Barcode, ProductGroupId)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Inventory].[Products]') AND name = 'ProductGroupId')
BEGIN
    ALTER TABLE [Inventory].[Products] ADD [ProductGroupId] UNIQUEIDENTIFIER NULL;
    ALTER TABLE [Inventory].[Products] ADD CONSTRAINT FK_Products_ProductGroups FOREIGN KEY ([ProductGroupId]) REFERENCES [Inventory].[ProductGroups]([Id]);
    PRINT 'Coluna ProductGroupId adicionada em Inventory.Products.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Inventory].[Products]') AND name = 'Barcode')
BEGIN
    ALTER TABLE [Inventory].[Products] ADD [Barcode] NVARCHAR(100) NULL;
    CREATE INDEX IX_Products_Barcode ON [Inventory].[Products] ([Barcode]) WHERE [Barcode] IS NOT NULL;
    PRINT 'Coluna Barcode adicionada em Inventory.Products.';
END
GO

-- 4. Atualizar Tabela PurchaseItems (SupplierId)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Inventory].[PurchaseItems]') AND name = 'SupplierId')
BEGIN
    ALTER TABLE [Inventory].[PurchaseItems] ADD [SupplierId] UNIQUEIDENTIFIER NULL;
    ALTER TABLE [Inventory].[PurchaseItems] ADD CONSTRAINT FK_PurchaseItems_Suppliers FOREIGN KEY ([SupplierId]) REFERENCES [Inventory].[Suppliers]([Id]);
    PRINT 'Coluna SupplierId adicionada em Inventory.PurchaseItems.';
END
GO
