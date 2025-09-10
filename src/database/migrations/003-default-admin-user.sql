-- Create default admin user for initial system access
-- Password: Admin123! (will be hashed by the application)

-- Note: This creates a placeholder that needs to be updated via the application
-- The password will need to be set using the User model's password hashing

INSERT OR IGNORE INTO users (
    email,
    password,
    first_name,
    last_name,
    role,
    is_active,
    is_engineer,
    created_at,
    updated_at
) VALUES (
    'admin@tsr.com',
    '$2b$10$placeholder', -- This will be replaced with proper hash
    'System',
    'Administrator',
    'admin',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);