-- Add layout column to landing_page_templates if it doesn't exist
USE agency;

-- Check if column exists and add if not
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'agency' 
    AND TABLE_NAME = 'landing_page_templates' 
    AND COLUMN_NAME = 'layout'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE landing_page_templates ADD COLUMN layout JSON AFTER elements',
    'SELECT "Column layout already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
