# DC Migration System v2.0

A comprehensive, enterprise-grade data center migration tracking system with authentication, automated email notifications, and real-time reporting.

## 🚀 Features

### Core Functionality
- **Multi-Entity Tracking**: Servers, VLANs, Networks, Voice Systems, Colo Customers, Carrier Circuits, Public Networks, Carrier NNIs
- **Real-time Dashboard**: Live countdown to migration deadline (November 20, 2025)
- **Dependency Management**: Track complex relationships between migration assets
- **Engineer Assignment**: Assign and track engineer workloads
- **CSV Import/Export**: Bulk data management capabilities

### New in v2.0
- **User Authentication**: JWT-based authentication with role-based access control
- **Email Notifications**: Automated reminders and reports via Postmark API
- **Daily Reports**: Automated daily progress reports to managers
- **Leaderboard**: Engineer performance tracking and gamification
- **Advanced Reporting**: Weekly digests, completion notifications, critical alerts
- **Improved Architecture**: Modular design with proper separation of concerns
- **Production Ready**: Docker support, health checks, logging, error handling

## 📋 Prerequisites

- Node.js 16+ and npm 8+
- SQLite3
- Docker and Docker Compose (optional)
- Postmark API account (for email features)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd dc-countdown
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Start the application**
```bash
npm run dev  # Development with hot reload
# or
npm start    # Production mode
```

### Docker Deployment

1. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

2. **Build and run with Docker Compose**
```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up -d

# Production with Nginx
docker-compose --profile with-nginx up -d
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Authentication
JWT_SECRET=your-secure-secret-key
ENABLE_AUTH=true

# Email (Postmark)
POSTMARK_API_TOKEN=your-postmark-token
POSTMARK_FROM_EMAIL=noreply@yourdomain.com
EMAIL_ENABLED=true
DAILY_REPORT_ENABLED=true
DAILY_REPORT_TIME=08:00

# Database
DB_PATH=./migration.db
DB_BACKUP_PATH=./backups

# System
MIGRATION_DEADLINE=2025-11-20T00:00:00
TIMEZONE=America/New_York
```

### Default Admin Account

On first run, the system creates a default admin account:
- Email: `admin@example.com`
- Password: `changeme123`

**⚠️ Change this immediately after first login!**

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/login         # Login with email/password
POST   /api/auth/register      # Register new user
POST   /api/auth/refresh       # Refresh JWT token
POST   /api/auth/logout        # Logout user
```

### Resource Endpoints

All resource endpoints follow RESTful patterns:

```
GET    /api/{resource}         # List all (paginated)
GET    /api/{resource}/:id     # Get single item
POST   /api/{resource}         # Create new item
PUT    /api/{resource}/:id     # Update item
DELETE /api/{resource}/:id     # Delete item
POST   /api/{resource}/import  # Import from CSV
GET    /api/{resource}/export  # Export to CSV
```

Resources: `servers`, `vlans`, `networks`, `voice-systems`, `colo-customers`, `carrier-circuits`, `public-networks`, `carrier-nnis`, `critical-items`

### Reports & Analytics

```
GET    /api/stats              # Overall statistics
GET    /api/reports/daily      # Generate daily report
GET    /api/reports/weekly     # Generate weekly digest
GET    /api/reports/leaderboard # Engineer leaderboard
```

## 🏗️ Project Structure

```
dc-countdown/
├── src/
│   ├── app.js                 # Main application entry
│   ├── config/                # Configuration management
│   ├── models/                # Data models (extends BaseModel)
│   ├── services/              # Business logic services
│   ├── routes/                # API route definitions
│   ├── middleware/            # Express middleware
│   ├── database/              
│   │   ├── Database.js        # Database singleton
│   │   ├── migrations/        # SQL migration files
│   │   └── migrate.js         # Migration runner
│   └── utils/                 # Utility functions
├── public/                    # Frontend static files
├── uploads/                   # File uploads
├── logs/                      # Application logs
├── backups/                   # Database backups
└── docker-compose.yml         # Docker configuration
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Admin, Manager, Engineer, User roles
- **Password Hashing**: BCrypt with configurable rounds
- **Rate Limiting**: Configurable request limits
- **Helmet.js**: Security headers
- **Input Validation**: Request validation middleware
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy

## 📧 Email Notifications

### Automated Emails

1. **Daily Reports**: Sent to managers at configured time
2. **Engineer Reminders**: Sent based on deadline proximity
3. **Completion Notifications**: Sent when items are marked complete
4. **Critical Alerts**: Sent for high-priority items
5. **Weekly Digests**: Summary of week's progress

### Manual Email Triggers

```bash
# Test email configuration
curl -X POST http://localhost:3000/api/reports/test-email \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger daily report manually
curl -X POST http://localhost:3000/api/reports/trigger-daily \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗄️ Database Management

### Backup & Restore

```bash
# Create backup
npm run backup

# Restore from backup
npm run restore
# Select backup file when prompted

# Docker backup
docker exec dc-countdown-app npm run backup
```

### Migrations

```bash
# Run pending migrations
npm run migrate

# Create new migration
node src/database/migrate.js create migration-name

# Rollback migrations
node src/database/migrate.js rollback 1
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Logs

```bash
# Local logs
tail -f logs/app.log

# Docker logs
docker-compose logs -f app
```

### Metrics

Access the stats endpoint for real-time metrics:
```
GET /api/stats
```

## 🚀 Deployment

### Production Checklist

1. ✅ Set strong JWT_SECRET
2. ✅ Configure Postmark API credentials
3. ✅ Change default admin password
4. ✅ Enable HTTPS (use Nginx/reverse proxy)
5. ✅ Set NODE_ENV=production
6. ✅ Configure backup retention
7. ✅ Set up monitoring/alerting
8. ✅ Review rate limiting settings

### Scaling Considerations

- **Database**: Consider PostgreSQL for larger deployments
- **Caching**: Add Redis for session/cache management
- **Load Balancing**: Use multiple app instances behind a load balancer
- **CDN**: Serve static assets via CDN
- **Queue**: Add job queue for email processing (Bull/RabbitMQ)

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test email configuration
npm run test:email

# Load testing
npm run test:load
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

[Your License Here]

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check the [documentation](./docs)

## 🎯 Roadmap

### Planned Features
- [ ] WebSocket real-time updates
- [ ] Advanced dependency visualization
- [ ] Mobile application
- [ ] API rate limiting per user
- [ ] Advanced search and filtering
- [ ] Audit logging
- [ ] Two-factor authentication
- [ ] Custom report builder
- [ ] Integration with ticketing systems
- [ ] Automated testing suite

## 🏆 Credits

Built with:
- Express.js
- SQLite/PostgreSQL
- JWT Authentication
- Postmark Email Service
- Chart.js
- Docker

---

**Version**: 2.0.0  
**Last Updated**: November 2024  
**Deadline**: November 20, 2025