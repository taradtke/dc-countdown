-- Add missing fields to various tables to match frontend expectations

-- Servers table missing fields
ALTER TABLE servers ADD COLUMN IF NOT EXISTS customer_contacted BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS test_move_date DATE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS move_date DATE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS backups_verified_working_hycu BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS backups_setup_verified_working_veeam BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS firewall_network_cutover BOOLEAN DEFAULT FALSE;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS engineer_completed_work VARCHAR(255);

-- VLANs table missing field
ALTER TABLE vlans ADD COLUMN IF NOT EXISTS engineer_completed_work VARCHAR(255);

-- Carrier Circuits table missing/different fields
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS customer VARCHAR(255);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS service VARCHAR(255);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS backhaul_vendor VARCHAR(255);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS circuit_location VARCHAR(255);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS carrier_circuit_id VARCHAR(255);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS vlan VARCHAR(100);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS starmax_mgmt_ip VARCHAR(100);
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS migrated BOOLEAN DEFAULT FALSE;
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS tested BOOLEAN DEFAULT FALSE;
ALTER TABLE carrier_circuits ADD COLUMN IF NOT EXISTS engineer_completed_work VARCHAR(255);

-- Public Networks table missing/different fields
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS network VARCHAR(255);
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS customer VARCHAR(255);
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS vlan VARCHAR(100);
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS current_devices TEXT;
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS current_interfaces TEXT;
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS new_devices TEXT;
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS new_interfaces TEXT;
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS migrated BOOLEAN DEFAULT FALSE;
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS tested BOOLEAN DEFAULT FALSE;
ALTER TABLE public_networks ADD COLUMN IF NOT EXISTS engineer_completed_work VARCHAR(255);

-- Voice Systems table missing fields
ALTER TABLE voice_systems ADD COLUMN IF NOT EXISTS sip_provider VARCHAR(255);
ALTER TABLE voice_systems ADD COLUMN IF NOT EXISTS sip_delivery_method VARCHAR(255);
ALTER TABLE voice_systems ADD COLUMN IF NOT EXISTS migrated BOOLEAN DEFAULT FALSE;
ALTER TABLE voice_systems ADD COLUMN IF NOT EXISTS tested BOOLEAN DEFAULT FALSE;
ALTER TABLE voice_systems ADD COLUMN IF NOT EXISTS engineer_completed_work VARCHAR(255);

-- Colo Customers table missing fields
ALTER TABLE colo_customers ADD COLUMN IF NOT EXISTS contacted BOOLEAN DEFAULT FALSE;
ALTER TABLE colo_customers ADD COLUMN IF NOT EXISTS engineer_completed_work VARCHAR(255);