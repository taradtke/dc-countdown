-- Customer matching improvements
-- This migration is idempotent and safe to run multiple times

-- Create the Unknown customer if it doesn't exist
INSERT OR IGNORE INTO customers (
    name, 
    notes, 
    created_at, 
    updated_at
) VALUES (
    'Unknown',
    'Default customer for unassigned items',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create indexes for better performance on customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON customers(LOWER(name));