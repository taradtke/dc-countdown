const fs = require('fs').promises;
const path = require('path');
const DatabaseFactory = require('./DatabaseFactory');
const config = require('../config');

class MigrationRunner {
  constructor() {
    this.db = DatabaseFactory.getInstance();
    this.dbType = config.database.type;
    // Use different migration paths for different database types
    const migrationSubdir = this.dbType === 'postgres' ? 'postgres' : 'sqlite';
    this.migrationsPath = path.join(__dirname, 'migrations', migrationSubdir);
  }

  async runAll() {
    await this.db.connect();
    await this.db.createMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = await this.getPendingMigrations(executedMigrations);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('All migrations completed successfully');
  }

  async getExecutedMigrations() {
    const migrations = await this.db.getMigrations();
    return new Set(migrations.map(m => m.name));
  }

  async getPendingMigrations(executedMigrations) {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
      
      return sqlFiles.filter(file => !executedMigrations.has(file));
    } catch (error) {
      // Migrations directory doesn't exist yet
      await fs.mkdir(this.migrationsPath, { recursive: true });
      return [];
    }
  }

  async runMigration(filename) {
    const filepath = path.join(this.migrationsPath, filename);
    const sql = await fs.readFile(filepath, 'utf8');
    
    console.log(`Running migration: ${filename}`);
    await this.db.runMigration(filename, sql);
  }

  async create(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${timestamp}-${name}.sql`;
    const filepath = path.join(this.migrationsPath, filename);

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL statements here
-- Example:
-- CREATE TABLE IF NOT EXISTS example (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   name TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;

    await fs.writeFile(filepath, template);
    console.log(`Created migration: ${filename}`);
    return filename;
  }

  async rollback(steps = 1) {
    const migrations = await this.db.getMigrations();
    const toRollback = migrations.slice(-steps);

    if (toRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    // Note: This is a simplified rollback. In production, you'd need
    // down migrations or a more sophisticated rollback mechanism
    console.log(`Rolling back ${toRollback.length} migrations`);
    
    for (const migration of toRollback.reverse()) {
      await this.db.run('DELETE FROM migrations WHERE id = ?', [migration.id]);
      console.log(`Rolled back: ${migration.name}`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const arg = process.argv[3];

  async function run() {
    try {
      switch (command) {
        case 'up':
        case 'migrate':
          await runner.runAll();
          break;
        
        case 'create':
          if (!arg) {
            console.error('Please provide a migration name');
            process.exit(1);
          }
          await runner.create(arg);
          break;
        
        case 'rollback':
          const steps = arg ? parseInt(arg) : 1;
          await runner.rollback(steps);
          break;
        
        default:
          console.log(`
Migration Tool

Usage:
  node migrate.js up              Run all pending migrations
  node migrate.js create <name>   Create a new migration file
  node migrate.js rollback [n]    Rollback n migrations (default: 1)
          `);
      }
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
  }

  run();
}

module.exports = new MigrationRunner();