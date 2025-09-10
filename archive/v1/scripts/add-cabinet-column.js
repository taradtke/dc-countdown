const Database = require('./database');

const db = new Database();

// Add new_cabinet_number column to existing colo_customers table
const query = `
  ALTER TABLE colo_customers 
  ADD COLUMN new_cabinet_number TEXT
`;

db.db.run(query, function(err) {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column new_cabinet_number already exists');
    } else {
      console.error('Error adding column:', err);
      process.exit(1);
    }
  } else {
    console.log('Successfully added new_cabinet_number column to colo_customers table');
  }
  
  // Show table info
  db.db.all("PRAGMA table_info(colo_customers)", (err, rows) => {
    if (err) {
      console.error('Error getting table info:', err);
    } else {
      console.log('\nColo Customers table structure:');
      rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type}`);
      });
    }
    process.exit(0);
  });
});