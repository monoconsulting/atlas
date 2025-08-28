-- Fix Logrefine Project Path Configuration
-- This SQL script updates the Logrefine project path from '/projects/fortigatelog' to '/workspace'

-- Show current Logrefine project configuration
SELECT 'BEFORE UPDATE:' as status, id, slug, name, path, active, updated_at 
FROM projects 
WHERE slug = 'logrefine';

-- Update the path for Logrefine project
UPDATE projects 
SET path = '/workspace', 
    updated_at = NOW()
WHERE slug = 'logrefine' 
  AND active = 1;

-- Show the result after update
SELECT 'AFTER UPDATE:' as status, id, slug, name, path, active, updated_at 
FROM projects 
WHERE slug = 'logrefine';

-- Show affected row count
SELECT ROW_COUNT() as rows_affected;