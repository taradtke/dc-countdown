const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'migration.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create carrier_nnis table
  db.run(`
    CREATE TABLE IF NOT EXISTS carrier_nnis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carrier_name TEXT NOT NULL,
      circuit_id TEXT,
      interface_type TEXT,
      bandwidth TEXT,
      location TEXT,
      vlan_range TEXT,
      ip_block TEXT,
      current_device TEXT,
      current_interface TEXT,
      new_device TEXT,
      new_interface TEXT,
      migration_status TEXT DEFAULT 'pending',
      tested BOOLEAN DEFAULT 0,
      cutover_scheduled TEXT,
      cutover_completed BOOLEAN DEFAULT 0,
      engineer_assigned TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating carrier_nnis table:', err);
    } else {
      console.log('Successfully created carrier_nnis table');
    }
  });
});

db.close();