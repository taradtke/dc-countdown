const Database = require('./database');

const db = new Database();

// Create carrier_circuits table
const query = `
  CREATE TABLE IF NOT EXISTS carrier_circuits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT,
    service TEXT,
    backhaul_vendor TEXT,
    circuit_location TEXT,
    carrier_circuit_id TEXT,
    vlan TEXT,
    starmax_mgmt_ip TEXT,
    router_public_network TEXT,
    tsr_router_ip TEXT,
    customer_router_ip TEXT,
    customer_public_network TEXT,
    cpe_ip TEXT,
    migrated BOOLEAN DEFAULT 0,
    tested BOOLEAN DEFAULT 0,
    cutover_completed BOOLEAN DEFAULT 0,
    engineer_completed_work TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.db.run(query, function(err) {
  if (err) {
    console.error('Error creating carrier_circuits table:', err);
    process.exit(1);
  } else {
    console.log('Successfully created carrier_circuits table');
    
    // Show table info
    db.db.all("PRAGMA table_info(carrier_circuits)", (err, rows) => {
      if (err) {
        console.error('Error getting table info:', err);
      } else {
        console.log('\nCarrier Circuits table structure:');
        rows.forEach(row => {
          console.log(`  ${row.name}: ${row.type}`);
        });
      }
      process.exit(0);
    });
  }
});