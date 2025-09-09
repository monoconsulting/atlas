---
date created: 2025-09-09 11:00:00
date modified: 2025-09-09 11:00:00
title: Atlas Backup Module Detailed Project Plan
version: 1.0
---

# Atlas Backup Module: Detailed Project Plan

This document provides a full, chronological project plan for implementing the Atlas Backup Module. The plan is broken down into phases, sprints, and atomic tasks with subtasks, suitable for import into a task management system.

## Phase 1: Core Engine & Container Setup

This phase focuses on establishing the foundational components of the backup system: selecting and preparing the backup engine (Restic), creating the backup script, and building the Docker container that will execute the backups.

### Sprint 1.1: Foundation and Scripting

**Task 1: Finalize Backup Requirements & Engine Setup**
- **Subtask 1.1:** Document the specific data to be backed up: `/projects` directory, `mysql-data` volume (via dump), and any other critical configuration files.
- **Subtask 1.2:** Define the backup schedule (nightly at 02:00) and retention policy (7 daily, 4 weekly, 6 monthly).
- **Subtask 1.3:** Formally adopt **Restic** as the backup engine.
- **Subtask 1.4:** Generate and securely store a strong password for the Restic repository in the project's secret management system.

**Task 2: Develop Core Backup Script**
- **Subtask 2.1:** Create a new script file: `scripts/backup.sh`.
- **Subtask 2.2:** Implement logging functionality within the script to output timestamped status messages.
- **Subtask 2.3:** Add a `mysqldump` command to the script to create a consistent database snapshot. The dump should be temporarily stored in a location that will be included in the backup.
- **Subtask 2.4:** Implement the `restic backup` command, targeting the `/projects` directory and the temporary database dump file.
- **Subtask 2.5:** Add error handling to capture the exit code from Restic and log failures appropriately.
- **Subtask 2.6:** Implement the `restic forget` and `restic prune` commands to enforce the defined retention policy.
- **Subtask 2.7:** Add a `restic check` command at the end of the script to verify repository integrity.

### Sprint 1.2: Containerization and Initial Testing

**Task 3: Create the Backup Service Dockerfile**
- **Subtask 3.1:** Create a new directory `services/atlas-backup/`.
- **Subtask 3.2:** Create a `Dockerfile` in the new directory, using `alpine:3.18` as the base image.
- **Subtask 3.3:** In the Dockerfile, add commands to install `restic`, `cron`, `mysql-client` (for mysqldump), and `curl`.
- **Subtask 3.4:** Copy the `scripts/backup.sh` script into the container's filesystem (e.g., to `/usr/local/bin/`).
- **Subtask 3.5:** Create a `crontab` file that defines the nightly schedule (`0 2 * * * /usr/local/bin/backup.sh`) and add it to the Docker image.
- **Subtask 3.6:** Set the container's `CMD` to start the `crond` service in the foreground.

**Task 4: Initial Container Build and Manual Test**
- **Subtask 4.1:** Build the `atlas-backup` Docker image.
- **Subtask 4.2:** Manually run the container, mounting a local test directory to `/projects` and another to `/backups`.
- **Subtask 4.3:** Execute the `backup.sh` script manually inside the container (`docker exec`).
- **Subtask 4.4:** Verify that a Restic repository is initialized and a snapshot is created in the `/backups` volume.
- **Subtask 4.5:** Inspect the script's log output for correctness and completeness.

## Phase 2: Atlas Integration

This phase focuses on integrating the new backup container with the existing Atlas ecosystem, including the Docker Compose setup and the Atlas Core backend application.

### Sprint 2.1: Backend and API Integration

**Task 5: Integrate Backup Service into Docker Compose**
- **Subtask 5.1:** Add the `atlas-backup` service to the main `docker-compose.yml` file.
- **Subtask 5.2:** Configure the service to use the built image and set `restart: unless-stopped`.
- **Subtask 5.3:** Mount the necessary volumes: `${PROJECTS_HOST_DIR}:/projects:ro`, a new `./backups:/backups` volume for the repository, and a shared `./logs:/logs` volume.
- **Subtask 5.4:** Add the service to the `web` network to allow communication with the `atlas` service.
- **Subtask 5.5:** Pass the `RESTIC_PASSWORD` and database credentials as environment variables from the `.env` file.

**Task 6: Implement Atlas Core API Endpoints**
- **Subtask 6.1:** In `app/main.py`, create a new API router for backup operations.
- **Subtask 6.2:** Create a `POST /api/backup/run` endpoint. This endpoint will use the Docker SDK (leveraging the already mounted docker.sock) to execute `backup.sh` inside the `atlas-backup` container. It should return immediately with a "Backup started" message.
- **Subtask 6.3:** Create a `GET /api/backup/status` endpoint that reads and parses the latest status from a shared log file in the `/logs` volume.
- **Subtask 6.4:** Create a `GET /api/backup/history` endpoint that returns a list of the last 10 backup runs by parsing the main log file.
- **Subtask 6.5:** Create a `GET /api/backup/log/{timestamp}` endpoint to retrieve the full log for a specific run.
- **Subtask 6.6:** Secure all backup endpoints to be accessible only by admin users.

### Sprint 2.2: Notifications and Verification

**Task 7: Implement Backend Notification Logic**
- **Subtask 7.1:** Modify the `backup.sh` script to write a structured JSON log entry to a `status.log` file upon completion (success or failure).
- **Subtask 7.2:** In Atlas Core, create a background task or use an existing mechanism to monitor `status.log`.
- **Subtask 7.3:** If a "failure" status is detected, trigger a notification (e.g., email, UI alert). The exact mechanism will depend on the existing notification capabilities of Atlas.

**Task 8: Full Integration Testing (Backend)**
- **Subtask 8.1:** Start the full stack with `docker compose up`.
- **Subtask 8.2:** Call the `POST /api/backup/run` endpoint and verify a backup is triggered and completes successfully.
- **Subtask 8.3:** Call the `GET /api/backup/status` and `GET /api/backup/history` endpoints and verify the response is correct.
- **Subtask 8.4:** Induce a failure (e.g., by providing a wrong DB password to the backup container) and trigger a run.
- **Subtask 8.5:** Verify that the failure is logged correctly, the API reports the failure, and a notification is sent.

## Phase 3: Frontend UI Implementation

This phase covers the creation of the user-facing interface within the Atlas web application for managing and monitoring backups.

### Sprint 3.1: UI Components and Data Display

**Task 9: Create the Backup Status Page**
- **Subtask 9.1:** Add a "Backup" link to the main navigation menu, visible only to admins.
- **Subtask 9.2:** Create the basic HTML and CSS structure for the Backup Status page, following the wireframe in the design document.
- **Subtask 9.3:** On page load, implement a JavaScript function to call the `GET /api/backup/status` and `GET /api/backup/history` endpoints.
- **Subtask 9.4:** Display the "Last Backup," "Next Scheduled," and "Backup Target" information.
- **Subtask 9.5:** Populate the "Recent Backups" history table with the fetched data, using conditional styling for success/failure statuses.

**Task 10: Implement Log Viewing Functionality**
- **Subtask 10.1:** Create a modal component for displaying log files.
- **Subtask 10.2:** Add a "View Log" button to each entry in the backup history table.
- **Subtask 10.3:** When the button is clicked, call the `GET /api/backup/log/{timestamp}` endpoint.
- **Subtask 10.4:** Display the returned log text within the modal in a readable, pre-formatted block.

### Sprint 3.2: User Interaction and Polish

**Task 11: Implement Manual Backup Trigger**
- **Subtask 11.1:** Add a click handler to the "Run Backup Now" button.
- **Subtask 11.2:** The handler should call the `POST /api/backup/run` endpoint.
- **Subtask 11.3:** Upon clicking, disable the button and show a "Backup in progress..." message to provide immediate feedback.
- **Subtask 11.4:** Implement a polling mechanism that calls the `/api/backup/status` endpoint every 5-10 seconds to check for completion.
- **Subtask 11.5:** Once the backup is complete, re-enable the button and refresh the history table and status summary.

**Task 12: UI Polish and Final Testing**
- **Subtask 12.1:** Handle edge cases, such as when no backups have run yet.
- **Subtask 12.2:** Ensure the UI is responsive and works on different screen sizes.
- **Subtask 12.3:** Add tooltips or info icons to explain different parts of the UI.
- **Subtask 12.4:** Conduct a full end-to-end test: trigger a backup from the UI, monitor its progress, view the history, and inspect the log.

## Phase 4: Deployment and Maintenance

This phase covers the final steps of deploying the feature, verifying its operation in a production-like environment, and establishing long-term maintenance procedures.

### Sprint 4.1: Production Deployment and Verification

**Task 13: Deploy to Production**
- **Subtask 13.1:** Merge the feature branch into the `dev` branch, and then to `main` (following project git flow).
- **Subtask 13.2:** Update the production `docker-compose.yml` and `.env` files.
- **Subtask 13.3:** Deploy the new version of the Atlas application.
- **Subtask 13.4:** Monitor container logs on startup to ensure all services, including `atlas-backup`, start correctly.

**Task 14: Initial Production Backup and Restore Test**
- **Subtask 14.1:** Trigger the first manual backup in the production environment using the UI.
- **Subtask 14.2:** Verify the backup completes successfully and the data is present in the production backup location.
- **Subtask 14.3:** Perform a test restore of a few critical files to a temporary location to ensure backup integrity. **This is a critical step.**
- **Subtask 14.4:** Allow the scheduled backup to run and verify its success the next day.

### Sprint 4.2: Documentation and Handover

**Task 15: Finalize Documentation**
- **Subtask 15.1:** Create a user guide for the Backup Module, explaining how to use the UI.
- **Subtask 15.2:** Create a maintenance and recovery guide for administrators, detailing the backup architecture, how to change settings, and the step-by-step process for a full disaster recovery.
- **Subtask 15.3:** Update the main `README.md` and any relevant system architecture documents to include the new backup service.

**Task 16: Project Completion**
- **Subtask 16.1:** Conduct a final review of the implemented feature against the original plan.
- **Subtask 16.2:** Close out all related tasks in the task management system.
