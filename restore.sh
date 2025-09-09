#!/bin/bash

# DC Countdown Restore Script
# Restores databases and uploads from backup archives

# Configuration
BACKUP_DIR="./backups"
CONTAINER_NAME="dc-countdown-dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to list available backups
list_backups() {
    echo -e "${GREEN}Available backups:${NC}"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}Backup directory not found!${NC}"
        exit 1
    fi
    
    BACKUPS=($(ls -1t "$BACKUP_DIR"/dc_countdown_backup_*.tar.gz 2>/dev/null))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}No backups found!${NC}"
        exit 1
    fi
    
    for i in "${!BACKUPS[@]}"; do
        BACKUP_FILE=$(basename "${BACKUPS[$i]}")
        SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
        echo -e "${BLUE}[$((i+1))]${NC} ${BACKUP_FILE} (${SIZE})"
    done
    
    echo ""
}

# Function to select backup
select_backup() {
    BACKUPS=($(ls -1t "$BACKUP_DIR"/dc_countdown_backup_*.tar.gz 2>/dev/null))
    
    if [ "$1" != "" ]; then
        # Backup file specified as argument
        if [ -f "$1" ]; then
            SELECTED_BACKUP="$1"
        elif [ -f "$BACKUP_DIR/$1" ]; then
            SELECTED_BACKUP="$BACKUP_DIR/$1"
        else
            echo -e "${RED}Specified backup file not found: $1${NC}"
            exit 1
        fi
    else
        # Interactive selection
        list_backups
        
        echo -n "Select backup to restore (1-${#BACKUPS[@]}), or 'q' to quit: "
        read -r selection
        
        if [ "$selection" = "q" ]; then
            echo "Restore cancelled."
            exit 0
        fi
        
        if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#BACKUPS[@]} ]; then
            echo -e "${RED}Invalid selection!${NC}"
            exit 1
        fi
        
        SELECTED_BACKUP="${BACKUPS[$((selection-1))]}"
    fi
    
    echo -e "${GREEN}Selected backup: $(basename "$SELECTED_BACKUP")${NC}"
}

# Function to check if container is running
check_container() {
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        return 0
    fi
    return 1
}

# Function to stop container
stop_container() {
    if check_container; then
        echo -e "${YELLOW}Stopping container ${CONTAINER_NAME}...${NC}"
        docker-compose -f docker-compose.dev.yml stop app
        sleep 2
    fi
}

# Function to start container
start_container() {
    echo -e "${GREEN}Starting container ${CONTAINER_NAME}...${NC}"
    docker-compose -f docker-compose.dev.yml up -d app
    sleep 3
}

# Function to extract backup
extract_backup() {
    echo -e "${GREEN}Extracting backup...${NC}"
    
    TEMP_DIR="/tmp/dc_restore_$$"
    mkdir -p "$TEMP_DIR"
    
    tar -xzf "$SELECTED_BACKUP" -C "$TEMP_DIR"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to extract backup!${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Backup extracted${NC}"
}

# Function to restore database
restore_database() {
    echo -e "${GREEN}Restoring database...${NC}"
    
    DB_FILE=$(find "$TEMP_DIR" -name "migration_*.db" -type f | head -1)
    
    if [ -z "$DB_FILE" ]; then
        echo -e "${YELLOW}⚠ No database found in backup${NC}"
        return
    fi
    
    # Use a temporary container to restore to volume
    docker run --rm \
        -v dc-countdown_db-data:/data \
        -v "$DB_FILE:/restore.db" \
        alpine sh -c "cp /restore.db /data/migration.db && chmod 644 /data/migration.db"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database restored${NC}"
    else
        echo -e "${RED}✗ Failed to restore database${NC}"
        return 1
    fi
}

# Function to restore uploads
restore_uploads() {
    echo -e "${GREEN}Restoring uploads...${NC}"
    
    UPLOADS_DIR=$(find "$TEMP_DIR" -name "uploads_*" -type d | head -1)
    
    if [ -z "$UPLOADS_DIR" ]; then
        echo -e "${YELLOW}⚠ No uploads found in backup${NC}"
        return
    fi
    
    # Clear existing uploads and restore from backup
    docker run --rm \
        -v dc-countdown_uploads-data:/uploads \
        -v "$UPLOADS_DIR:/restore" \
        alpine sh -c "rm -rf /uploads/* && cp -r /restore/* /uploads/ 2>/dev/null"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploads restored${NC}"
    else
        echo -e "${YELLOW}⚠ Uploads restore completed (directory may have been empty)${NC}"
    fi
}

# Function to cleanup
cleanup() {
    echo -e "${GREEN}Cleaning up temporary files...${NC}"
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Function to confirm restore
confirm_restore() {
    echo -e "${YELLOW}⚠ WARNING: This will overwrite the current database and uploads!${NC}"
    echo -n "Are you sure you want to continue? (yes/no): "
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi
}

# Main execution
main() {
    echo -e "${GREEN}DC Countdown Restore Utility${NC}"
    echo "================================"
    
    # Select backup
    select_backup "$1"
    
    # Confirm restore
    confirm_restore
    
    # Stop container if running
    stop_container
    
    # Extract backup
    extract_backup
    
    # Restore database
    restore_database
    
    # Restore uploads
    restore_uploads
    
    # Cleanup
    cleanup
    
    # Start container
    start_container
    
    echo -e "\n${GREEN}✓ Restore completed successfully!${NC}"
    echo -e "${GREEN}The application should now be running with the restored data.${NC}"
}

# Run main function
main "$@"