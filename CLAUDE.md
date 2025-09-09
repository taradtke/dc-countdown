# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSR DC Migration Countdown & Tracking System - A real-time data center migration tracker with a hard deadline of November 20, 2025. The system tracks migration progress for servers, VLANs, networks, voice systems, and colo customers.

## Essential Commands

### Development
```bash
# Local development (with hot reload)
npm run dev

# Docker development (recommended)
docker-compose -f docker-compose.dev.yml up

# Install dependencies
npm install
```

### Production
```bash
# Start production server
npm start

# Docker production
docker-compose up -d
```

### Database Operations
```bash
# Backup database (Docker)
docker cp dc-countdown-dev:/usr/src/app/data/migration.db ./backup-migration.db

# Reset database
rm migration.db  # or remove Docker volume: docker volume rm dc-countdown_db-data
```

## Architecture Overview

### Data Flow Pattern
```
CSV Import → SQLite Database → Express API → Frontend (HTML/JS) → User Updates → Database
```

### Database Schema & Completion Criteria
- **servers**: Completed when `customer_notified_successful_cutover = 1`
- **vlans**: Completed when `migrated = 1 AND verified = 1`
- **networks**: Completed when `cutover_completed = 1`
- **voice_systems**: Completed when `cutover_completed = 1`
- **colo_customers**: Completed when `migration_completed = 1`

### API Pattern
All entities follow the same REST pattern:
- `GET /api/{entity}` - List all
- `POST /api/{entity}/import` - CSV import
- `PUT /api/{entity}/:id` - Update single item
- `GET /api/stats` - Aggregated statistics

Entities: `servers`, `vlans`, `networks`, `voice-systems`, `colo-customers`

### Frontend Architecture
Two separate interfaces communicate with the same backend:

1. **index.html/countdown.js**: Live countdown with completion rate calculations
   - Polls `/api/stats` every 30 seconds
   - Calculates required daily/hourly completion rates

2. **tracking.html/tracking.js**: Management dashboard with tabbed interface
   - Inline editing with immediate database updates
   - CSV import functionality per entity type

### Critical Business Logic

The system calculates dynamic completion rates in `countdown.js`:
```javascript
// Total hours remaining until deadline
const totalHours = (daysRemaining * 24) + hoursRemaining + (minutesRemaining / 60);
// Required rate per day/hour based on remaining items
const ratePerDay = quantity / totalDays;
```

### Database Connection
Database path is configurable via environment variable:
- Local: `DB_PATH=./migration.db`
- Docker: `DB_PATH=/usr/src/app/data/migration.db`

The Database class (`database.js`) automatically creates tables on initialization and handles all CRUD operations.

### Docker Configuration
- **Development** (`docker-compose.dev.yml`): Uses nodemon with volume mounts for hot reload
- **Production** (`docker-compose.yml`): Includes optional nginx reverse proxy
- Data persists in Docker volumes: `db-data` and `uploads-data`

### CSV Import Format
Each entity has specific CSV column requirements:
- **Servers**: Customer, VM Name, Host, IP Addresses, Cores, Memory Capacity, Storage Used (GiB), Storage Provisioned (GiB)
- **VLANs**: VLAN ID, Name, Description, Network, Gateway
- **Networks**: Network Name, Provider, Circuit ID, Bandwidth
- **Voice Systems**: Customer, VM Name, System Type, Extension Count
- **Colo Customers**: Customer Name, Rack Location, New Cabinet Number, Equipment Count, Power Usage

The import process uses multer for file handling and csv-parser for parsing, with automatic field mapping based on column headers.

## Key Implementation Details

### Real-time Updates
- Countdown updates every second (client-side)
- Statistics refresh every 30 seconds via API polling
- No WebSocket implementation - uses polling pattern

### Error Handling
- Database operations wrapped in promises with try/catch
- API endpoints return appropriate HTTP status codes
- Frontend displays alerts on failed operations

### State Management
- No frontend framework - vanilla JavaScript
- Server maintains all state in SQLite database
- Frontend fetches fresh data on tab switches

### Security Considerations
- CORS enabled for all origins (adjust for production)
- No authentication system implemented
- SQLite database file should be protected in production