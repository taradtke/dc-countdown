# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSR DC Migration Countdown & Tracking System v2.0 - An enterprise-grade data center migration tracker with PostgreSQL database (in Docker) or SQLite (local), JWT authentication, automated email notifications via Postmark, and comprehensive reporting. Tracks migration progress with a hard deadline of November 20, 2025.

## Essential Commands

### Development
```bash
# Docker development (recommended) - uses PostgreSQL
npm run docker:dev:build  # Initial build
npm run docker:dev        # Subsequent runs
npm run docker:down       # Stop containers

# Local development with hot reload (uses SQLite)
npm run dev

# Run database migrations (PostgreSQL)
npm run migrate

# Test email configuration
npm run test:email
```

### Testing & Validation
```bash
# No automated tests exist - manual testing only
# Check application health
curl http://localhost:3000/health

# Verify authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### Database Management
```bash
# Backup database
npm run backup
./backup.sh  # Alternative

# Restore from backup (interactive)
npm run restore
./restore.sh [backup-file]  # Alternative

# Access PostgreSQL (Docker)
docker exec -it dc-countdown-postgres psql -U dc_admin -d dc_migration

# Access pgAdmin web interface
# http://localhost:5050
# Login: admin@tsr.com / Admin123!
```

## Architecture & Key Components

### Database Configuration
- **Docker**: PostgreSQL 15 (primary database)
  - Host: postgres, Port: 5432
  - Database: dc_migration, User: dc_admin
  - Migrations: `src/database/migrations/postgres/*.sql`
- **Local**: SQLite (fallback for local development)
  - Path: `./migration.db`
  - Migrations: `src/database/migrations/*.sql`

### Authentication System
- JWT-based with refresh tokens
- Default admin: `admin@example.com` / `Admin123!`
- Roles: admin, manager, engineer, user
- Middleware: `src/middleware/auth.js`
- Session management with express-session

### Frontend Architecture
1. **Public Pages** (no auth required):
   - `/` (`index.html`) - Live countdown dashboard with emoji icons
   - `/api/stats` - Public statistics endpoint
   - `/api/leaderboard` - Public leaderboard data

2. **Protected Pages** (JWT required):
   - `/tracking.html` - 10-tab management interface
   - All `/api/*` endpoints except stats/leaderboard
   - Inline editing with immediate database updates

### API Endpoints Pattern
```javascript
// All resources follow this pattern:
GET    /api/{resource}         // List all
GET    /api/{resource}/:id     // Get one
POST   /api/{resource}         // Create
PUT    /api/{resource}/:id     // Update
DELETE /api/{resource}/:id     // Delete
POST   /api/{resource}/import  // CSV import

// Resources: servers, vlans, networks, voice-systems, colo-customers,
// carrier-circuits, public-networks, carrier-nnis, critical-items
```

### Model System
- Base class: `src/models/BaseModel.js` - provides CRUD operations
- All models extend BaseModel with schema definitions
- Database operations use parameterized queries
- Customer matching: `utils/customerMatcher.js` for fuzzy matching

### CSV Import System
- Templates in `/csv-templates/` with README
- Each route handles its own CSV parsing
- Boolean fields accept: true/false, 1/0, or empty
- Date format: YYYY-MM-DD
- Field mapping handles multiple column name variations

### Recent Field Additions (PostgreSQL migrations 004-005)
These fields were added to match frontend expectations:
- **carrier_nnis**: Added carrier_name, circuit_id, interface_type, vlan_range, ip_block, current_device, new_device, migration_status, tested, engineer_assigned
- **servers**: Added customer_contacted, test_move_date, move_date, backups_verified_working_hycu, backups_setup_verified_working_veeam, firewall_network_cutover, engineer_completed_work
- **All entities**: Added engineer_completed_work field where missing

## Critical Business Logic

### Completion Tracking
Each entity has specific completion criteria:
- **servers**: `customer_notified_successful_cutover = true`
- **vlans**: `migrated = true AND verified = true`
- **Others**: `cutover_completed = true` or `migration_completed = true`

### Rate Calculation (`public/js/countdown.js`)
```javascript
// Calculates required completion rate based on time remaining
const totalHours = (daysRemaining * 24) + hoursRemaining + (minutesRemaining / 60);
const ratePerDay = quantity / (totalHours / 24);
```

### Email System (Postmark)
- Service: `src/services/EmailService.js`
- Scheduler: `src/services/SchedulerService.js`
- Templates in EmailService class
- Daily reports at configured time (DAILY_REPORT_TIME env var)

## Docker Services

### Main Services (always running)
- **app**: Node.js application (port 3000)
- **postgres**: PostgreSQL database (port 5432)
- **pgadmin**: Database admin UI (port 5050)

### Optional Services (use profiles)
- **nginx-proxy-manager**: `--profile with-nginx` (ports 80, 443, 81)
- **redis**: `--profile with-redis` (port 6379)
- **mailhog**: `--profile with-mailhog` (ports 1025, 8025)
- **adminer**: `--profile with-adminer` (port 8080)

## Environment Variables

Critical settings in `.env.development`:
```env
# Database (Docker uses PostgreSQL)
DB_TYPE=postgres
DB_HOST=postgres
DB_NAME=dc_migration
DB_USER=dc_admin
DB_PASSWORD=development_password

# Authentication
JWT_SECRET=development-secret-change-in-production
ENABLE_AUTH=true

# Email (Postmark)
EMAIL_ENABLED=false  # Set true to enable
POSTMARK_API_TOKEN=your-token
DAILY_REPORT_ENABLED=false
```

## Common Issues & Solutions

### Frontend not loading data
- Check authentication: Look for 401 errors in console
- Verify JWT token in localStorage
- Check CORS settings in `src/app.js`

### CSV import failing
- Verify column headers match exactly (case-sensitive)
- Check boolean fields use correct format
- Ensure file is UTF-8 encoded
- Review field mappings in route files

### Database connection issues
- PostgreSQL: Check Docker container is running and healthy
- SQLite: Verify file permissions on migration.db
- Run migrations: `npm run migrate`

### Missing icons/emojis
- Favicon files generated with ImageMagick
- Emojis used: 🖥️ 🔗 🌐 🔥 🏢 🔌 📡 💾 📞 👥 🚨 🏆
- Icons served from `/public` directory

## Development Workflow

1. **Start Docker environment**: `npm run docker:dev:build`
2. **Access services**:
   - App: http://localhost:3000
   - pgAdmin: http://localhost:5050
3. **Make changes**: Files auto-reload with nodemon
4. **Test authentication**: Login with admin credentials
5. **Import test data**: Use CSV templates in `/csv-templates/`
6. **Check logs**: `docker logs -f dc-countdown-dev`

## Production Deployment

1. Set production environment variables
2. Change default passwords (admin, database)
3. Configure Postmark for email
4. Set up SSL with Nginx Proxy Manager
5. Configure backup retention
6. Run with: `docker-compose up -d`

## No Testing Framework
This project has no automated tests. All testing is manual. Consider testing:
- Authentication flow
- CSV imports with sample data
- Inline editing on tracking page
- Email notifications (use Mailhog in dev)
- Backup and restore procedures