-- =====================================================
-- Audit Logs Migration Script
-- Migrates user_id from String to Integer (Foreign Key)
-- =====================================================

USE dblens;

-- Step 1: Add new column for integer user_id
ALTER TABLE audit_logs 
ADD COLUMN user_id_new INTEGER NULL AFTER user_id,
ADD COLUMN performed_by VARCHAR(255) NULL AFTER user_id_new;

-- Step 2: Copy old string user_id to performed_by (legacy field)
UPDATE audit_logs 
SET performed_by = user_id;

-- Step 3: Try to convert user_id to integer if it matches existing users
-- First, let's see what data we have
SELECT DISTINCT user_id FROM audit_logs;

-- Step 4: For audit logs that have numeric user_ids matching real users, convert them
UPDATE audit_logs a
JOIN users u ON a.user_id = CAST(u.id AS CHAR)
SET a.user_id_new = u.id;

-- Step 5: Drop the old user_id column
ALTER TABLE audit_logs 
DROP COLUMN user_id;

-- Step 6: Rename user_id_new to user_id
ALTER TABLE audit_logs 
CHANGE COLUMN user_id_new user_id INTEGER NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE audit_logs
ADD CONSTRAINT fk_audit_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 8: Add index on user_id
ALTER TABLE audit_logs
ADD INDEX ix_audit_logs_user_id (user_id);

-- Verify the migration
SELECT 
    COUNT(*) as total_logs,
    COUNT(user_id) as logs_with_user_id,
    COUNT(performed_by) as logs_with_performed_by
FROM audit_logs;

-- Show sample of migrated data
SELECT id, user_id, performed_by, action_type, timestamp 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;
