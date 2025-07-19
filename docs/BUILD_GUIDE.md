# Build Guide

This guide covers building the open-source version of Gitea Mirror.

## Prerequisites

- **Bun** >= 1.2.9 (primary runtime)
- **Node.js** >= 20 (for compatibility)
- **Git**

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/gitea-mirror.git
cd gitea-mirror

# Install dependencies
bun install

# Initialize database
bun run init-db

# Build for production
bun run build

# Start the application
bun run start
```

## Build Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Production build |
| `bun run dev` | Development server |
| `bun run preview` | Preview production build |
| `bun test` | Run tests |
| `bun run cleanup-db` | Remove database files |

## Build Output

The build creates:
- `dist/` - Production-ready server files
- `.astro/` - Build cache (git-ignored)
- `data/` - SQLite database location

## Development Build

For active development with hot reload:

```bash
bun run dev
```

Access the application at http://localhost:4321

## Production Build

```bash
# Build
bun run build

# Test the build
bun run preview

# Run in production
bun run start
```

## Docker Build

```dockerfile
# Build Docker image
docker build -t gitea-mirror:latest .

# Run container
docker run -p 3000:3000 gitea-mirror:latest
```

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_PATH=./data/gitea-mirror.db

# Authentication
JWT_SECRET=your-secret-here

# GitHub Configuration
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=...
GITHUB_EXCLUDED_ORGS=org1,org2,org3  # Optional: Comma-separated list of organizations to exclude from sync

# Gitea Configuration
GITEA_URL=https://your-gitea.com
GITEA_TOKEN=...
```

## Common Build Issues

### Missing Dependencies

```bash
# Solution
bun install
```

### Database Not Initialized

```bash
# Solution
bun run init-db
```

### Port Already in Use

```bash
# Change port
PORT=3001 bun run dev
```

### Build Cache Issues

```bash
# Clear cache
rm -rf .astro/ dist/
bun run build
```

## Build Optimization

### Development Speed

- Use `bun run dev` for hot reload
- Skip type checking during rapid development
- Keep `.astro/` cache between builds

### Production Optimization

- Minification enabled automatically
- Tree shaking removes unused code
- Image optimization with Sharp

## Validation

After building, verify:

```bash
# Check build output
ls -la dist/

# Test server starts
bun run start

# Check health endpoint
curl http://localhost:3000/api/health
```

## CI/CD Build

Example GitHub Actions workflow:

```yaml
name: Build and Test
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
      - run: bun test
```

## Troubleshooting

### Build Fails

1. Check Bun version: `bun --version`
2. Clear dependencies: `rm -rf node_modules && bun install`
3. Check for syntax errors: `bunx tsc --noEmit`

### Runtime Errors

1. Check environment variables
2. Verify database exists
3. Check file permissions

## Performance

Expected build times:
- Clean build: ~5-10 seconds
- Incremental build: ~2-5 seconds
- Development startup: ~1-2 seconds

## Next Steps

- Configure with [Configuration Guide](./CONFIGURATION.md)
- Deploy with [Deployment Guide](./DEPLOYMENT.md)
- Set up authentication with [SSO Guide](./SSO-OIDC-SETUP.md)
