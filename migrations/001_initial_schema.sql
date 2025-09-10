-- Initial schema for DC Migration Tracking System
-- Run date: 2025-01-01

-- Servers table for tracking VM migrations
CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    vm_name TEXT,
    host TEXT,
    ip_addresses TEXT,
    cores INTEGER,
    memory_capacity INTEGER,
    storage_used_gib REAL,
    storage_provisioned_gib REAL,
    customer_contacted BOOLEAN DEFAULT 0,
    test_move_date TEXT,
    production_move_date TEXT,
    customer_notified_successful_cutover BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VLANs table for network migration tracking
CREATE TABLE IF NOT EXISTS vlans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vlan_id INTEGER,
    name TEXT,
    description TEXT,
    network TEXT,
    gateway TEXT,
    migrated BOOLEAN DEFAULT 0,
    verified BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Networks table for ISP/carrier network tracking
CREATE TABLE IF NOT EXISTS networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_name TEXT,
    provider TEXT,
    circuit_id TEXT,
    bandwidth TEXT,
    cutover_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Voice systems table for PBX/phone system migrations
CREATE TABLE IF NOT EXISTS voice_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    vm_name TEXT,
    system_type TEXT,
    extension_count INTEGER,
    sip_provider TEXT,
    sip_delivery_method TEXT,
    migrated BOOLEAN DEFAULT 0,
    tested BOOLEAN DEFAULT 0,
    cutover_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Colo customers table for physical migration tracking
CREATE TABLE IF NOT EXISTS colo_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    rack_location TEXT,
    new_cabinet_number TEXT,
    equipment_count INTEGER,
    power_usage TEXT,
    contacted BOOLEAN DEFAULT 0,
    migration_scheduled BOOLEAN DEFAULT 0,
    migration_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Carrier circuits table for dedicated circuit migrations
CREATE TABLE IF NOT EXISTS carrier_circuits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circuit_id TEXT,
    provider TEXT,
    type TEXT,
    bandwidth TEXT,
    location_a TEXT,
    location_z TEXT,
    migrated BOOLEAN DEFAULT 0,
    cutover_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Public networks table for public IP ranges
CREATE TABLE IF NOT EXISTS public_networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_name TEXT,
    cidr TEXT,
    provider TEXT,
    gateway TEXT,
    migrated BOOLEAN DEFAULT 0,
    cutover_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Carrier NNIs table for network-to-network interconnects
CREATE TABLE IF NOT EXISTS carrier_nnis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nni_id TEXT,
    provider TEXT,
    type TEXT,
    bandwidth TEXT,
    location TEXT,
    migrated BOOLEAN DEFAULT 0,
    cutover_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Critical items table for high-priority tasks
CREATE TABLE IF NOT EXISTS critical_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    success_criteria TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    assigned_engineer TEXT,
    date_assigned DATETIME,
    completion_date DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers table for customer relationship management
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

-- Customer assets relationship table
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

-- Dependencies table for tracking asset relationships
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

-- Migration tracking metadata
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    filename TEXT
);

-- Insert initial migration record
INSERT OR IGNORE INTO schema_migrations (version, filename) VALUES (1, '001_initial_schema.sql');