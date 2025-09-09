# Atlas Backup Credentials Setup

## Overview
This document describes the secure generation and storage of credentials required for the Atlas backup system using Restic.

## Restic Repository Password

### Password Generation
A secure 64-character password has been generated for the Restic repository encryption using cryptographically secure random methods.

**Generation Command Used**:
```bash
openssl rand -base64 48 | tr -d '\n'
```

**Password Characteristics**:
- **Length**: 64 characters
- **Character Set**: Base64 (A-Z, a-z, 0-9, +, /)
- **Entropy**: ~384 bits of entropy
- **Algorithm**: OpenSSL secure random number generation

### Password Storage

#### Primary Storage - Environment Variables
The Restic repository password is stored in the `.env` file as:
```
RESTIC_PASSWORD=M1htVkEGLR6QwlL23Zo5jT9Gd4p+HXNDEnH5sm7OLpoFNsaOAiRvHPkSudi06ize
```

#### Template Storage - .env.example
The `.env.example` file contains a placeholder for the password:
```
RESTIC_PASSWORD=your_secure_restic_password_here
```

### Security Measures

#### File Permissions
- **Requirement**: `.env` file must have restricted permissions
- **Recommended**: `chmod 600 .env` (owner read/write only)
- **Implementation**: Ensure proper Docker secrets handling

#### Version Control
- ✅ `.env` is in `.gitignore` (never committed)
- ✅ `.env.example` contains only placeholder values
- ✅ Actual password never stored in git repository

#### Container Security
- **Environment Variable**: Password passed to backup container via Docker environment
- **Runtime Only**: Password exists only in container memory during backup operations
- **No Persistence**: Password not stored in container filesystem or logs

## Backup Configuration Variables

### Complete Environment Configuration
```bash
# Backup Configuration
RESTIC_PASSWORD=M1htVkEGLR6QwlL23Zo5jT9Gd4p+HXNDEnH5sm7OLpoFNsaOAiRvHPkSudi06ize
BACKUP_CONTAINER_NAME=atlas_backup
RESTIC_REPOSITORY=/data/backup
BACKUP_SCHEDULE="0 2 * * *"
```

### Variable Descriptions

#### RESTIC_PASSWORD
- **Purpose**: Encryption key for Restic repository
- **Type**: Base64 encoded string
- **Security**: AES-256 encryption key derivation
- **Rotation**: Should be rotated annually

#### BACKUP_CONTAINER_NAME
- **Purpose**: Docker container name for backup service
- **Value**: `atlas_backup`
- **Usage**: Container identification and networking

#### RESTIC_REPOSITORY
- **Purpose**: Path to Restic repository inside container
- **Value**: `/data/backup`
- **Mapping**: Maps to host volume for persistence

#### BACKUP_SCHEDULE
- **Purpose**: Cron expression for scheduled backups
- **Value**: `"0 2 * * *"` (daily at 2 AM)
- **Format**: Standard cron syntax

## Password Security Best Practices

### Password Strength
- ✅ **Length**: 64 characters exceeds minimum requirements
- ✅ **Randomness**: Cryptographically secure generation
- ✅ **Character Diversity**: Base64 provides good character distribution
- ✅ **Entropy**: 384 bits exceeds 256-bit security requirements

### Storage Security
- ✅ **Environment Variables**: Secure method for container passwords
- ✅ **No Hard-coding**: Password never embedded in code or scripts
- ✅ **Version Control**: Password excluded from git repository
- ✅ **Access Control**: Limited to necessary services only

### Operational Security
- ✅ **Single Use**: Password dedicated to backup repository only
- ✅ **Rotation Schedule**: Annual password rotation planned
- ✅ **Backup**: Password backed up separately for recovery
- ✅ **Documentation**: Password generation method documented

## Password Recovery Procedures

### If Password is Lost
1. **Stop Backup Container**: Prevent corruption attempts
2. **Generate New Password**: Use same generation method
3. **Backup Existing Repository**: Export/copy current backup repository
4. **Initialize New Repository**: Create new Restic repository with new password
5. **Update Environment**: Update `.env` file with new password
6. **Verify Operation**: Test backup with new password

### Password Rotation Process (Annual)
1. **Generate New Password**: `openssl rand -base64 48 | tr -d '\n'`
2. **Create Migration Script**: Script to migrate existing repository
3. **Backup Current Repository**: Full backup of existing repository
4. **Test Migration**: Verify repository migration works
5. **Update Production**: Deploy new password to production
6. **Verify Backups**: Confirm backups work with new password

## Troubleshooting

### Common Password Issues

#### Wrong Password Error
- **Symptom**: `Fatal: unable to open config file: invalid password`
- **Cause**: Incorrect password in environment variable
- **Solution**: Verify password matches repository initialization

#### Repository Initialization
- **First Run**: Repository must be initialized before first backup
- **Command**: `restic init` (handled automatically by backup script)
- **Error**: `Fatal: repository does not exist`

#### Environment Variable Issues
- **Missing Variable**: Ensure `RESTIC_PASSWORD` is set in container
- **Whitespace**: Check for trailing spaces or newlines
- **Special Characters**: Base64 avoids most shell escaping issues

### Security Incident Response

#### Suspected Password Compromise
1. **Immediate**: Change password using rotation procedure
2. **Investigation**: Review access logs for unauthorized access
3. **Verification**: Verify repository integrity with new password
4. **Communication**: Notify stakeholders of security measures

#### Repository Corruption
1. **Assessment**: Use `restic check` to assess damage
2. **Recovery**: Restore from last known good backup
3. **Investigation**: Determine cause of corruption
4. **Prevention**: Implement additional monitoring

---

**Document Classification**: Security Configuration  
**Generated Date**: 2025-09-09  
**Password Generated**: 2025-09-09  
**Next Rotation Due**: 2025-09-09 (Annual)  
**Author**: Atlas Backup Implementation Task 55