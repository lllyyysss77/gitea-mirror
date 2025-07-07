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
# Using Docker (recommended)
docker compose up -d

# Access at http://localhost:4321
```

First user signup becomes admin. No configuration needed to get started!

<p align="center">
  <img src=".github/assets/dashboard.png" alt="Dashboard" width="full"/>
</p>

## ✨ Features

- 🔁 Mirror public, private, and starred GitHub repos to Gitea
- 🏢 Mirror entire organizations with flexible strategies
- 🎯 Custom destination control for repos and organizations
- 🔐 Secure authentication with JWT tokens
- 📊 Real-time dashboard with activity logs
- ⏱️ Scheduled automatic mirroring
- 🐳 Dockerized with multi-arch support (AMD64/ARM64)

## 📸 Screenshots

<p align="center">
  <img src=".github/assets/repositories.png" width="49%"/>
  <img src=".github/assets/organisations.png" width="49%"/>
</p>

## Installation

### Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/RayLabsHQ/gitea-mirror.git
cd gitea-mirror

# Start with Docker Compose
docker compose up -d

# Access at http://localhost:4321
```

Or use the pre-built image:

```bash
docker pull ghcr.io/raylabshq/gitea-mirror:v2.20.1
```

### Configuration Options

Create a `.env` file for custom settings (optional):

```bash
# JWT secret for authentication (auto-generated if blank or default below)
JWT_SECRET=your-secret-key-change-this-in-production

# Port configuration
PORT=4321
```

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
- 🐛 [Report Issues](https://github.com/RayLabsHQ/gitea-mirror/issues)
- 💬 [Discussions](https://github.com/RayLabsHQ/gitea-mirror/discussions)
- 🔧 [Proxmox VE Script](https://community-scripts.github.io/ProxmoxVE/scripts?id=gitea-mirror)