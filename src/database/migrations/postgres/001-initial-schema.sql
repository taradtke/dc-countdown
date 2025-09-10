-- PostgreSQL Initial Schema Migration
-- DC Migration System v2.0

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_engineer BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers table  
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    customer VARCHAR(255),
    vm_name VARCHAR(255),
    host VARCHAR(255),
    ip_addresses TEXT,
    cores INTEGER,
    memory_capacity DECIMAL,
    storage_used_gib DECIMAL,
    storage_provisioned_gib DECIMAL,
    cutover_scheduled BOOLEAN DEFAULT FALSE,
    cutover_scheduled_date DATE,
    cutover_completed BOOLEAN DEFAULT FALSE,
    cutover_completed_date DATE,
    customer_notified_scheduled BOOLEAN DEFAULT FALSE,
    customer_notified_scheduled_date DATE,
    customer_notified_successful_cutover BOOLEAN DEFAULT FALSE,
    customer_notified_successful_cutover_date DATE,
    customer_signoff BOOLEAN DEFAULT FALSE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VLANs table
CREATE TABLE IF NOT EXISTS vlans (
    id SERIAL PRIMARY KEY,
    vlan_id VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    network VARCHAR(100),
    gateway VARCHAR(100),
    migrated BOOLEAN DEFAULT FALSE,
    migration_date DATE,
    verified BOOLEAN DEFAULT FALSE,
    verification_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Networks table
CREATE TABLE IF NOT EXISTS networks (
    id SERIAL PRIMARY KEY,
    network_name VARCHAR(255),
    provider VARCHAR(255),
    circuit_id VARCHAR(100),
    bandwidth VARCHAR(50),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    cutover_scheduled BOOLEAN DEFAULT FALSE,
    cutover_scheduled_date DATE,
    cutover_completed BOOLEAN DEFAULT FALSE,
    cutover_completed_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice Systems table
CREATE TABLE IF NOT EXISTS voice_systems (
    id SERIAL PRIMARY KEY,
    customer VARCHAR(255),
    vm_name VARCHAR(255),
    system_type VARCHAR(100),
    extension_count INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    cutover_scheduled BOOLEAN DEFAULT FALSE,
    cutover_scheduled_date DATE,
    cutover_completed BOOLEAN DEFAULT FALSE,
    cutover_completed_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carrier Circuits table
CREATE TABLE IF NOT EXISTS carrier_circuits (
    id SERIAL PRIMARY KEY,
    circuit_id VARCHAR(100) UNIQUE,
    provider VARCHAR(255),
    type VARCHAR(100),
    bandwidth VARCHAR(50),
    location_a VARCHAR(255),
    location_z VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    cutover_scheduled BOOLEAN DEFAULT FALSE,
    cutover_scheduled_date DATE,
    cutover_completed BOOLEAN DEFAULT FALSE,
    cutover_completed_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Public Networks table
CREATE TABLE IF NOT EXISTS public_networks (
    id SERIAL PRIMARY KEY,
    network_name VARCHAR(255),
    cidr VARCHAR(50),
    provider VARCHAR(255),
    gateway VARCHAR(100),
    dns_servers TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    cutover_scheduled BOOLEAN DEFAULT FALSE,
    cutover_scheduled_date DATE,
    cutover_completed BOOLEAN DEFAULT FALSE,
    cutover_completed_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carrier NNIs table
CREATE TABLE IF NOT EXISTS carrier_nnis (
    id SERIAL PRIMARY KEY,
    nni_id VARCHAR(100) UNIQUE,
    provider VARCHAR(255),
    type VARCHAR(100),
    bandwidth VARCHAR(50),
    location VARCHAR(255),
    peer_as INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    cutover_scheduled BOOLEAN DEFAULT FALSE,
    cutover_scheduled_date DATE,
    cutover_completed BOOLEAN DEFAULT FALSE,
    cutover_completed_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colo Customers table
CREATE TABLE IF NOT EXISTS colo_customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255),
    rack_location VARCHAR(100),
    new_cabinet_number VARCHAR(100),
    equipment_count INTEGER,
    power_usage DECIMAL,
    status VARCHAR(50) DEFAULT 'pending',
    migration_scheduled BOOLEAN DEFAULT FALSE,
    migration_scheduled_date DATE,
    migration_completed BOOLEAN DEFAULT FALSE,
    migration_completed_date DATE,
    assigned_engineer VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Critical Items table
CREATE TABLE IF NOT EXISTS critical_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    success_criteria TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    assigned_engineer VARCHAR(255),
    deadline DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers master table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_name VARCHAR(255),
    priority VARCHAR(50) DEFAULT 'normal',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Assets junction table
CREATE TABLE IF NOT EXISTS customer_assets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    asset_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE(customer_id, asset_type, asset_id)
);

-- Dependencies table
CREATE TABLE IF NOT EXISTS dependencies (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id INTEGER NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    dependency_type VARCHAR(100),
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
CREATE INDEX IF NOT EXISTS idx_critical_items_assigned ON critical_items(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_customer_assets_lookup ON customer_assets(customer_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_type, target_id);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_timestamp BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vlans_timestamp BEFORE UPDATE ON vlans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_networks_timestamp BEFORE UPDATE ON networks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_systems_timestamp BEFORE UPDATE ON voice_systems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrier_circuits_timestamp BEFORE UPDATE ON carrier_circuits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_networks_timestamp BEFORE UPDATE ON public_networks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrier_nnis_timestamp BEFORE UPDATE ON carrier_nnis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colo_customers_timestamp BEFORE UPDATE ON colo_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_critical_items_timestamp BEFORE UPDATE ON critical_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();