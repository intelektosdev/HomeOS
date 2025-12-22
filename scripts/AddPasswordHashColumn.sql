-- Script para adicionar coluna PasswordHash à tabela Users existente
-- Execute este script no seu banco de dados

USE [YourDatabaseName]; -- Substitua pelo nome do seu banco
GO

-- Adicionar coluna PasswordHash se não existir
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[Finance].[Users]') 
    AND name = 'PasswordHash'
)
BEGIN
    ALTER TABLE [Finance].[Users]
    ADD [PasswordHash] NVARCHAR(255) NULL;
    
    PRINT 'Coluna PasswordHash adicionada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Coluna PasswordHash já existe.';
END
GO

-- Criar índice único no Email se não existir (importante para performance e integridade)
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE object_id = OBJECT_ID(N'[Finance].[Users]') 
    AND name = 'UQ_Users_Email'
)
BEGIN
    ALTER TABLE [Finance].[Users]
    ADD CONSTRAINT [UQ_Users_Email] UNIQUE ([Email]);
    
    PRINT 'Constraint única no Email criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Constraint única no Email já existe.';
END
GO

-- IMPORTANTE: Após adicionar a coluna, você pode precisar torná-la NOT NULL
-- Só faça isso DEPOIS de migrar/popular os dados existentes com hashes
-- Descomente as linhas abaixo quando todos os usuários tiverem PasswordHash definido:

-- ALTER TABLE [Finance].[Users]
-- ALTER COLUMN [PasswordHash] NVARCHAR(255) NOT NULL;
-- PRINT 'Coluna PasswordHash alterada para NOT NULL.';
