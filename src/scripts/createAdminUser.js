const bcrypt = require('bcrypt');
const Database = require('../database/Database');
const config = require('../config');

async function createAdminUser() {
  const db = Database.getInstance();
  await db.connect();

  try {
    // Check if admin user already exists
    const existingAdmin = await db.get(
      'SELECT id FROM users WHERE email = ?',
      ['admin@tsr.com']
    );

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash the default password
    const defaultPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, config.auth.bcryptRounds);

    // Create admin user
    await db.run(
      `INSERT INTO users (
        email, password, first_name, last_name, 
        role, is_active, is_engineer, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        'admin@tsr.com',
        hashedPassword,
        'System',
        'Administrator',
        'admin',
        1,
        1
      ]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@tsr.com');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  Please change this password after first login!');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;