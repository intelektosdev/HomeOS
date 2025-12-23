-- Script de Criação do Schema Inventory para HomeOS
-- Controle de Lista de Compras, Estoque, Grupos de Produtos e Fornecedores

USE [finance_dev];
GO

-- 1. Criação do Schema Inventory
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Inventory')
BEGIN
    EXEC('CREATE SCHEMA [Inventory]')
END
GO

-- 2. Tabela de Grupos de Produtos (ProductGroups)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Inventory].[ProductGroups]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Inventory].[ProductGroups] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_ProductGroups_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id])
    );
    PRINT 'Tabela Inventory.ProductGroups criada.';
END
GO

-- 3. Tabela de Fornecedores (Suppliers)
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

-- 4. Tabela de Produtos (Products)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Inventory].[Products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Inventory].[Products] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [Unit] NVARCHAR(20) NOT NULL,           -- 'un', 'kg', 'L', 'g', 'ml'
        [CategoryId] UNIQUEIDENTIFIER NULL,      -- Link opcional com Finance.Categories
        [ProductGroupId] UNIQUEIDENTIFIER NULL,  -- Novo: Grupo/Família do produto
        [Barcode] NVARCHAR(50) NULL,             -- Novo: Código de Barras (EAN)
        [LastPrice] DECIMAL(19,4) NULL,
        [StockQuantity] DECIMAL(10,3) NOT NULL DEFAULT 0,
        [MinStockAlert] DECIMAL(10,3) NULL,
        [IsActive] BIT DEFAULT 1,
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_Products_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id]),
        CONSTRAINT FK_Products_Categories FOREIGN KEY ([CategoryId]) REFERENCES [Finance].[Categories]([Id]),
        CONSTRAINT FK_Products_ProductGroups FOREIGN KEY ([ProductGroupId]) REFERENCES [Inventory].[ProductGroups]([Id])
    );
    PRINT 'Tabela Inventory.Products criada.';
END
ELSE
BEGIN
    -- Alterações para suportar novos campos em tabela existente
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Inventory].[Products]') AND name = 'ProductGroupId')
    BEGIN
        ALTER TABLE [Inventory].[Products] ADD [ProductGroupId] UNIQUEIDENTIFIER NULL;
        ALTER TABLE [Inventory].[Products] ADD CONSTRAINT FK_Products_ProductGroups FOREIGN KEY ([ProductGroupId]) REFERENCES [Inventory].[ProductGroups]([Id]);
        PRINT 'Coluna ProductGroupId adicionada em Inventory.Products.';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Inventory].[Products]') AND name = 'Barcode')
    BEGIN
        ALTER TABLE [Inventory].[Products] ADD [Barcode] NVARCHAR(50) NULL;
        PRINT 'Coluna Barcode adicionada em Inventory.Products.';
    END
END
GO

-- Índices para Products
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_UserId' AND object_id = OBJECT_ID('[Inventory].[Products]'))
BEGIN
    CREATE INDEX IX_Products_UserId ON [Inventory].[Products] ([UserId]) INCLUDE ([Name], [StockQuantity], [IsActive]);
END
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Barcode' AND object_id = OBJECT_ID('[Inventory].[Products]'))
BEGIN
    CREATE INDEX IX_Products_Barcode ON [Inventory].[Products] ([Barcode]) WHERE [Barcode] IS NOT NULL;
END
GO

-- 5. Tabela de Itens de Compra (PurchaseItems)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Inventory].[PurchaseItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Inventory].[PurchaseItems] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [ProductId] UNIQUEIDENTIFIER NOT NULL,
        [TransactionId] UNIQUEIDENTIFIER NOT NULL,
        [SupplierId] UNIQUEIDENTIFIER NULL,      -- Novo: Fornecedor da compra
        [Quantity] DECIMAL(10,3) NOT NULL,
        [UnitPrice] DECIMAL(19,4) NOT NULL,
        [TotalPrice] AS ([Quantity] * [UnitPrice]) PERSISTED,
        [PurchaseDate] DATETIME2 NOT NULL,
        
        CONSTRAINT FK_PurchaseItems_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id]),
        CONSTRAINT FK_PurchaseItems_Products FOREIGN KEY ([ProductId]) REFERENCES [Inventory].[Products]([Id]),
        CONSTRAINT FK_PurchaseItems_Transactions FOREIGN KEY ([TransactionId]) REFERENCES [Finance].[Transactions]([Id]),
        CONSTRAINT FK_PurchaseItems_Suppliers FOREIGN KEY ([SupplierId]) REFERENCES [Inventory].[Suppliers]([Id])
    );
    PRINT 'Tabela Inventory.PurchaseItems criada.';
END
ELSE
BEGIN
    -- Alterações para suportar novos campos em tabela existente
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Inventory].[PurchaseItems]') AND name = 'SupplierId')
    BEGIN
        ALTER TABLE [Inventory].[PurchaseItems] ADD [SupplierId] UNIQUEIDENTIFIER NULL;
        ALTER TABLE [Inventory].[PurchaseItems] ADD CONSTRAINT FK_PurchaseItems_Suppliers FOREIGN KEY ([SupplierId]) REFERENCES [Inventory].[Suppliers]([Id]);
        PRINT 'Coluna SupplierId adicionada em Inventory.PurchaseItems.';
    END
END
GO

-- Índices para PurchaseItems
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PurchaseItems_UserId_Date' AND object_id = OBJECT_ID('[Inventory].[PurchaseItems]'))
BEGIN
    CREATE INDEX IX_PurchaseItems_UserId_Date ON [Inventory].[PurchaseItems] ([UserId], [PurchaseDate]);
END
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PurchaseItems_TransactionId' AND object_id = OBJECT_ID('[Inventory].[PurchaseItems]'))
BEGIN
    CREATE INDEX IX_PurchaseItems_TransactionId ON [Inventory].[PurchaseItems] ([TransactionId]);
END
GO

-- 6. Tabela de Lista de Compras (ShoppingListItems)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[Inventory].[ShoppingListItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [Inventory].[ShoppingListItems] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [ProductId] UNIQUEIDENTIFIER NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [Quantity] DECIMAL(10,3) NOT NULL DEFAULT 1,
        [Unit] NVARCHAR(20) NULL,
        [EstimatedPrice] DECIMAL(19,4) NULL,
        [IsPurchased] BIT DEFAULT 0,
        [CreatedAt] DATETIME2 DEFAULT SYSUTCDATETIME(),
        [PurchasedAt] DATETIME2 NULL,
        
        CONSTRAINT FK_ShoppingListItems_Users FOREIGN KEY ([UserId]) REFERENCES [Finance].[Users]([Id]),
        CONSTRAINT FK_ShoppingListItems_Products FOREIGN KEY ([ProductId]) REFERENCES [Inventory].[Products]([Id])
    );
    PRINT 'Tabela Inventory.ShoppingListItems criada.';
END
GO

-- Índices para ShoppingListItems
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ShoppingListItems_UserId_Pending' AND object_id = OBJECT_ID('[Inventory].[ShoppingListItems]'))
BEGIN
    CREATE INDEX IX_ShoppingListItems_UserId_Pending ON [Inventory].[ShoppingListItems] ([UserId], [IsPurchased]) INCLUDE ([Name], [Quantity]);
END
GO

PRINT 'Schema Inventory (atualizado) verificado com sucesso!';
