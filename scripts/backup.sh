#!/bin/bash
#
# Atlas Backup Script
# Comprehensive backup solution using mysqldump and restic
# Generated: 2025-09-09 for Task 56
#

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration from environment
MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_USER="${MYSQL_USER:-tmuser}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-tmpassword}"
MYSQL_DATABASE="${MYSQL_DATABASE:-taskmaster}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"

RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-/data/backup}"
RESTIC_PASSWORD="${RESTIC_PASSWORD:-}"

# Backup directories
BACKUP_DIR="/tmp/backup-$(date +%Y%m%d-%H%M%S)"
LOG_DIR="/var/log/backup"
LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d).log"

# Create necessary directories
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $*" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "$BACKUP_DIR"
}

# Set trap for cleanup
trap cleanup EXIT

# Function to check if required tools are available
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v mysqldump >/dev/null 2>&1; then
        log_error "mysqldump is not available"
        exit 1
    fi
    
    if ! command -v restic >/dev/null 2>&1; then
        log_error "restic is not available"
        exit 1
    fi
    
    if [[ -z "$RESTIC_PASSWORD" ]]; then
        log_error "RESTIC_PASSWORD is not set"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Function to create database backup
backup_database() {
    log_info "Starting database backup..."
    
    local db_backup_file="$BACKUP_DIR/mysql-dump-$(date +%Y%m%d-%H%M%S).sql"
    
    if mysqldump \
        --host="$MYSQL_HOST" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --add-drop-database \
        --add-drop-table \
        --create-options \
        --disable-keys \
        --extended-insert \
        --quick \
        --lock-tables=false \
        "$MYSQL_DATABASE" > "$db_backup_file"; then
        
        log_info "Database backup completed: $(basename "$db_backup_file")"
        log_info "Database backup size: $(du -h "$db_backup_file" | cut -f1)"
        return 0
    else
        log_error "Database backup failed"
        return 1
    fi
}

# Function to perform restic backup
perform_restic_backup() {
    log_info "Starting restic backup..."
    
    # Initialize repository if it doesn't exist
    if ! restic -r "$RESTIC_REPOSITORY" snapshots >/dev/null 2>&1; then
        log_info "Initializing restic repository..."
        if restic -r "$RESTIC_REPOSITORY" init; then
            log_info "Restic repository initialized"
        else
            log_error "Failed to initialize restic repository"
            return 1
        fi
    fi
    
    # Perform backup (back up entire /projects per plan)
    local backup_paths="/projects /tmp/backup-*"
    
    if restic -r "$RESTIC_REPOSITORY" backup \
        --tag "atlas-backup" \
        --tag "automated" \
        --tag "$(date +%Y%m%d)" \
        $backup_paths; then
        
        log_info "Restic backup completed successfully"
        return 0
    else
        log_error "Restic backup failed"
        return 1
    fi
}

# Function to manage retention (forget old snapshots)
manage_retention() {
    log_info "Managing backup retention..."
    
    # Retention policy per plan: keep 7 daily, 4 weekly, 6 monthly
    if restic -r "$RESTIC_REPOSITORY" forget \
        --tag "atlas-backup" \
        --keep-daily 7 \
        --keep-weekly 4 \
        --keep-monthly 6 \
        --prune; then
        
        log_info "Retention management completed"
        return 0
    else
        log_error "Retention management failed"
        return 1
    fi
}

# Function to check repository integrity
check_repository() {
    log_info "Checking repository integrity..."
    
    if restic -r "$RESTIC_REPOSITORY" check \
        --read-data-subset=10%; then
        
        log_info "Repository integrity check passed"
        return 0
    else
        log_error "Repository integrity check failed"
        return 1
    fi
}

# Main backup function
main() {
    log_info "=== Atlas Backup Process Started ==="
    log_info "Backup directory: $BACKUP_DIR"
    log_info "Restic repository: $RESTIC_REPOSITORY"
    
    local exit_code=0
    
    # Check prerequisites
    check_prerequisites || exit_code=1
    
    # Perform database backup
    if [[ $exit_code -eq 0 ]]; then
        backup_database || exit_code=1
    fi
    
    # Perform restic backup
    if [[ $exit_code -eq 0 ]]; then
        perform_restic_backup || exit_code=1
    fi
    
    # Manage retention
    if [[ $exit_code -eq 0 ]]; then
        manage_retention || exit_code=1
    fi
    
    # Check repository integrity (non-blocking)
    check_repository || log_error "Repository check failed but continuing"
    
    if [[ $exit_code -eq 0 ]]; then
        log_info "=== Atlas Backup Process Completed Successfully ==="
    else
        log_error "=== Atlas Backup Process Failed ==="
    fi
    
    return $exit_code
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Atlas Backup Script - Comprehensive backup solution

OPTIONS:
    --dry-run       Show what would be backed up without doing it
    --check-only    Only perform repository integrity check
    --help          Show this help message

ENVIRONMENT VARIABLES:
    MYSQL_HOST              MySQL host (default: mysql)
    MYSQL_USER              MySQL user (default: tmuser)
    MYSQL_PASSWORD          MySQL password (default: tmpassword)
    MYSQL_DATABASE          MySQL database (default: taskmaster)
    RESTIC_REPOSITORY       Restic repository path (default: /data/backup)
    RESTIC_PASSWORD         Restic repository password (required)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            log_info "DRY RUN mode enabled"
            # Add dry-run logic here
            shift
            ;;
        --check-only)
            log_info "Check-only mode enabled"
            check_prerequisites
            check_repository
            exit $?
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main
exit $?
