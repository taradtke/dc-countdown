const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  database: {
    type: process.env.DB_TYPE || 'postgres',
    // SQLite config (legacy)
    path: process.env.DB_PATH || './migration.db',
    // PostgreSQL config
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'dc_migration',
    user: process.env.DB_USER || 'dc_admin',
    password: process.env.DB_PASSWORD || 'development_password',
    // Common config
    backupPath: process.env.DB_BACKUP_PATH || './backups',
    backupRetention: parseInt(process.env.DB_BACKUP_RETENTION, 10) || 10,
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    tokenExpiry: '24h',
    refreshTokenExpiry: '7d',
  },

  email: {
    postmark: {
      apiToken: process.env.POSTMARK_API_TOKEN,
      fromEmail: process.env.POSTMARK_FROM_EMAIL || 'noreply@example.com',
      fromName: process.env.POSTMARK_FROM_NAME || 'DC Migration System',
    },
    enabled: process.env.EMAIL_ENABLED === 'true',
    dailyReportEnabled: process.env.DAILY_REPORT_ENABLED !== 'false',
    dailyReportTime: process.env.DAILY_REPORT_TIME || '08:00',
    reminderEnabled: process.env.REMINDER_ENABLED !== 'false',
    reminderDaysBeforeDeadline: (process.env.REMINDER_DAYS_BEFORE_DEADLINE || '7,3,1')
      .split(',')
      .map(d => parseInt(d.trim(), 10)),
  },

  system: {
    migrationDeadline: new Date(process.env.MIGRATION_DEADLINE || '2025-11-20T00:00:00'),
    timezone: process.env.TIMEZONE || 'America/New_York',
  },

  features: {
    auth: process.env.ENABLE_AUTH !== 'false',
    emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
    dailyReports: process.env.ENABLE_DAILY_REPORTS !== 'false',
    leaderboard: process.env.ENABLE_LEADERBOARD !== 'false',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  paths: {
    root: path.resolve(__dirname, '../..'),
    public: path.resolve(__dirname, '../../public'),
    uploads: path.resolve(__dirname, '../../uploads'),
    logs: path.resolve(__dirname, '../../logs'),
  },
};

// Validate required configuration
function validateConfig() {
  const errors = [];

  if (config.features.auth && !process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required when authentication is enabled');
  }

  if (config.email.enabled && !config.email.postmark.apiToken) {
    errors.push('POSTMARK_API_TOKEN is required when email is enabled');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    if (config.app.isProduction) {
      process.exit(1);
    }
  }
}

validateConfig();

module.exports = config;