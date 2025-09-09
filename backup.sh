#!/bin/bash

# DC Countdown Backup Script
# Creates timestamped backups of all databases and uploads

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="dc-countdown-dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting DC Countdown backup at $(date)${NC}"
echo "Backup directory: $BACKUP_DIR"
echo "Timestamp: $TIMESTAMP"

# Function to check if container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${YELLOW}Warning: Container ${CONTAINER_NAME} is not running.${NC}"
        echo "Attempting to backup from volumes directly..."
        return 1
    fi
    return 0
}

# Backup database from container or volume
backup_database() {
    echo -e "\n${GREEN}Backing up database...${NC}"
    
    if check_container; then
        # Container is running - copy from container
        docker cp "${CONTAINER_NAME}:/usr/src/app/data/migration.db" \
            "${BACKUP_DIR}/migration_${TIMESTAMP}.db" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Database backed up from running container${NC}"
        else
            echo -e "${RED}✗ Failed to backup database from container${NC}"
            return 1
        fi
    else
        # Container not running - try to backup from volume
        # Create a temporary container to access the volume
        docker run --rm \
            -v dc-countdown_db-data:/data \
            -v "$(pwd)/${BACKUP_DIR}:/backup" \
            alpine sh -c "cp /data/migration.db /backup/migration_${TIMESTAMP}.db 2>/dev/null"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Database backed up from volume${NC}"
        else
            echo -e "${YELLOW}⚠ No database found to backup${NC}"
        fi
    fi
}

# Backup uploads directory
backup_uploads() {
    echo -e "\n${GREEN}Backing up uploads...${NC}"
    
    if check_container; then
        # Container is running - copy from container
        docker cp "${CONTAINER_NAME}:/usr/src/app/uploads" \
            "${BACKUP_DIR}/uploads_${TIMESTAMP}" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Uploads backed up from running container${NC}"
        else
            echo -e "${YELLOW}⚠ No uploads to backup or backup failed${NC}"
        fi
    else
        # Container not running - try to backup from volume
        docker run --rm \
            -v dc-countdown_uploads-data:/uploads \
            -v "$(pwd)/${BACKUP_DIR}:/backup" \
            alpine sh -c "cp -r /uploads /backup/uploads_${TIMESTAMP} 2>/dev/null"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Uploads backed up from volume${NC}"
        else
            echo -e "${YELLOW}⚠ No uploads found to backup${NC}"
        fi
    fi
}

# Create a compressed archive of the backup
create_archive() {
    echo -e "\n${GREEN}Creating compressed archive...${NC}"
    
    cd "$BACKUP_DIR"
    
    # Check if there are files to archive
    if ls migration_${TIMESTAMP}.db 2>/dev/null || ls -d uploads_${TIMESTAMP} 2>/dev/null; then
        tar -czf "dc_countdown_backup_${TIMESTAMP}.tar.gz" \
            migration_${TIMESTAMP}.db \
            uploads_${TIMESTAMP} 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Archive created: dc_countdown_backup_${TIMESTAMP}.tar.gz${NC}"
            
            # Clean up individual files after successful archive
            rm -f migration_${TIMESTAMP}.db
            rm -rf uploads_${TIMESTAMP}
            
            # Show archive size
            SIZE=$(du -h "dc_countdown_backup_${TIMESTAMP}.tar.gz" | cut -f1)
            echo -e "${GREEN}Archive size: ${SIZE}${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ No files to archive${NC}"
    fi
    
    cd - > /dev/null
}

# Clean up old backups (keep last 10)
cleanup_old_backups() {
    echo -e "\n${GREEN}Cleaning up old backups...${NC}"
    
    cd "$BACKUP_DIR"
    
    # Count backup files
    BACKUP_COUNT=$(ls -1 dc_countdown_backup_*.tar.gz 2>/dev/null | wc -l)
    
    if [ $BACKUP_COUNT -gt 10 ]; then
        # Delete oldest backups, keeping only the 10 most recent
        ls -1t dc_countdown_backup_*.tar.gz | tail -n +11 | xargs rm -f
        DELETED=$((BACKUP_COUNT - 10))
        echo -e "${GREEN}✓ Deleted ${DELETED} old backup(s)${NC}"
    else
        echo -e "${GREEN}✓ No cleanup needed (${BACKUP_COUNT} backups exist)${NC}"
    fi
    
    cd - > /dev/null
}

# List existing backups
list_backups() {
    echo -e "\n${GREEN}Existing backups:${NC}"
    ls -lh "$BACKUP_DIR"/dc_countdown_backup_*.tar.gz 2>/dev/null || echo "No backups found"
}

# Main execution
main() {
    backup_database
    backup_uploads
    create_archive
    cleanup_old_backups
    list_backups
    
    echo -e "\n${GREEN}Backup completed at $(date)${NC}"
}

# Run main function
main