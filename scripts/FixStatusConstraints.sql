-- ============================================
-- FIX: Drop Conflicting Status Constraints
-- Run this script to fix the CHECK constraint violation "CK_Status_Conciliated"
-- ============================================

USE finance_dev;
GO

-- 1. Drop the constraint causing the error
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Status_Conciliated' AND parent_object_id = OBJECT_ID('[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] DROP CONSTRAINT [CK_Status_Conciliated];
    PRINT 'Dropped constraint CK_Status_Conciliated';
END

-- 2. Drop legacy CK_Status_Cancelled if it exists (it might warn on StatusId=3 which is now Conciliated)
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Status_Cancelled' AND parent_object_id = OBJECT_ID('[Finance].[Transactions]'))
BEGIN
    ALTER TABLE [Finance].[Transactions] DROP CONSTRAINT [CK_Status_Cancelled];
    PRINT 'Dropped constraint CK_Status_Cancelled';
END

-- 3. Verify Constraints
SELECT name, definition 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('[Finance].[Transactions]');

PRINT 'Status constraints cleanup completed.';
GO
