#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('./database');

class MigrationRunner {
    constructor() {
        this.db = new Database();
        this.migrationsDir = path.join(__dirname, 'migrations');
    }

    async createMigrationsTable() {
        return new Promise((resolve, reject) => {
            this.db.db.run(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    filename TEXT
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getAppliedMigrations() {
        return new Promise((resolve, reject) => {
            this.db.db.all("SELECT version FROM schema_migrations ORDER BY version", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.version));
            });
        });
    }

    async getMigrationFiles() {
        const files = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        return files.map(filename => {
            const version = parseInt(filename.split('_')[0]);
            return { version, filename, path: path.join(this.migrationsDir, filename) };
        });
    }

    async runMigration(migration) {
        const sql = fs.readFileSync(migration.path, 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim());

        console.log(`Running migration ${migration.version}: ${migration.filename}`);

        return new Promise((resolve, reject) => {
            this.db.db.serialize(() => {
                let completed = 0;
                const total = statements.length;

                statements.forEach((statement, index) => {
                    if (statement.trim()) {
                        this.db.db.run(statement.trim(), (err) => {
                            if (err) {
                                console.error(`Error in statement ${index + 1}:`, err);
                                return reject(err);
                            }
                            completed++;
                            if (completed === total) {
                                console.log(`✓ Migration ${migration.version} completed`);
                                resolve();
                            }
                        });
                    } else {
                        completed++;
                        if (completed === total) {
                            console.log(`✓ Migration ${migration.version} completed`);
                            resolve();
                        }
                    }
                });
            });
        });
    }

    async migrate() {
        try {
            console.log('Starting database migration...');
            
            // Create migrations table if it doesn't exist
            await this.createMigrationsTable();
            
            // Get applied migrations and available migration files
            const [appliedMigrations, migrationFiles] = await Promise.all([
                this.getAppliedMigrations(),
                this.getMigrationFiles()
            ]);

            console.log(`Applied migrations: ${appliedMigrations.join(', ') || 'none'}`);
            console.log(`Available migrations: ${migrationFiles.map(m => m.version).join(', ')}`);

            // Find pending migrations
            const pendingMigrations = migrationFiles.filter(
                migration => !appliedMigrations.includes(migration.version)
            );

            if (pendingMigrations.length === 0) {
                console.log('✓ Database is up to date - no pending migrations');
                return;
            }

            console.log(`Found ${pendingMigrations.length} pending migration(s)`);

            // Run pending migrations in order
            for (const migration of pendingMigrations) {
                await this.runMigration(migration);
            }

            console.log('✓ All migrations completed successfully');

        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    }

    async status() {
        try {
            await this.createMigrationsTable();
            
            const [appliedMigrations, migrationFiles] = await Promise.all([
                this.getAppliedMigrations(),
                this.getMigrationFiles()
            ]);

            console.log('\n=== Migration Status ===');
            console.log(`Applied: ${appliedMigrations.length} migration(s)`);
            console.log(`Available: ${migrationFiles.length} migration(s)`);
            
            const pendingMigrations = migrationFiles.filter(
                migration => !appliedMigrations.includes(migration.version)
            );
            
            if (pendingMigrations.length > 0) {
                console.log(`Pending: ${pendingMigrations.length} migration(s)`);
                pendingMigrations.forEach(m => {
                    console.log(`  - ${m.filename}`);
                });
            } else {
                console.log('✓ Database is up to date');
            }

            console.log('\nApplied migrations:');
            appliedMigrations.forEach(version => {
                const migration = migrationFiles.find(m => m.version === version);
                if (migration) {
                    console.log(`  ✓ ${migration.filename}`);
                } else {
                    console.log(`  ✓ Version ${version} (file not found)`);
                }
            });

        } catch (error) {
            console.error('Error checking migration status:', error);
            process.exit(1);
        }
    }

    async reset() {
        try {
            console.log('WARNING: This will delete all data and reset the database!');
            console.log('This operation cannot be undone.');
            
            // In a real CLI, we'd prompt for confirmation here
            // For now, we'll just proceed (this is a dev tool)
            
            console.log('Dropping all tables...');
            
            // Get all table names
            const tables = await new Promise((resolve, reject) => {
                this.db.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.name));
                });
            });

            // Drop all tables
            for (const table of tables) {
                await new Promise((resolve, reject) => {
                    this.db.db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log(`Dropped table: ${table}`);
            }

            console.log('Running all migrations from scratch...');
            await this.migrate();

        } catch (error) {
            console.error('Reset failed:', error);
            process.exit(1);
        }
    }
}

// CLI interface
const command = process.argv[2];
const runner = new MigrationRunner();

switch (command) {
    case 'migrate':
    case 'up':
        runner.migrate().then(() => process.exit(0));
        break;
    
    case 'status':
        runner.status().then(() => process.exit(0));
        break;
    
    case 'reset':
        runner.reset().then(() => process.exit(0));
        break;
    
    default:
        console.log('Usage: node migrate.js [command]');
        console.log('');
        console.log('Commands:');
        console.log('  migrate, up    Run pending migrations');
        console.log('  status         Show migration status');
        console.log('  reset          Drop all tables and re-run all migrations');
        process.exit(1);
}