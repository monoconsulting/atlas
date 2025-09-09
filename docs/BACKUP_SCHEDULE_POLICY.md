# Atlas Backup Schedule and Retention Policy

## Backup Schedule Configuration

### Primary Automated Schedule
- **Frequency**: Daily
- **Time**: 02:00 local time (server timezone)
- **Cron Expression**: `0 2 * * *`
- **Rationale**: 02:00 chosen to minimize impact on system usage and maintenance windows

### Manual Backup Triggers
- **Availability**: 24/7 via Atlas UI
- **Use Cases**:
  - Pre-deployment backups
  - Before major configuration changes
  - Before system maintenance
  - On-demand data protection

### Backup Window Constraints
- **Maximum Duration**: 30 minutes
- **Timeout**: Backup process will be terminated if exceeding 45 minutes
- **Resource Limits**: CPU and I/O throttling to prevent system impact
- **Concurrent Backups**: Maximum 1 backup process at a time

## Retention Policy Details

### Retention Rules (GFS - Grandfather-Father-Son)

#### Daily Backups (Son)
- **Retention**: 7 days
- **Storage**: Keep all daily backups for the past week
- **Cleanup**: Automatic deletion of backups older than 7 days

#### Weekly Backups (Father)
- **Retention**: 4 weeks
- **Selection**: Sunday backup retained as weekly backup
- **Storage**: Keep 4 Sunday backups (covering 1 month)
- **Cleanup**: Automatic deletion of weekly backups older than 4 weeks

#### Monthly Backups (Grandfather)
- **Retention**: 6 months
- **Selection**: First Sunday of each month retained as monthly backup
- **Storage**: Keep 6 monthly backups (covering 6 months)
- **Cleanup**: Automatic deletion of monthly backups older than 6 months

#### Yearly Backups (Great-Grandfather)
- **Retention**: 2 years
- **Selection**: First Sunday of January retained as yearly backup
- **Storage**: Keep 2 yearly backups
- **Cleanup**: Automatic deletion of yearly backups older than 2 years

### Retention Implementation
```bash
# Restic retention command
restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --keep-yearly 2 \
  --prune
```

## Storage Estimation

### Baseline Storage Requirements
- **Initial Full Backup**: ~500MB (estimated project size)
- **Daily Incremental**: ~10-50MB (depending on changes)
- **With Deduplication**: 30-50% reduction in storage

### Storage Growth Projection
- **Week 1**: 500MB + (7 × 20MB) = ~640MB
- **Month 1**: 640MB + (4 × 80MB) = ~960MB  
- **6 Months**: ~3GB total storage required
- **2 Years**: ~6GB maximum storage required

### Storage Monitoring Thresholds
- **Warning**: Storage usage > 80% of allocated space
- **Critical**: Storage usage > 95% of allocated space
- **Action**: Automatic cleanup of oldest backups if critical threshold reached

## Backup Verification Schedule

### Post-Backup Verification
- **Frequency**: After every backup
- **Method**: `restic check --read-data-subset=5%`
- **Duration**: ~2-5 minutes additional time
- **Failure Action**: Alert administrators immediately

### Comprehensive Verification
- **Frequency**: Weekly (Sunday after backup)
- **Method**: `restic check --read-data`
- **Duration**: ~10-15 minutes
- **Failure Action**: Critical alert and backup status page warning

### Test Restore Verification
- **Frequency**: Monthly (first Sunday)
- **Method**: Random file restore test
- **Scope**: 10-20 random files from latest backup
- **Success Criteria**: All files restored without corruption

## Schedule Modification Procedures

### Emergency Schedule Changes
- **Authority**: System administrators only
- **Method**: Docker container environment variable update
- **Approval**: None required for emergency changes
- **Documentation**: Must be logged in backup system

### Planned Schedule Changes
- **Authority**: System administrators and project managers
- **Process**: 
  1. Document change request
  2. Update backup configuration
  3. Test new schedule in staging
  4. Deploy to production
  5. Monitor for 1 week
- **Rollback**: Previous schedule configuration preserved

### Notification of Schedule Changes
- **Internal**: Atlas UI notification
- **External**: Email to administrators
- **Timeline**: 24 hours advance notice when possible

## Compliance and Audit Requirements

### Backup Audit Trail
- **Logging**: All backup operations logged with timestamps
- **Retention**: Backup logs retained for 1 year
- **Access**: Audit logs accessible via Atlas UI and container logs

### Recovery Time Objective (RTO)
- **Target**: 4 hours maximum for full system restore
- **Components**:
  - Backup retrieval: 30 minutes
  - System rebuild: 2 hours
  - Data restore: 1 hour
  - Verification: 30 minutes

### Recovery Point Objective (RPO)
- **Target**: Maximum 24 hours data loss
- **Daily Backups**: Ensure RPO compliance
- **Critical Changes**: Manual backup before major changes

## Disaster Recovery Integration

### Backup Storage Redundancy
- **Primary**: Local storage volume
- **Secondary**: (Future) Cloud storage sync
- **Geographic**: (Future) Off-site backup replication

### Recovery Scenarios
1. **Single File Recovery**: 5 minutes
2. **Database Recovery**: 30 minutes
3. **Full System Recovery**: 4 hours
4. **Site Disaster Recovery**: 24 hours (with off-site backups)

---

**Policy Version**: 1.0  
**Effective Date**: 2025-09-09  
**Review Schedule**: Quarterly  
**Next Review**: 2025-12-09  
**Approved By**: Atlas Backup Implementation Task 55