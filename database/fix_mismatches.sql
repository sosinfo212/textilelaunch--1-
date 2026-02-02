-- Fix Database Mismatches
-- Aligns current database with database_dump.txt structure

USE agency;

-- Add missing password column to users table
-- Check if column exists first (MySQL 8.0+)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'agency' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'password'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN password VARCHAR(191) AFTER email;',
    'SELECT "Column password already exists" AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update admin user password if it's NULL
UPDATE users 
SET password = 'admin' 
WHERE id = 'usr_admin' AND (password IS NULL OR password = '');

-- Verify structure
SELECT 'Schema fixes completed!' AS status;
SELECT 'Users table columns:' AS info;
SHOW COLUMNS FROM users;
