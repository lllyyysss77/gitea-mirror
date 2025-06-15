# LXC Container Deployment Guide

## Overview
Run **Gitea Mirror** in an isolated LXC container:

1. **Proxmox VE (Recommended)** – Using the community-maintained script
2. **Local Development** – Using the local LXC script for testing

---

## 1. Proxmox VE Installation (Recommended)

### Prerequisites
* Proxmox VE host with internet access
* Root shell access on the Proxmox node

### One-command install

```bash
# Community-maintained script from the Proxmox VE Community Scripts project
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/gitea-mirror.sh)"
```

### What the script does:

* Creates a privileged Alpine Linux LXC container
* Installs Bun runtime environment
* Clones the Gitea Mirror repository
* Builds the application
* Configures a systemd service for automatic startup
* Sets up the application to run on port 4321
* Generates a secure `JWT_SECRET` automatically

### Accessing Gitea Mirror:

```
http://<container-ip>:4321
```

### Additional Information:
* **Script Source**: [Community Scripts for Proxmox VE](https://github.com/community-scripts/ProxmoxVE)
* **Documentation**: [Gitea Mirror Script Documentation](https://community-scripts.github.io/ProxmoxVE/scripts?id=gitea-mirror)
* **Support**: [Community Scripts Discord](https://discord.gg/fiXVvSHnBU)

---

## 2. Local testing (LXD on a workstation, works offline)

### Prerequisites

* `lxd` installed (`sudo apt install lxd`; `lxd init --auto`)
* Your repo cloned locally – e.g. `~/Development/gitea-mirror`
* Bun ZIP downloaded once:
  `https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip`

### Offline installer script

```bash
git clone https://github.com/arunavo4/gitea-mirror.git   # if not already
curl -fsSL https://raw.githubusercontent.com/arunavo4/gitea-mirror/main/scripts/gitea-mirror-lxc-local.sh -o gitea-mirror-lxc-local.sh
chmod +x gitea-mirror-lxc-local.sh

sudo LOCAL_REPO_DIR=~/Development/gitea-mirror \
     ./gitea-mirror-lxc-local.sh
```

What it does:

* Launches privileged LXC `gitea-test` (`lxc launch ubuntu:22.04 ...`)
* Pushes **Bun ZIP** + tarred **local repo** into `/opt`
* Unpacks, builds, initializes DB
* Symlinks both `bun` and `bunx` → `/usr/local/bin`
* Creates a root systemd unit and starts it

Access from host:

```
http://$(lxc exec gitea-test -- hostname -I | awk '{print $1}'):4321
```

(Optional) forward to host localhost:

```bash
sudo lxc config device add gitea-test mirror proxy \
  listen=tcp:0.0.0.0:4321 connect=tcp:127.0.0.1:4321
```

---

## Health-check endpoint

Gitea Mirror includes a built-in health check endpoint at `/api/health` that provides:

- System status and uptime
- Database connectivity check
- Memory usage statistics
- Environment information

You can use this endpoint for monitoring your deployment:

```bash
# Basic check (returns 200 OK if healthy)
curl -I http://<container-ip>:4321/api/health

# Detailed health information (JSON)
curl http://<container-ip>:4321/api/health
```

---

## Troubleshooting

| Check          | Command                                               |
| -------------- | ----------------------------------------------------- |
| Service status | `systemctl status gitea-mirror`                       |
| Live logs      | `journalctl -u gitea-mirror -f`                       |
| Verify Bun     | `bun --version && bunx --version`                     |
| DB perms       | `chown -R root:root /opt/gitea-mirror/data` (Proxmox) |

---

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
