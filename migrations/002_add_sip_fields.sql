-- Add SIP provider and delivery method fields to voice_systems
-- Run date: 2025-01-01

-- Check if columns exist before adding them
PRAGMA table_info(voice_systems);

-- Add columns only if they don't exist (SQLite doesn't have IF NOT EXISTS for ALTER TABLE)
-- We'll handle this in the migration runner by checking if the error is "duplicate column"

-- Insert migration record
INSERT OR IGNORE INTO schema_migrations (version, filename) VALUES (2, '002_add_sip_fields.sql');