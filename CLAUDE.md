# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSR DC Migration Countdown & Tracking System v2.0 - An enterprise-grade data center migration tracker with authentication, automated email notifications, and comprehensive reporting. Tracks migration progress for servers, VLANs, networks, voice systems, carrier circuits, public networks, carrier NNIs, colo customers, and critical items with a hard deadline of November 20, 2025.

## Essential Commands

### Development
```bash
# Local development with hot reload
npm run dev

# Docker development with Nginx Proxy Manager
npm run docker:dev:build  # Initial build
npm run docker:dev        # Subsequent runs
npm run docker:down       # Stop containers

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
# Create backup (auto-timestamped, compressed)
npm run backup
# or ./backup.sh

# Restore from backup (interactive)
npm run restore
# or ./restore.sh [backup-file]

# Reset database
rm migration.db  # Local
# or
docker volume rm dc-countdown_db-data  # Docker
```

## Architecture Overview

### Data Flow Pattern
```
CSV Import → SQLite Database → Express API → Frontend (HTML/JS) → User Updates → Database
```

### Complete API Structure
All entities follow REST patterns with full CRUD operations:

**Core Migration Assets:**
- `/api/servers` - Server infrastructure
- `/api/vlans` - VLAN configurations
- `/api/networks` - Network infrastructure
- `/api/voice-systems` - Voice/telephony systems
- `/api/colo-customers` - Colocation customers

**Extended Assets:**
- `/api/carrier-circuits` - Carrier circuit tracking
- `/api/public-networks` - Public network configurations
- `/api/carrier-nnis` - Carrier NNI connections
- `/api/critical-items` - Priority task management

**Customer & Dependency Management:**
- `/api/customers` - Customer relationships
- `/api/customers/:id/assets` - Customer asset linking
- `/api/dependencies` - Asset dependency mapping

**Analytics & Monitoring:**
- `/api/stats` - Real-time migration statistics
- `/api/leaderboard` - Engineer performance metrics
- `/api/dependency-counts` - Dependency analytics

### Database Schema & Completion Criteria
Each asset type has specific completion requirements tracked in SQLite:

- **servers**: Completed when `customer_notified_successful_cutover = 1`
- **vlans**: Completed when `migrated = 1 AND verified = 1`
- **networks**: Completed when `cutover_completed = 1`
- **voice_systems**: Completed when `cutover_completed = 1`
- **colo_customers**: Completed when `migration_completed = 1`
- **carrier_circuits**: Completed when `cutover_completed = 1`
- **public_networks**: Completed when `cutover_completed = 1`
- **carrier_nnis**: Completed when `cutover_completed = 1`

### Frontend Architecture
The frontend uses a modular architecture with authentication support:

1. **Live Dashboard** (`public/index.html`):
   - Real-time countdown to November 20, 2025
   - Polls `/api/stats` every 30 seconds
   - Calculates required daily/hourly completion rates
   - Progress bars for each asset type

2. **Management Interface** (`public/tracking.html`):
   - 10-tab interface for all asset types
   - Inline editing with immediate database updates
   - CSV import functionality per entity type
   - Leaderboard with Chart.js visualizations
   - Customer management and asset linking
   - Critical items tracking with priority levels
   - Dependency visualization
   - JWT authentication integration

### Critical Business Logic

**Dynamic Completion Rate Calculation**:
```javascript
// Total hours remaining until deadline
const totalHours = (daysRemaining * 24) + hoursRemaining + (minutesRemaining / 60);
// Required rate per day/hour based on remaining items
const ratePerDay = quantity / totalDays;
```

**Engineer Assignment**: All assets can be assigned to engineers managed through the User model with `is_engineer` flag

**Customer Asset Linking**: Assets linked via `customer_assets` junction table with type-specific references

### Docker Configuration

**Development** (`docker-compose.dev.yml`):
- Application container with nodemon hot reload
- Nginx Proxy Manager for SSL and reverse proxy
- Shared `dc-network` for container communication
- Persistent volumes for database and uploads

**Production** (`docker-compose.yml`):
- Optional nginx reverse proxy with caching
- Profile-based deployment options
- Static file serving with 1-year cache headers

**Nginx Proxy Manager Access**:
- Admin panel: `http://server:81`
- Default credentials: `admin@example.com` / `changeme` (change immediately)
- Configure proxy: `dc.tsr.ai` → `app:3000`

### Database Connection
Database path is configurable via environment variable:
- Local: `DB_PATH=./migration.db`
- Docker: `DB_PATH=/usr/src/app/data/migration.db`

The Database singleton (`src/database/Database.js`) handles all database operations with automatic migration support.

### CSV Import Format Requirements

Each entity type requires specific CSV columns:

- **Servers**: Customer, VM Name, Host, IP Addresses, Cores, Memory Capacity, Storage Used (GiB), Storage Provisioned (GiB)
- **VLANs**: VLAN ID, Name, Description, Network, Gateway
- **Networks**: Network Name, Provider, Circuit ID, Bandwidth
- **Voice Systems**: Customer, VM Name, System Type, Extension Count
- **Colo Customers**: Customer Name, Rack Location, New Cabinet Number, Equipment Count, Power Usage
- **Carrier Circuits**: Circuit ID, Provider, Type, Bandwidth, Location A, Location Z
- **Public Networks**: Network Name, CIDR, Provider, Gateway
- **Carrier NNIs**: NNI ID, Provider, Type, Bandwidth, Location

Import process uses multer for file handling and csv-parser for parsing with automatic field mapping.

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

### Backup & Restore System
- **Automated backups** with compression and timestamp
- **10 backup retention** with automatic cleanup
- **Interactive restore** with confirmation prompts
- Works with running or stopped containers
- Handles both database and uploads

### Security Considerations
- CORS enabled for all origins (adjust for production)
- No authentication system implemented
- SQLite database file should be protected in production
- Nginx Proxy Manager provides SSL via Let's Encrypt

## Important Architectural Decisions

1. **No Testing Framework**: Project has no automated tests - manual testing only
2. **Vanilla JavaScript**: No frontend framework by design for simplicity
3. **SQLite Database**: Single-file database for portability
4. **Polling over WebSockets**: Simpler implementation for real-time updates
5. **Docker-First Development**: Consistent environment across dev/QA/prod
6. **Nginx Proxy Manager**: Professional SSL and reverse proxy management