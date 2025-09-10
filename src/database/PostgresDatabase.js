const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

class PostgresDatabase {
  constructor() {
    if (PostgresDatabase.instance) {
      return PostgresDatabase.instance;
    }

    this.pool = null;
    this.isConnected = false;
    PostgresDatabase.instance = this;
  }

  static getInstance() {
    if (!PostgresDatabase.instance) {
      PostgresDatabase.instance = new PostgresDatabase();
    }
    return PostgresDatabase.instance;
  }

  async connect() {
    if (this.isConnected) {
      return this.pool;
    }

    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dc_migration',
      user: process.env.DB_USER || 'dc_admin',
      password: process.env.DB_PASSWORD || 'development_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(poolConfig);

    // Test connection
    try {
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database');
      client.release();
      this.isConnected = true;
      return this.pool;
    } catch (error) {
      console.error('Error connecting to PostgreSQL:', error);
      throw error;
    }
  }

  async close() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.pool.end();
      console.log('PostgreSQL connection pool closed');
      this.isConnected = false;
    } catch (error) {
      console.error('Error closing PostgreSQL connection:', error);
      throw error;
    }
  }

  // Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
  convertQuery(query) {
    let index = 0;
    return query.replace(/\?/g, () => `$${++index}`);
  }

  // Query methods compatible with SQLite interface
  async all(query, params = []) {
    const pgQuery = this.convertQuery(query);
    const result = await this.pool.query(pgQuery, params);
    return result.rows;
  }

  async get(query, params = []) {
    const pgQuery = this.convertQuery(query);
    const result = await this.pool.query(pgQuery, params);
    return result.rows[0] || null;
  }

  async run(query, params = []) {
    const pgQuery = this.convertQuery(query);
    try {
      const result = await this.pool.query(pgQuery, params);
      // Check if this is an INSERT with RETURNING
      if (query.toLowerCase().includes('returning')) {
        return {
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount,
          rows: result.rows
        };
      }
      return {
        lastID: null,
        changes: result.rowCount
      };
    } catch (error) {
      console.error('PostgreSQL query error:', error.message);
      console.error('Query:', pgQuery);
      console.error('Params:', params);
      throw error;
    }
  }

  async exec(query) {
    const client = await this.pool.connect();
    
    try {
      // PostgreSQL can handle multiple statements in one query
      // Just ensure we don't have trailing semicolons that might cause issues
      const cleanQuery = query.trim();
      await client.query(cleanQuery);
    } catch (error) {
      console.error('PostgreSQL exec error:', error.message);
      console.error('Query:', query.substring(0, 500) + '...');
      throw error;
    } finally {
      client.release();
    }
  }

  // Transaction support
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    return {
      client,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      },
      query: (text, params) => client.query(text, params)
    };
  }

  // Migration Support
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.pool.query(sql);
  }

  async getMigrations() {
    await this.createMigrationsTable();
    const result = await this.pool.query('SELECT * FROM migrations ORDER BY executed_at');
    return result.rows;
  }

  async runMigration(name, sql) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // For PostgreSQL, we can execute the entire migration as one query
      // PostgreSQL handles multi-statement queries well, especially with functions
      await client.query(sql);
      
      // Record migration
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
      
      await client.query('COMMIT');
      console.log(`Migration ${name} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration ${name} failed:`, error.message);
      console.error('Error detail:', error.detail);
      throw error;
    } finally {
      client.release();
    }
  }

  // Table information
  async tableExists(tableName) {
    const result = await this.pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  }

  async getTableInfo(tableName) {
    const result = await this.pool.query(
      `SELECT 
        column_name as name,
        data_type as type,
        is_nullable as notnull,
        column_default as dflt_value,
        ordinal_position as cid
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position`,
      [tableName]
    );
    return result.rows;
  }

  async getSchema() {
    const result = await this.pool.query(
      `SELECT 
        'table' as type,
        tablename as name,
        tablename as tbl_name
      FROM pg_tables
      WHERE schemaname = 'public'
      UNION ALL
      SELECT 
        'index' as type,
        indexname as name,
        tablename as tbl_name
      FROM pg_indexes
      WHERE schemaname = 'public'`
    );
    return result.rows;
  }

  // Backup (using pg_dump would require external tools)
  async backup(backupPath = null) {
    // For PostgreSQL, we'd typically use pg_dump
    // This is a simplified version that exports data as SQL
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = backupPath || config.database.backupPath;
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    await fs.mkdir(backupDir, { recursive: true });

    // Get all tables
    const tables = await this.pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );

    let backupSql = '-- PostgreSQL Backup\n';
    backupSql += `-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of tables.rows) {
      const tableName = table.tablename;
      
      // Get table structure
      const createTable = await this.pool.query(
        `SELECT pg_get_ddl('CREATE TABLE', '${tableName}'::regclass) as ddl`
      );
      
      backupSql += `-- Table: ${tableName}\n`;
      backupSql += createTable.rows[0].ddl + ';\n\n';

      // Get table data
      const data = await this.pool.query(`SELECT * FROM ${tableName}`);
      
      if (data.rows.length > 0) {
        const columns = Object.keys(data.rows[0]);
        for (const row of data.rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            return val;
          });
          
          backupSql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        backupSql += '\n';
      }
    }

    await fs.writeFile(backupFile, backupSql);
    console.log(`Backup created: ${backupFile}`);
    return backupFile;
  }

  // Performance stats
  async getStats() {
    const stats = {
      tables: {},
      indexes: [],
      totalSize: 0
    };

    // Get table counts and sizes
    const tables = await this.pool.query(
      `SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_live_tup as count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'`
    );

    for (const table of tables.rows) {
      stats.tables[table.tablename] = {
        count: table.count,
        size: table.size
      };
    }

    // Get indexes
    const indexes = await this.pool.query(
      `SELECT 
        indexname,
        tablename,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'`
    );

    stats.indexes = indexes.rows;

    // Get total database size
    const dbSize = await this.pool.query(
      `SELECT pg_size_pretty(pg_database_size($1)) as size`,
      [process.env.DB_NAME || 'dc_migration']
    );
    
    stats.totalSize = dbSize.rows[0].size;

    return stats;
  }

  // Vacuum (maintenance)
  async vacuum() {
    await this.pool.query('VACUUM ANALYZE');
  }
}

module.exports = PostgresDatabase;