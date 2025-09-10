const Database = require('./database');

const db = new Database();

// Delete servers with null or empty customer values
const query = `
  DELETE FROM servers 
  WHERE customer IS NULL 
  OR customer = ''
  OR vm_name IS NULL 
  OR vm_name = ''
`;

db.db.run(query, function(err) {
  if (err) {
    console.error('Error cleaning up blank servers:', err);
    process.exit(1);
  } else {
    console.log(`Successfully deleted ${this.changes} servers with blank customer/vm_name values`);
    
    // Show remaining servers count
    db.db.get("SELECT COUNT(*) as count FROM servers", (err, row) => {
      if (err) {
        console.error('Error counting servers:', err);
      } else {
        console.log(`Remaining servers: ${row.count}`);
      }
      process.exit(0);
    });
  }
});