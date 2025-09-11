-- Add missing fields to carrier_nnis table
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(255);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS circuit_id VARCHAR(255);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS interface_type VARCHAR(100);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS vlan_range VARCHAR(100);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS ip_block VARCHAR(100);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS current_device VARCHAR(255);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS new_device VARCHAR(255);
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS migration_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS tested BOOLEAN DEFAULT FALSE;
ALTER TABLE carrier_nnis ADD COLUMN IF NOT EXISTS engineer_assigned VARCHAR(255);

-- Drop the old assigned_engineer column if we're using engineer_assigned
ALTER TABLE carrier_nnis DROP COLUMN IF EXISTS assigned_engineer;