-- Initial Schema Migration
-- Creates all tables for DC Migration System v2.0

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    is_engineer INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    vm_name TEXT,
    host TEXT,
    ip_addresses TEXT,
    cores INTEGER,
    memory_capacity TEXT,
    storage_used_gb REAL,
    storage_provisioned_gb REAL,
    migration_method TEXT,
    migration_date DATE,
    cutover_date DATE,
    testing_status TEXT,
    testing_details TEXT,
    migration_wave INTEGER DEFAULT 1,
    notes TEXT,
    assigned_engineer TEXT,
    migration_completed INTEGER DEFAULT 0,
    customer_notified INTEGER DEFAULT 0,
    customer_notified_successful_cutover INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VLANs table
CREATE TABLE IF NOT EXISTS vlans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vlan_id INTEGER,
    name TEXT,
    description TEXT,
    network TEXT,
    gateway TEXT,
    assigned_engineer TEXT,
    migrated INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    migration_date DATE,
    verification_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Networks table
CREATE TABLE IF NOT EXISTS networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_name TEXT,
    provider TEXT,
    circuit_id TEXT,
    bandwidth TEXT,
    location TEXT,
    assigned_engineer TEXT,
    cutover_scheduled INTEGER DEFAULT 0,
    cutover_date DATE,
    cutover_completed INTEGER DEFAULT 0,
    testing_status TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice Systems table
CREATE TABLE IF NOT EXISTS voice_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    vm_name TEXT,
    system_type TEXT,
    extension_count INTEGER,
    assigned_engineer TEXT,
    cutover_scheduled INTEGER DEFAULT 0,
    cutover_date DATE,
    cutover_completed INTEGER DEFAULT 0,
    testing_status TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colocation Customers table
CREATE TABLE IF NOT EXISTS colo_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    rack_location TEXT,
    new_cabinet_number TEXT,
    equipment_count INTEGER,
    power_usage REAL,
    assigned_engineer TEXT,
    migration_scheduled INTEGER DEFAULT 0,
    migration_date DATE,
    migration_completed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carrier Circuits table
CREATE TABLE IF NOT EXISTS carrier_circuits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circuit_id TEXT,
    provider TEXT,
    type TEXT,
    bandwidth TEXT,
    location_a TEXT,
    location_z TEXT,
    assigned_engineer TEXT,
    cutover_scheduled INTEGER DEFAULT 0,
    cutover_date DATE,
    cutover_completed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Public Networks table
CREATE TABLE IF NOT EXISTS public_networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_name TEXT,
    cidr TEXT,
    provider TEXT,
    gateway TEXT,
    assigned_engineer TEXT,
    cutover_scheduled INTEGER DEFAULT 0,
    cutover_date DATE,
    cutover_completed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carrier NNIs table
CREATE TABLE IF NOT EXISTS carrier_nnis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nni_id TEXT,
    provider TEXT,
    type TEXT,
    bandwidth TEXT,
    location TEXT,
    assigned_engineer TEXT,
    cutover_scheduled INTEGER DEFAULT 0,
    cutover_date DATE,
    cutover_completed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Critical Items table
CREATE TABLE IF NOT EXISTS critical_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    assigned_to TEXT,
    deadline DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers master table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    account_manager TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Assets junction table
CREATE TABLE IF NOT EXISTS customer_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    asset_type TEXT NOT NULL,
    asset_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Dependencies table
CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    dependency_type TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, target_type, target_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_servers_customer ON servers(customer);
CREATE INDEX IF NOT EXISTS idx_servers_engineer ON servers(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_servers_completion ON servers(customer_notified_successful_cutover);
CREATE INDEX IF NOT EXISTS idx_vlans_engineer ON vlans(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_vlans_completion ON vlans(migrated, verified);
CREATE INDEX IF NOT EXISTS idx_networks_engineer ON networks(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_networks_completion ON networks(cutover_completed);
CREATE INDEX IF NOT EXISTS idx_voice_systems_engineer ON voice_systems(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_voice_systems_completion ON voice_systems(cutover_completed);
CREATE INDEX IF NOT EXISTS idx_critical_items_status ON critical_items(status, priority);
CREATE INDEX IF NOT EXISTS idx_critical_items_assigned ON critical_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_assets_lookup ON customer_assets(customer_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_type, target_id);

-- Create triggers for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_servers_timestamp 
    AFTER UPDATE ON servers
    BEGIN
        UPDATE servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_vlans_timestamp 
    AFTER UPDATE ON vlans
    BEGIN
        UPDATE vlans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_networks_timestamp 
    AFTER UPDATE ON networks
    BEGIN
        UPDATE networks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_voice_systems_timestamp 
    AFTER UPDATE ON voice_systems
    BEGIN
        UPDATE voice_systems SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_colo_customers_timestamp 
    AFTER UPDATE ON colo_customers
    BEGIN
        UPDATE colo_customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_critical_items_timestamp 
    AFTER UPDATE ON critical_items
    BEGIN
        UPDATE critical_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;