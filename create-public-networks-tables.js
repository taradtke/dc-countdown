const Database = require('./database');

const db = new Database();

// Create public_networks table
const createPublicNetworks = `
  CREATE TABLE IF NOT EXISTS public_networks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network TEXT UNIQUE,
    customer TEXT,
    action TEXT,
    vlan TEXT,
    current_devices TEXT,
    current_interfaces TEXT,
    new_devices TEXT,
    new_interfaces TEXT,
    migrated BOOLEAN DEFAULT 0,
    tested BOOLEAN DEFAULT 0,
    cutover_completed BOOLEAN DEFAULT 0,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

// Create dependencies table for tracking relationships
const createDependencies = `
  CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    dependency_type TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, target_type, target_id)
  )
`;

db.db.serialize(() => {
  db.db.run(createPublicNetworks, function(err) {
    if (err) {
      console.error('Error creating public_networks table:', err);
    } else {
      console.log('Successfully created public_networks table');
    }
  });

  db.db.run(createDependencies, function(err) {
    if (err) {
      console.error('Error creating dependencies table:', err);
    } else {
      console.log('Successfully created dependencies table');
    }
  });

  // Show table info
  db.db.all("PRAGMA table_info(public_networks)", (err, rows) => {
    if (err) {
      console.error('Error getting public_networks table info:', err);
    } else {
      console.log('\nPublic Networks table structure:');
      rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type}`);
      });
    }
  });

  db.db.all("PRAGMA table_info(dependencies)", (err, rows) => {
    if (err) {
      console.error('Error getting dependencies table info:', err);
    } else {
      console.log('\nDependencies table structure:');
      rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type}`);
      });
    }
    process.exit(0);
  });
});