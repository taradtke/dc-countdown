const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');

// Load configuration
const config = require('./config');

// Initialize database
const DatabaseFactory = require('./database/DatabaseFactory');
const db = DatabaseFactory.getInstance();

// Import middleware
const { authenticate, optionalAuth } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const vlanRoutes = require('./routes/vlans');
const networkRoutes = require('./routes/networks');
const voiceSystemRoutes = require('./routes/voiceSystems');
const coloCustomerRoutes = require('./routes/coloCustomers');
const carrierCircuitRoutes = require('./routes/carrierCircuits');
const publicNetworkRoutes = require('./routes/publicNetworks');
const carrierNNIRoutes = require('./routes/carrierNNIs');
const criticalItemRoutes = require('./routes/criticalItems');
const customerRoutes = require('./routes/customers');
const statsRoutes = require('./routes/stats');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const leaderboardRoutes = require('./routes/leaderboard');

// Import services
const schedulerService = require('./services/SchedulerService');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: config.app.isDevelopment ? '*' : config.app.baseUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(session({
  secret: config.auth.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.app.isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Logging middleware
if (config.app.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static file serving
app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.app.isProduction ? '1y' : 0,
  etag: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
    features: config.features
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', authenticate, serverRoutes);
app.use('/api/vlans', authenticate, vlanRoutes);
app.use('/api/networks', authenticate, networkRoutes);
app.use('/api/voice-systems', authenticate, voiceSystemRoutes);
app.use('/api/colo-customers', authenticate, coloCustomerRoutes);
app.use('/api/carrier-circuits', authenticate, carrierCircuitRoutes);
app.use('/api/public-networks', authenticate, publicNetworkRoutes);
app.use('/api/carrier-nnis', authenticate, carrierNNIRoutes);
app.use('/api/critical-items', authenticate, criticalItemRoutes);
app.use('/api/customers', authenticate, customerRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/stats', optionalAuth, statsRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const message = config.app.isProduction 
    ? 'An error occurred processing your request'
    : err.message;

  res.status(err.status || 500).json({
    error: message,
    ...(config.app.isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize application
async function initialize() {
  try {
    console.log('Starting DC Migration System...');
    
    // Connect to database
    await db.connect();
    console.log('Database connected');

    // Run migrations
    const migrationPath = path.join(__dirname, 'database', 'migrations');
    const migrations = require('./database/migrate');
    await migrations.runAll();
    console.log('Database migrations completed');

    // Create default admin user if needed
    if (config.features.auth) {
      const User = require('./models/User');
      const userModel = new User();
      await userModel.createDefaultAdmin();
      console.log('Default admin user created (if needed)');
    }

    // Start scheduler service
    if (config.email.enabled) {
      schedulerService.start();
      console.log('Scheduler service started');
    }

    // Start server
    const PORT = config.app.port;
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║                DC MIGRATION SYSTEM v2.0                 ║
╠════════════════════════════════════════════════════════╣
║  Environment: ${config.app.env.padEnd(41)}║
║  Port: ${String(PORT).padEnd(49)}║
║  Auth: ${(config.features.auth ? 'Enabled' : 'Disabled').padEnd(49)}║
║  Email: ${(config.email.enabled ? 'Enabled' : 'Disabled').padEnd(48)}║
║  Deadline: ${new Date(config.system.migrationDeadline).toLocaleDateString().padEnd(45)}║
╠════════════════════════════════════════════════════════╣
║  Dashboard: ${config.app.baseUrl.padEnd(43)}║
║  API Docs: ${(config.app.baseUrl + '/api').padEnd(44)}║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('\nShutting down gracefully...');
  
  try {
    // Stop scheduler
    schedulerService.stop();
    
    // Close database
    await db.close();
    
    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the application
initialize();