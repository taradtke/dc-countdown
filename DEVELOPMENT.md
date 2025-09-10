# DC Migration System - Development Guide

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
make install

# Start local development
make dev

# Or use Docker
make dev-docker
```

### Full Development Stack
```bash
# Start with PostgreSQL, Redis, Mailhog, and Adminer
make dev-full
```

## 📦 Development Environments

### 1. Local Development (No Docker)

**Use when:** Working on your local machine with Node.js installed

```bash
# Setup
cp .env.development .env
npm install

# Run
npm run dev

# Access
# App: http://localhost:3000
```

### 2. Docker Development (Local)

**Use when:** Want consistent environment without installing dependencies

```bash
# Basic setup
docker-compose -f docker-compose.dev.yml up

# With all services
docker-compose -f docker-compose.dev.yml \
  --profile with-postgres \
  --profile with-redis \
  --profile with-mailhog \
  --profile with-adminer up

# Access
# App: http://localhost:3000
# Mailhog: http://localhost:8025
# Adminer: http://localhost:8080
# pgAdmin: http://localhost:5050
```

### 3. Remote Development

**Use when:** Developing on a remote server or cloud instance

```bash
# Deploy to remote server
docker-compose -f docker-compose.remote.yml up -d

# Enable code sync
docker-compose -f docker-compose.remote.yml --profile with-sync up -d

# Access
# App: https://dc.staging.yourdomain.com
# Traefik: http://server-ip:8080
```

### 4. Staging Environment

**Use when:** Testing production-like setup before deployment

```bash
# Setup staging
cp .env.production .env.staging
# Edit .env.staging with staging values

# Deploy
docker-compose -f docker-compose.remote.yml up -d

# With monitoring
docker-compose -f docker-compose.remote.yml --profile monitoring up -d

# Access
# App: https://dc.staging.yourdomain.com
# Grafana: http://server-ip:3001
# Prometheus: http://server-ip:9090
```

## 🛠️ Development Workflows

### Working with Authentication

By default, authentication is **disabled** in development. To enable:

1. Edit `.env.development`:
```env
ENABLE_AUTH=true
```

2. Default admin credentials:
- Email: `admin@example.com`
- Password: `changeme123`

3. Create test users:
```bash
# Via API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "role": "engineer"
  }'
```

### Working with Email

#### Using Mailhog (Recommended for Development)

1. Start Mailhog:
```bash
docker-compose -f docker-compose.dev.yml --profile with-mailhog up
```

2. Configure `.env.development`:
```env
EMAIL_ENABLED=true
SMTP_HOST=localhost
SMTP_PORT=1025
```

3. View emails at: http://localhost:8025

#### Using Postmark (Production-like)

1. Get Postmark API token
2. Configure `.env`:
```env
EMAIL_ENABLED=true
POSTMARK_API_TOKEN=your-token
```

3. Test email:
```bash
npm run test:email
```

### Database Management

#### Migrations

```bash
# Run migrations
make migrate

# Create new migration
make migrate-create
# Enter migration name when prompted

# Manual migration
node src/database/migrate.js create add-user-table
```

#### Using Different Databases

**SQLite (Default)**
```env
DB_PATH=./migration.db
```

**PostgreSQL**
```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml --profile with-postgres up

# Configure .env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dc_migration
DB_USER=dc_admin
DB_PASSWORD=development_password
```

#### Database GUI Tools

**Adminer** (Works with SQLite & PostgreSQL)
```bash
# Start Adminer
docker-compose -f docker-compose.dev.yml --profile with-adminer up

# Access: http://localhost:8080
# System: SQLite 3
# Database: /usr/src/app/data/migration.db
```

**pgAdmin** (PostgreSQL only)
```bash
# Start pgAdmin
docker-compose -f docker-compose.dev.yml --profile with-postgres up

# Access: http://localhost:5050
# Email: admin@example.com
# Password: admin
```

### Debugging

#### Node.js Debugging

1. **VS Code**: Use included `.vscode/launch.json`
2. **Chrome DevTools**: 
   - Start with debugging: `npm run dev:debug`
   - Open: `chrome://inspect`
   - Click "inspect" for the Node.js process

#### Remote Debugging

```bash
# Start with remote debugging
docker-compose -f docker-compose.dev.yml up

# Connect debugger to:
# Host: localhost
# Port: 9229
```

#### Logging

```bash
# View logs
make logs

# Docker logs
docker-compose logs -f app

# Specific log level
LOG_LEVEL=debug npm run dev
```

## 🧪 Testing

### Email Testing

```bash
# Test email configuration
npm run test:email

# Send test daily report
curl -X POST http://localhost:3000/api/reports/trigger-daily \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### API Testing

```bash
# Health check
curl http://localhost:3000/health

# Get stats (no auth in dev)
curl http://localhost:3000/api/stats

# With authentication
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme123"}' \
  | jq -r '.token')

curl http://localhost:3000/api/servers \
  -H "Authorization: Bearer $TOKEN"
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 10 --num 100 http://localhost:3000/api/stats
```

## 📊 Monitoring

### Development Monitoring

```bash
# Start monitoring stack
docker-compose -f docker-compose.remote.yml --profile monitoring up

# Access
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
# Loki: http://localhost:3100
```

### Application Metrics

The app exposes metrics at `/metrics` endpoint (when monitoring is enabled):

```bash
curl http://localhost:3000/metrics
```

## 🔧 Common Tasks

### Reset Everything

```bash
# Stop all services
make stop

# Clean everything
make clean
docker-compose down -v

# Fresh start
make install
make migrate
make dev-docker-build
```

### Switch Environments

```bash
# To development
make env-dev

# To production
make env-prod

# To staging
cp .env.staging .env
```

### Backup & Restore

```bash
# Create backup
make backup

# Restore
make restore
# Select backup when prompted

# Docker backup
docker exec dc-countdown-app npm run backup
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Docker Issues

```bash
# Reset Docker
docker-compose down -v
docker system prune -af
docker-compose up --build

# Check logs
docker-compose logs app
```

### Database Issues

```bash
# Reset database
rm migration.db
npm run migrate

# Docker database reset
docker-compose down -v
docker-compose up
```

### Email Not Working

1. Check email is enabled: `EMAIL_ENABLED=true`
2. For development, use Mailhog
3. Check Postmark API token is valid
4. View logs for errors

## 🔗 Useful Links

### Services (Development)

- **Application**: http://localhost:3000
- **Mailhog**: http://localhost:8025
- **Adminer**: http://localhost:8080
- **pgAdmin**: http://localhost:5050
- **Grafana**: http://localhost:3001
- **Traefik Dashboard**: http://localhost:8080

### Documentation

- [API Documentation](./API.md)
- [Database Schema](./SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Guide](./SECURITY.md)

## 📝 Development Tips

1. **Use Makefile commands** - They handle complex Docker commands
2. **Enable only what you need** - Don't run all services if not needed
3. **Use Mailhog for email testing** - Catches all emails locally
4. **Check health endpoint** - Verify service is running: `/health`
5. **Use proper environment files** - Don't mix dev and prod configs
6. **Commit .env.example** - Never commit actual .env files
7. **Test with auth enabled** - Periodically test with authentication on
8. **Monitor logs** - Keep logs open when debugging
9. **Use debugging tools** - Chrome DevTools or VS Code debugger
10. **Document changes** - Update README when adding features

## 🤝 Contributing

1. Create feature branch
2. Use conventional commits
3. Test with authentication enabled
4. Update documentation
5. Run security audit: `npm audit`
6. Submit PR with description

## ❓ Need Help?

- Check [Troubleshooting](#-troubleshooting) section
- Review logs: `make logs`
- Check service health: `make status`
- Create an issue in the repository