#!/usr/bin/env node

const bcrypt = require('bcrypt');
const DatabaseFactory = require('../src/database/DatabaseFactory');

async function resetAdminPassword() {
  try {
    // Connect to database
    const db = DatabaseFactory.getInstance();
    await db.connect();
    console.log('Connected to database');

    // Hash the new password
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the admin user - using direct query for PostgreSQL
    const query = `UPDATE users SET password = $1, email = $2 WHERE role = 'admin'`;
    
    const result = await db.pool.query(query, [hashedPassword, 'admin@tsr.com']);
    
    console.log('Admin user updated successfully');
    console.log('Email: admin@tsr.com');
    console.log('Password: Admin123!');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    process.exit(1);
  }
}

resetAdminPassword();