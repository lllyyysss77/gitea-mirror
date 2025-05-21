# LXC Container Deployment Guide

This guide explains how to deploy the Gitea Mirror application on Proxmox LXC containers while keeping your existing Docker containers.

## Prerequisites

- Proxmox VE installed and configured
- Basic knowledge of LXC containers and Proxmox
- Access to Proxmox web interface or CLI

## Creating an LXC Container

1. In Proxmox web interface, create a new LXC container:
   - Choose Ubuntu 22.04 as the template
   - Allocate appropriate resources (2GB RAM, 2 CPU cores recommended)
   - At least 10GB of disk space
   - Configure networking as needed

2. Start the container and get a shell (either via Proxmox web console or SSH)

## Deploying Gitea Mirror

### Option 1: One-Command Installation (Recommended)

This method allows you to install Gitea Mirror with a single command, without having to copy files manually:

1. SSH into your LXC container:
   ```bash
   ssh root@lxc-container-ip
   ```

2. Run the installer script directly:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/arunavo4/gitea-mirror/main/scripts/gitea-mirror-lxc-installer.sh | bash
   ```

3. The installer will:
   - Download the Gitea Mirror repository
   - Install all dependencies including Bun
   - Build the application
   - Set up a systemd service
   - Start the application
   - Display access information

### Option 2: Manual Setup

If you prefer to set up manually or the automatic script doesn't work for your environment:

1. Install dependencies:
   ```bash
   apt update
   apt install -y curl git sqlite3 build-essential
   ```

2. Install Bun:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   export BUN_INSTALL="/root/.bun"
   export PATH="$BUN_INSTALL/bin:$PATH"
   ```

3. Clone or copy your project:
   ```bash
   git clone https://github.com/yourusername/gitea-mirror.git /opt/gitea-mirror
   cd /opt/gitea-mirror
   ```

4. Build and initialize:
   ```bash
   bun install
   bun run build
   bun run manage-db init
   ```

5. Create a systemd service manually:
   ```bash
   nano /etc/systemd/system/gitea-mirror.service
   # Add the service configuration as shown below:

   [Unit]
   Description=Gitea Mirror
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/opt/gitea-mirror
   ExecStart=/root/.bun/bin/bun dist/server/entry.mjs
   Restart=on-failure
   RestartSec=10
   User=gitea-mirror
   Group=gitea-mirror
   Environment=NODE_ENV=production
   Environment=HOST=0.0.0.0
   Environment=PORT=4321
   Environment=DATABASE_URL=file:data/gitea-mirror.db
   Environment=JWT_SECRET=your-secure-secret-key

   [Install]
   WantedBy=multi-user.target
   ```

   6. Enable and start the service:
   ```bash
   systemctl enable gitea-mirror.service
   systemctl start gitea-mirror.service
   ```

## Connecting LXC and Docker Containers

If you need your LXC container to communicate with Docker containers:

1. On your host machine, create a bridge network:
   ```bash
   docker network create gitea-network
   ```

2. Find the bridge interface created by Docker:
   ```bash
   ip a | grep docker
   # Look for something like docker0 or br-xxxxxxxx
   ```

3. In Proxmox, edit the LXC container's network configuration to use this bridge.

## Accessing the Application

Once deployed, you can access the Gitea Mirror application at:
```
http://lxc-container-ip:4321
```

## Troubleshooting

- Check service status:
  ```bash
  systemctl status gitea-mirror
  ```

- View logs:
  ```bash
  journalctl -u gitea-mirror -f
  ```

- If the service fails to start, check permissions on the data directory:
  ```bash
  chown -R gitea-mirror:gitea-mirror /opt/gitea-mirror/data
  ```

- Verify Bun is installed correctly:
  ```bash
  bun --version
  ```
