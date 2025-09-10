const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.db = null;
    this.isConnected = false;
    Database.instance = this;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect() {
    if (this.isConnected) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const dbPath = path.resolve(config.database.path);
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.isConnected = true;
          
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          
          // Promisify database methods
          this.all = promisify(this.db.all.bind(this.db));
          this.get = promisify(this.db.get.bind(this.db));
          this.run = promisify(this.db.run.bind(this.db));
          this.exec = promisify(this.db.exec.bind(this.db));
          
          resolve(this.db);
        }
      });
    });
  }

  async close() {
    if (!this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          this.isConnected = false;
          resolve();
        }
      });
    });
  }

  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
    return {
      commit: () => this.run('COMMIT'),
      rollback: () => this.run('ROLLBACK')
    };
  }

  async backup(backupPath = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = backupPath || config.database.backupPath;
    const backupFile = path.join(backupDir, `backup-${timestamp}.db`);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const backup = new sqlite3.Database(backupFile);
      const source = this.db;

      source.backup(backup, (err) => {
        if (err) {
          reject(err);
        } else {
          backup.close();
          resolve(backupFile);
        }
      });
    });
  }

  async restore(backupFile) {
    if (!await fs.access(backupFile).then(() => true).catch(() => false)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    return new Promise((resolve, reject) => {
      const backup = new sqlite3.Database(backupFile);
      const target = this.db;

      backup.backup(target, (err) => {
        if (err) {
          reject(err);
        } else {
          backup.close();
          resolve();
        }
      });
    });
  }

  async vacuum() {
    return this.run('VACUUM');
  }

  async getTableInfo(tableName) {
    return this.all(`PRAGMA table_info(${tableName})`);
  }

  async tableExists(tableName) {
    const result = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return !!result;
  }

  async getSchema() {
    return this.all(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type IN ('table', 'index')"
    );
  }

  // Migration Support
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    return this.run(sql);
  }

  async getMigrations() {
    await this.createMigrationsTable();
    return this.all('SELECT * FROM migrations ORDER BY executed_at');
  }

  async runMigration(name, sql) {
    const transaction = await this.beginTransaction();
    try {
      await this.exec(sql);
      await this.run('INSERT INTO migrations (name) VALUES (?)', [name]);
      await transaction.commit();
      console.log(`Migration ${name} executed successfully`);
    } catch (error) {
      await transaction.rollback();
      console.error(`Migration ${name} failed:`, error);
      throw error;
    }
  }

  // Performance Monitoring
  async getStats() {
    const stats = {
      tables: {},
      indexes: [],
      totalSize: 0
    };

    // Get table counts
    const tables = await this.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    for (const table of tables) {
      const countResult = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`);
      stats.tables[table.name] = countResult.count;
    }

    // Get indexes
    stats.indexes = await this.all(
      "SELECT name, tbl_name FROM sqlite_master WHERE type='index'"
    );

    // Get database size
    const dbStats = await this.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
    stats.totalSize = dbStats.size;

    return stats;
  }

  // Utility Methods
  async truncateTable(tableName) {
    return this.run(`DELETE FROM ${tableName}`);
  }

  async dropTable(tableName) {
    return this.run(`DROP TABLE IF EXISTS ${tableName}`);
  }

  escape(value) {
    if (typeof value === 'string') {
      return value.replace(/'/g, "''");
    }
    return value;
  }

  // Batch Insert with Performance Optimization
  async batchInsert(tableName, records, chunkSize = 500) {
    if (!records || records.length === 0) {
      return;
    }

    const chunks = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      chunks.push(records.slice(i, i + chunkSize));
    }

    const transaction = await this.beginTransaction();
    try {
      for (const chunk of chunks) {
        const fields = Object.keys(chunk[0]);
        const placeholders = chunk.map(() => 
          `(${fields.map(() => '?').join(',')})`
        ).join(',');

        const sql = `INSERT INTO ${tableName} (${fields.join(',')}) VALUES ${placeholders}`;
        const values = chunk.flatMap(record => fields.map(field => record[field]));
        
        await this.run(sql, values);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = Database;