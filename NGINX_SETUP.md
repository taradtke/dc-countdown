# Nginx Proxy Manager Setup for dc.tsr.ai

## Quick Start

1. **Start the services:**
   ```bash
   npm run docker:dev:build
   ```

2. **Access Nginx Proxy Manager:**
   - Open browser to: http://your-server-ip:81
   - Default login:
     - Email: `admin@example.com`
     - Password: `changeme`
   - **IMPORTANT:** Change these credentials immediately after first login

3. **Configure Proxy Host for dc.tsr.ai:**

   ### In Nginx Proxy Manager Admin Panel:
   
   a. Click "Proxy Hosts" → "Add Proxy Host"
   
   b. **Details Tab:**
   - Domain Names: `dc.tsr.ai`
   - Scheme: `http`
   - Forward Hostname/IP: `app` (container name on same network)
   - Forward Port: `3000`
   - Cache Assets: ✓ (optional)
   - Block Common Exploits: ✓
   - Websockets Support: ✓ (if needed)
   
   c. **SSL Tab:**
   - SSL Certificate: "Request a new SSL Certificate with Let's Encrypt"
   - Force SSL: ✓
   - Email Address: your-email@example.com
   - Agree to Terms: ✓
   
   d. Click "Save"

4. **DNS Configuration:**
   - Point `dc.tsr.ai` A record to your server's public IP
   - Wait for DNS propagation (usually 5-15 minutes)

## Container Details

### Nginx Proxy Manager
- **Admin Panel:** Port 81
- **HTTP:** Port 80 (redirects to HTTPS)
- **HTTPS:** Port 443
- **Container Name:** nginx-proxy-manager
- **Network:** dc-network (shared with app)

### Application Container
- **Internal Port:** 3000 (not exposed externally)
- **Container Name:** dc-countdown-dev
- **Network:** dc-network

## Backup and Restore

### Create Backup
```bash
npm run backup
# or
./backup.sh
```
Backups are stored in `/backups` directory with timestamps.

### Restore from Backup
```bash
npm run restore
# or
./restore.sh [backup-file]
```
Interactive restore if no file specified.

## Useful Commands

```bash
# Start services
npm run docker:dev

# Start with rebuild
npm run docker:dev:build

# Stop services
npm run docker:down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View nginx proxy manager logs
docker logs nginx-proxy-manager -f

# View app logs
docker logs dc-countdown-dev -f

# Create backup
npm run backup

# Restore from backup
npm run restore
```

## Troubleshooting

### Cannot access Nginx Proxy Manager
- Ensure port 81 is open in firewall
- Check container is running: `docker ps`
- Check logs: `docker logs nginx-proxy-manager`

### SSL Certificate Issues
- Ensure domain DNS is pointing to server
- Check port 80 and 443 are open
- Verify email address for Let's Encrypt
- Check rate limits (5 certificates per week per domain)

### App not accessible through proxy
- Verify containers are on same network: `docker network inspect dc-countdown_dc-network`
- Check app container is running: `docker ps`
- Test internal connectivity: `docker exec nginx-proxy-manager ping app`

### Database Issues
- Create backup before any major changes
- Restore from backup if needed
- Database persists in Docker volume `dc-countdown_db-data`

## Security Notes

1. **Change default Nginx Proxy Manager credentials immediately**
2. **Use strong passwords**
3. **Enable 2FA in Nginx Proxy Manager (Settings → User → 2FA)**
4. **Regularly backup your data**
5. **Keep Docker images updated**
6. **Monitor access logs**

## Data Persistence

Data persists in Docker volumes:
- `dc-countdown_db-data`: SQLite database
- `dc-countdown_uploads-data`: Uploaded files
- `dc-countdown_nginx-data`: Nginx Proxy Manager config
- `dc-countdown_nginx-letsencrypt`: SSL certificates

To completely reset:
```bash
docker-compose -f docker-compose.dev.yml down -v
```
**WARNING:** This deletes all data including database and SSL certificates!