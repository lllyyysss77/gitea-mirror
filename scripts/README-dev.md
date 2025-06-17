# Development Environment Setup

This directory contains scripts to help set up a development environment with a pre-configured Gitea instance.

## Default Credentials

For development convenience, the Gitea instance is pre-configured with:

- **Admin Username**: `admin`
- **Admin Password**: `admin123`
- **Gitea URL**: http://localhost:3001

## Files

- `gitea-app.ini` - Pre-configured Gitea settings for development
- `gitea-dev-init.sh` - Initialization script that copies the config on first run
- `gitea-init.sql` - SQL script to create default admin user (not currently used)

## Usage

1. Start the development environment:
   ```bash
   docker compose -f docker-compose.dev.yml down
   docker volume rm gitea-mirror_gitea-data gitea-mirror_gitea-config
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Wait for Gitea to start (check logs):
   ```bash
   docker logs -f gitea
   ```

3. Access Gitea at http://localhost:3001 and login with:
   - Username: `admin`
   - Password: `admin123`

4. Generate an API token:
   - Go to Settings → Applications
   - Generate New Token
   - Give it a name like "gitea-mirror"
   - Select all permissions (for development)
   - Copy the token

5. Configure gitea-mirror with the token in your `.env` file or through the web UI.

## Troubleshooting

If Gitea doesn't start properly:

1. Check logs: `docker logs gitea`
2. Ensure volumes are clean: `docker volume rm gitea-mirror_gitea-data gitea-mirror_gitea-config`
3. Restart: `docker compose -f docker-compose.dev.yml up -d`

## Security Note

⚠️ **These credentials are for development only!** Never use these settings in production.