-- Add customer table and update schema to use foreign key relationships
-- Run date: 2025-01-01

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL UNIQUE,
    primary_contact TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    account_number TEXT,
    contract_type TEXT,
    priority_level TEXT DEFAULT 'Medium',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default "Unknown" customer for unmapped assets
INSERT OR IGNORE INTO customers (id, customer_name, priority_level, notes) 
VALUES (1, 'Unknown/Unmapped', 'Low', 'Default customer for assets without mapped customer relationships');

-- Add customer_id columns to asset tables
ALTER TABLE servers ADD COLUMN customer_id INTEGER DEFAULT 1 REFERENCES customers(id);
ALTER TABLE voice_systems ADD COLUMN customer_id INTEGER DEFAULT 1 REFERENCES customers(id);
ALTER TABLE colo_customers ADD COLUMN customer_id INTEGER DEFAULT 1 REFERENCES customers(id);

-- Create customer_assets relationship table for many-to-many relationships
CREATE TABLE IF NOT EXISTS customer_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    asset_type TEXT,
    asset_id INTEGER,
    confidence_score REAL DEFAULT 0.0,
    manually_verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE(customer_id, asset_type, asset_id)
);

-- Create dependencies table for tracking asset relationships
CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_type TEXT NOT NULL,
    from_id INTEGER NOT NULL,
    to_type TEXT NOT NULL,
    to_id INTEGER NOT NULL,
    dependency_type TEXT DEFAULT 'blocks',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_type, from_id, to_type, to_id)
);

-- Update existing customer data by matching customer names
UPDATE servers SET customer_id = (
    SELECT id FROM customers WHERE customers.customer_name = servers.customer
) WHERE customer IS NOT NULL AND EXISTS (
    SELECT 1 FROM customers WHERE customers.customer_name = servers.customer
);

UPDATE voice_systems SET customer_id = (
    SELECT id FROM customers WHERE customers.customer_name = voice_systems.customer
) WHERE customer IS NOT NULL AND EXISTS (
    SELECT 1 FROM customers WHERE customers.customer_name = voice_systems.customer
);

-- For colo_customers, we'll keep the customer_name field as well since it's the primary field
UPDATE colo_customers SET customer_id = (
    SELECT id FROM customers WHERE customers.customer_name = colo_customers.customer_name
) WHERE customer_name IS NOT NULL AND EXISTS (
    SELECT 1 FROM customers WHERE customers.customer_name = colo_customers.customer_name
);

-- Insert migration record
INSERT OR IGNORE INTO schema_migrations (version, filename) VALUES (3, '003_customer_relationships.sql');