const winston = require('winston');
const path = require('path');
const config = require('../config');

// Create logger instance
const logger = winston.createLogger({
  level: config.app.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dc-countdown' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (config.app.env === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(config.paths.logs, 'error.log'),
    level: 'error'
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(config.paths.logs, 'combined.log')
  }));
}

module.exports = logger;