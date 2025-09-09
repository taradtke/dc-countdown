# TSR DC Migration Countdown & Tracking System

A comprehensive web application for tracking data center migration progress with real-time countdown, task management, and progress monitoring.

## Features

- **Real-time Countdown**: Visual countdown to migration deadline (November 20, 2025)
- **Migration Tracking Dashboard**: Track progress for servers, VLANs, networks, voice systems, and colo customers
- **CSV Import**: Bulk import migration items from CSV files
- **Progress Monitoring**: Real-time progress bars and completion statistics
- **Task Management**: Track individual tasks with engineer assignment
- **Live Updates**: Countdown automatically updates with backend data

## Quick Start

### Using Docker (Recommended)

#### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd dc-countdown
```

2. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up
```

3. Access the application:
   - Countdown Dashboard: http://localhost:3000
   - Tracking Dashboard: http://localhost:3000/tracking.html

#### Production Setup

1. Build and start the production environment:
```bash
docker-compose up -d
```

2. Access the application:
   - Main Application: http://localhost (served via nginx)
   - Direct Node.js Access: http://localhost:3000

### Manual Setup (Without Docker)

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

3. Access the application:
   - Countdown Dashboard: http://localhost:3000
   - Tracking Dashboard: http://localhost:3000/tracking.html

## Data Import

### CSV Format Requirements

#### Servers CSV
```csv
Customer,VM Name,Host,IP Addresses,Cores,Memory Capacity,Storage Used (GiB),Storage Provisioned (GiB)
```

#### VLANs CSV
```csv
VLAN ID,Name,Description,Network,Gateway
```

#### Networks CSV
```csv
Network Name,Provider,Circuit ID,Bandwidth
```

#### Voice Systems CSV
```csv
Customer,VM Name,System Type,Extension Count
```

#### Colo Customers CSV
```csv
Customer Name,Rack Location,New Cabinet Number,Equipment Count,Power Usage
```

### Importing Data

1. Navigate to the Tracking Dashboard
2. Select the appropriate tab (Servers, VLANs, etc.)
3. Click "Import CSV"
4. Select your CSV file
5. Data will be automatically imported and displayed

## Docker Commands

### Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml down

# Rebuild after changes
docker-compose -f docker-compose.dev.yml up --build
```

### Production

```bash
# Start production environment
docker-compose up -d

# Stop production environment
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build
```

### Data Persistence

Docker volumes ensure data persistence:
- Database: Stored in `db-data` volume
- Uploads: Stored in `uploads-data` volume

To backup data:
```bash
# Backup database
docker cp dc-countdown-dev:/usr/src/app/data/migration.db ./backup-migration.db

# Backup uploads
docker cp dc-countdown-dev:/usr/src/app/uploads ./backup-uploads
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3000
DB_PATH=./migration.db  # Local development
# DB_PATH=/usr/src/app/data/migration.db  # Docker
```

## API Endpoints

### Statistics
- `GET /api/stats` - Get overall migration statistics

### Servers
- `GET /api/servers` - List all servers
- `POST /api/servers/import` - Import servers from CSV
- `PUT /api/servers/:id` - Update server status

### VLANs
- `GET /api/vlans` - List all VLANs
- `POST /api/vlans/import` - Import VLANs from CSV
- `PUT /api/vlans/:id` - Update VLAN status

### Networks
- `GET /api/networks` - List all networks
- `POST /api/networks/import` - Import networks from CSV
- `PUT /api/networks/:id` - Update network status

### Voice Systems
- `GET /api/voice-systems` - List all voice systems
- `POST /api/voice-systems/import` - Import voice systems from CSV
- `PUT /api/voice-systems/:id` - Update voice system status

### Colo Customers
- `GET /api/colo-customers` - List all colo customers
- `POST /api/colo-customers/import` - Import colo customers from CSV
- `PUT /api/colo-customers/:id` - Update colo customer status

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Database Issues
If you need to reset the database:
```bash
# Stop containers
docker-compose down

# Remove database volume
docker volume rm dc-countdown_db-data

# Restart containers
docker-compose up
```

### Permission Issues
If you encounter permission issues with volumes:
```bash
# Fix permissions
docker exec dc-countdown-dev chown -R node:node /usr/src/app/data
docker exec dc-countdown-dev chown -R node:node /usr/src/app/uploads
```

## Development

### Project Structure
```
dc-countdown/
├── server.js           # Express server
├── database.js         # SQLite database handler
├── index.html          # Countdown dashboard
├── tracking.html       # Tracking dashboard
├── countdown.js        # Countdown logic
├── tracking.js         # Tracking interface logic
├── styles.css          # Countdown styles
├── tracking-styles.css # Tracking dashboard styles
├── Dockerfile          # Production Docker image
├── Dockerfile.dev      # Development Docker image
├── docker-compose.yml  # Production compose
├── docker-compose.dev.yml # Development compose
└── nginx.conf          # Nginx configuration
```

### Making Changes

1. The development environment uses volume mounts for hot reload
2. Changes to HTML/CSS/JS files are reflected immediately
3. Changes to server.js require nodemon to restart (automatic in dev mode)
4. Database schema changes require container restart

## License

© 2025 TSR. All rights reserved.