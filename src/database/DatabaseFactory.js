const config = require('../config');
const SqliteDatabase = require('./Database');
const PostgresDatabase = require('./PostgresDatabase');

class DatabaseFactory {
  static getInstance() {
    const dbType = config.database.type;
    
    console.log(`Initializing ${dbType} database...`);
    
    switch (dbType) {
      case 'sqlite':
        return SqliteDatabase.getInstance();
      case 'postgres':
      case 'postgresql':
        return PostgresDatabase.getInstance();
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}

module.exports = DatabaseFactory;