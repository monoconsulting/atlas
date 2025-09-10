# Atlas Backup Requirements Documentation

## Overview
This document outlines the backup requirements for the Atlas Task Management System, including data identification, backup schedule, retention policies, and engine selection.

## Data to be Backed Up

### 1. Project Data
- **Location**: `E:\projects\atlas` (host) / `/projects/atlas` (container)
- **Contents**:
  - Application source code (`app/`, `web/`, `mcp-server-taskmaster/`)
  - Configuration files (`docker-compose.yml`, `.env`, `CLAUDE.md`)
  - Documentation (`docs/`, `README.md`, `CLAUDE.md`)
  - Task Master data (`.taskmaster/`)
  - Test files and reports (`test-results/`, `web/test-reports/`)
  - Scripts and utilities (`scripts/`)

### 2. Database Data
- **MySQL Database**: Contains project configurations, SonarQube tokens, and port mappings
- **Location**: Docker volume `atlas_mysql_data`
- **Backup Method**: Database dump via `mysqldump` before file backup

### 3. Configuration Data
- **Docker Compose configurations**: `docker-compose.yml`, `docker-compose.override.yml`
- **Environment files**: `.env` (excluding sensitive credentials)
- **Application configs**: All configuration files in `app/`, `web/`

### 4. Generated and Runtime Data
- **Test reports**: `web/test-reports/`, test result files
- **Build artifacts**: Compiled assets, generated files
- **Logs**: Application logs, backup logs

### 5. Excluded from Backup
- **Temporary files**: `.tmp_*`, `node_modules/`, `__pycache__/`
- **Git repository**: `.git/` (source is in GitHub)
- **Docker images**: Only data volumes, not images
- **Cache files**: `.pytest_cache/`, `.hypothesis/`
- **Sensitive credentials**: Direct credential files (will use encrypted environment handling)

## Backup Schedule and Retention Policy

### Schedule
- **Primary Backup**: Daily at 02:00 local time
- **Manual Backups**: Available on-demand via Atlas UI

### Retention Policy
- **Daily Backups**: Keep last 7 days
- **Weekly Backups**: Keep last 4 weeks (retain Sunday backups)
- **Monthly Backups**: Keep last 6 months (retain first Sunday of month)
- **Yearly Backups**: Keep last 2 years (retain first Sunday of January)

### Backup Windows
- **Maximum Duration**: 30 minutes for full backup
- **Acceptable Downtime**: None (read-only backups)
- **Storage Growth**: Estimated 50-100MB per backup with deduplication

## Backup Engine Selection: Restic

### Why Restic?
1. **Deduplication**: Reduces storage requirements by identifying duplicate data
2. **Encryption**: All backups encrypted at rest with AES-256
3. **Multiple Backends**: Supports local storage, S3, and other cloud providers
4. **Single Binary**: Easy to containerize and deploy
5. **Incremental**: Only backs up changed files
6. **Verification**: Built-in integrity checking

### Restic Configuration
- **Repository Location**: `/data/backup` (container) / `./backups` (host)
- **Encryption**: Password-based encryption
- **Verification**: `restic check` after each backup
- **Pruning**: Automatic cleanup based on retention policy

## Storage Requirements

### Local Storage
- **Initial**: 1GB for first full backup
- **Growth**: ~10MB per day with deduplication
- **Annual**: Estimated 3-4GB total storage needed

### Backup Repository Structure
```
/data/backup/
├── config
├── data/
├── index/
├── keys/
├── locks/
└── snapshots/
```

## Security Considerations

### Encryption
- **Repository Password**: Strong generated password (32 characters)
- **Storage**: Password stored in Docker secrets/environment variables
- **Access**: Only backup container has repository access

### Access Control
- **File Permissions**: Read-only access to source data
- **Network**: No external access to backup container
- **API**: Backup triggers only via authenticated Atlas API

## Verification and Testing

### Backup Verification
- **Integrity Check**: `restic check` after each backup
- **Snapshot Listing**: Verify snapshots are created
- **Log Analysis**: Check for backup completion and errors

### Restore Testing
- **Frequency**: Monthly test restores
- **Scope**: Random file sampling and database dump verification
- **Documentation**: Restore procedures documented

## Monitoring and Alerting

### Success Monitoring
- **Atlas UI**: Backup status page shows last successful backup
- **Logs**: Detailed logging of all backup operations
- **Metrics**: Backup size, duration, file count tracking

### Failure Alerting
- **Immediate**: Failed backup triggers Atlas UI notification
- **Email**: Optional email alerts for backup failures
- **Persistence**: Failed backup status remains until resolved

## Implementation Notes

### Backup Script Requirements
- Pre-backup database dump
- File system backup with exclusions
- Post-backup verification
- Retention policy enforcement
- Comprehensive logging

### Container Integration
- Dedicated `atlas-backup` container
- Read-only mounts for data sources
- Shared volume for backup repository
- Cron scheduling for automated backups
- HTTP API for manual triggers

---

**Document Version**: 1.0  
**Created**: 2025-09-09  
**Last Updated**: 2025-09-09  
**Author**: Atlas Backup Implementation Task 55