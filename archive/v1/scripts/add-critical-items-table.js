const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'migration.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create critical_items table
  db.run(`
    CREATE TABLE IF NOT EXISTS critical_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      success_criteria TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      assigned_engineer TEXT,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_assigned TEXT,
      date_completed TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating critical_items table:', err);
    } else {
      console.log('Successfully created critical_items table');
    }
  });
});

db.close();