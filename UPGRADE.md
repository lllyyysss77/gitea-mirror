# Upgrade Guide

## Upgrading to v3.0

> **⚠️ IMPORTANT**: v3.0 requires a fresh start. There is no automated migration from v2.x to v3.0.

### Why No Migration?

v3.0 introduces fundamental changes to the application architecture:
- **Authentication**: Switched from JWT to Better Auth
- **Database**: Now uses Drizzle ORM with proper migrations
- **Security**: All tokens are now encrypted
- **Features**: Added SSO support and OIDC provider functionality

Due to these extensive changes, we recommend starting fresh with v3.0 for the best experience.

### Upgrade Steps

1. **Stop your v2.x container**
   ```bash
   docker stop gitea-mirror
   docker rm gitea-mirror
   ```

2. **Backup your v2.x data (optional)**
   ```bash
   # If you want to keep your v2 data for reference
   docker run --rm -v gitea-mirror-data:/data -v $(pwd):/backup alpine tar czf /backup/gitea-mirror-v2-backup.tar.gz -C /data .
   ```

3. **Create a new volume for v3**
   ```bash
   docker volume create gitea-mirror-v3-data
   ```

4. **Run v3 with the new volume**
   ```bash
   docker run -d \
     --name gitea-mirror \
     -p 4321:4321 \
     -v gitea-mirror-v3-data:/app/data \
     -e BETTER_AUTH_SECRET=your-secret-key \
     -e ENCRYPTION_SECRET=your-encryption-key \
     arunavo4/gitea-mirror:latest
   ```

5. **Set up your configuration again**
   - Navigate to http://localhost:4321
   - Create a new admin account
   - Re-enter your GitHub and Gitea credentials
   - Configure your mirror settings

### What Happens to My Existing Mirrors?

Your existing mirrors in Gitea are **not affected**. The application will:
- Recognize existing repositories when you re-import
- Skip creating duplicates
- Resume normal mirror operations

### Environment Variable Changes

v3.0 uses different environment variables:

| v2.x | v3.0 | Notes |
|------|------|-------|
| `JWT_SECRET` | `BETTER_AUTH_SECRET` | Required for session management |
| - | `ENCRYPTION_SECRET` | New - required for token encryption |

### Need Help?

If you have questions about upgrading:
1. Check the [README](README.md) for v3 setup instructions
2. Review your v2 configuration before upgrading
3. Open an issue if you encounter problems