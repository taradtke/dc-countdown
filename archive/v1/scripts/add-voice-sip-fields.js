// Migration script to add SIP provider and delivery method to voice_systems
const Database = require('./database');

const db = new Database();

// Add new columns to voice_systems table
db.db.serialize(() => {
  console.log('Adding SIP provider and delivery method columns to voice_systems table...');
  
  db.db.run(`ALTER TABLE voice_systems ADD COLUMN sip_provider TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding sip_provider column:', err);
    } else {
      console.log('✓ Added sip_provider column');
    }
  });
  
  db.db.run(`ALTER TABLE voice_systems ADD COLUMN sip_delivery_method TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding sip_delivery_method column:', err);
    } else {
      console.log('✓ Added sip_delivery_method column');
    }
  });
  
  setTimeout(() => {
    console.log('Migration complete!');
    process.exit(0);
  }, 1000);
});