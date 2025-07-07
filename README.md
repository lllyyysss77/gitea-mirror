<p align="center">
  <img src=".github/assets/logo-no-bg.png" alt="Gitea Mirror Logo" width="120" />
  <h1>Gitea Mirror</h1>
  <p><i>Automatically mirror repositories from GitHub to your self-hosted Gitea instance.</i></p>
  <p align="center">
    <a href="https://github.com/RayLabsHQ/gitea-mirror/releases/latest"><img src="https://img.shields.io/github/v/tag/RayLabsHQ/gitea-mirror?label=release" alt="release"/></a>
    <a href="https://github.com/RayLabsHQ/gitea-mirror/actions/workflows/astro-build-test.yml"><img src="https://img.shields.io/github/actions/workflow/status/RayLabsHQ/gitea-mirror/astro-build-test.yml?branch=main" alt="build"/></a>
    <a href="https://github.com/RayLabsHQ/gitea-mirror/pkgs/container/gitea-mirror"><img src="https://img.shields.io/badge/ghcr.io-container-blue?logo=github" alt="container"/></a>
    <a href="https://github.com/RayLabsHQ/gitea-mirror/blob/main/LICENSE"><img src="https://img.shields.io/github/license/RayLabsHQ/gitea-mirror" alt="license"/></a>
  </p>
</p>

## 🚀 Quick Start

```bash
# Fastest way - using the simplified Docker setup
docker compose -f docker-compose.alt.yml up -d

# Access at http://localhost:4321
```

First user signup becomes admin. Configure GitHub and Gitea through the web interface!

<div align="center">
  <img src=".github/assets/dashboard.png" alt="Dashboard" width="79%" style="display: inline-block; vertical-align: top;"/>
  <img src=".github/assets/dashboard_mobile.png" alt="Dashboard Mobile" width="20%" style="display: inline-block; vertical-align: middle; padding-top: 10px;"/>
</div>

## ✨ Features

- 🔁 Mirror public, private, and starred GitHub repos to Gitea
- 🏢 Mirror entire organizations with flexible strategies
- 🎯 Custom destination control for repos and organizations
- 🔐 Secure authentication with JWT tokens
- 📊 Real-time dashboard with activity logs
- ⏱️ Scheduled automatic mirroring
- 🐳 Dockerized with multi-arch support (AMD64/ARM64)

## 📸 Screenshots

<div align="center">
  <img src=".github/assets/repositories.png" alt="Repositories" width="79%" style="display: inline-block; vertical-align: top;"/>
  <img src=".github/assets/repositories_mobile.png" alt="Rrepositories Mobile" width="20%" style="display: inline-block; vertical-align: middle; padding-top: 10px;"/>
</div>

<div align="center">
  <img src=".github/assets/organisation.png" alt="Organisations" width="79%" style="display: inline-block; vertical-align: top;"/>
  <img src=".github/assets/organisation_mobile.png" alt="Organisations Mobile" width="20%" style="display: inline-block; vertical-align: middle; padding-top: 10px;"/>
</div>

## Installation

### Docker (Recommended)

We provide two Docker Compose options:

#### Option 1: Quick Start (docker-compose.alt.yml)
Perfect for trying out Gitea Mirror or simple deployments:

```bash
# Clone repository
git clone https://github.com/RayLabsHQ/gitea-mirror.git
cd gitea-mirror

# Start with simplified setup
docker compose -f docker-compose.alt.yml up -d

# Access at http://localhost:4321
```

**Features:**
- ✅ Pre-built image - no building required
- ✅ Minimal configuration needed
- ✅ Data stored in `./data` directory
- ✅ Configure everything through web UI
- ✅ Automatic user/group ID mapping

**Best for:**
- First-time users
- Testing and evaluation
- Simple deployments
- When you prefer web-based configuration

#### Option 2: Full Setup (docker-compose.yml)
For production deployments with environment-based configuration:

```bash
# Start with full configuration options
docker compose up -d
```

**Features:**
- ✅ Build from source or use pre-built image
- ✅ Complete environment variable configuration
- ✅ Support for custom CA certificates
- ✅ Advanced mirror settings (forks, wiki, issues)
- ✅ Multi-registry support

**Best for:**
- Production deployments
- Automated/scripted setups
- Advanced mirror configurations
- When using self-signed certificates

#### Using Pre-built Image Directly

```bash
docker pull ghcr.io/raylabshq/gitea-mirror:v2.20.1
```

### Configuration Options

#### Quick Start Configuration (docker-compose.alt.yml)

Minimal `.env` file (optional - has sensible defaults):

```bash
# Custom port (default: 4321)
PORT=4321

# User/Group IDs for file permissions (default: 1000)
PUID=1000
PGID=1000

# JWT secret (auto-generated if not set)
JWT_SECRET=your-secret-key-change-this-in-production
```

All other settings are configured through the web interface after starting.

#### Full Setup Configuration (docker-compose.yml)

Supports extensive environment variables for automated deployment. See the full [docker-compose.yml](docker-compose.yml) for all available options including GitHub tokens, Gitea URLs, mirror settings, and more.

### LXC Container (Proxmox)

```bash
# One-line install on Proxmox VE
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/gitea-mirror.sh)"
```

See the [Proxmox VE Community Scripts](https://community-scripts.github.io/ProxmoxVE/scripts?id=gitea-mirror) for more details.

### Manual Installation

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Setup and run
bun run setup
bun run dev
```

## Usage

1. **First Time Setup**
   - Navigate to http://localhost:4321
   - Create admin account (first user signup)
   - Configure GitHub and Gitea connections

2. **Mirror Strategies**
   - **Preserve Structure**: Maintains GitHub organization structure
   - **Single Organization**: All repos go to one Gitea organization
   - **Flat User**: All repos under your Gitea user account
   - **Mixed Mode**: Personal repos in one org, organization repos preserve structure

3. **Customization**
   - Click edit buttons on organization cards to set custom destinations
   - Override individual repository destinations in the table view
   - Starred repositories automatically go to a dedicated organization

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## Technologies

- **Frontend**: Astro, React, Shadcn UI, Tailwind CSS v4
- **Backend**: Bun runtime, SQLite, Drizzle ORM
- **APIs**: GitHub (Octokit), Gitea REST API
- **Auth**: JWT tokens with bcryptjs password hashing

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/RayLabsHQ/gitea-mirror/tree/main/docs)
- 🔐 [Custom CA Certificates](docs/CA_CERTIFICATES.md)
- 🐛 [Report Issues](https://github.com/RayLabsHQ/gitea-mirror/issues)
- 💬 [Discussions](https://github.com/RayLabsHQ/gitea-mirror/discussions)
- 🔧 [Proxmox VE Script](https://community-scripts.github.io/ProxmoxVE/scripts?id=gitea-mirror)