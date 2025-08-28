phpMyAdmin for TaskmasterWeb

Access:
- Open http://localhost:8085 in your browser to reach phpMyAdmin.

Default connection settings (from docker-compose.yml / .env):
- Host: mysql (the Docker service name)
- Port: 3306
- Root user: root
- Root password: read from MYSQL_ROOT_PASSWORD env var (default: rootpassword)
- Database: taskmaster (default)
- User: tmuser (default)
- Password: tmpassword (default)

If you use an `.env` file, ensure the same credentials are present there so phpMyAdmin can connect. To (re)start the services:

For PowerShell (from repository root):

    docker-compose up -d --build

If you changed compose or env values, recreate containers with:

    docker-compose down
    docker-compose up -d --build

Then visit http://localhost:8085 and login with the desired DB user (for administration use the root user and the MYSQL_ROOT_PASSWORD).
