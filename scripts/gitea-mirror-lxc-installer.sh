#!/bin/bash
# Gitea Mirror LXC Container Installer
# This is a self-contained script to install Gitea Mirror in an LXC container
# Usage: curl -fsSL https://raw.githubusercontent.com/arunavo4/gitea-mirror/main/scripts/gitea-mirror-lxc-installer.sh | bash

set -e

# Configuration variables - change these as needed
INSTALL_DIR="/opt/gitea-mirror"
REPO_URL="https://github.com/arunavo4/gitea-mirror.git"
SERVICE_USER="gitea-mirror"
PORT=4321

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              Gitea Mirror LXC Container Installer          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Ensure script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo -e "${RED}This script must be run as root${NC}" >&2
  exit 1
fi

echo -e "${GREEN}Starting Gitea Mirror installation...${NC}"

# Check if we're in an LXC container
if [ -d /proc/vz ] && [ ! -d /proc/bc ]; then
  echo -e "${YELLOW}Running in an OpenVZ container. Some features may not work.${NC}"
elif [ -f /proc/1/environ ] && grep -q container=lxc /proc/1/environ; then
  echo -e "${GREEN}Running in an LXC container. Good!${NC}"
else
  echo -e "${YELLOW}Not running in a container. This script is designed for LXC containers.${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Installation aborted.${NC}"
    exit 1
  fi
fi

# Install dependencies
echo -e "${BLUE}Step 1/7: Installing dependencies...${NC}"
apt update
apt install -y curl git sqlite3 build-essential openssl

# Create service user
echo -e "${BLUE}Step 2/7: Creating service user...${NC}"
if id "$SERVICE_USER" &>/dev/null; then
  echo -e "${YELLOW}User $SERVICE_USER already exists${NC}"
else
  useradd -m -s /bin/bash "$SERVICE_USER"
  echo -e "${GREEN}Created user $SERVICE_USER${NC}"
fi

# Install Bun
echo -e "${BLUE}Step 3/7: Installing Bun runtime...${NC}"
if command -v bun >/dev/null 2>&1; then
  echo -e "${YELLOW}Bun is already installed${NC}"
  bun --version
else
  echo -e "${GREEN}Installing Bun...${NC}"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL=${BUN_INSTALL:-"/root/.bun"}
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo -e "${GREEN}Bun installed successfully${NC}"
  bun --version
fi

# Clone repository
echo -e "${BLUE}Step 4/7: Downloading Gitea Mirror...${NC}"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}Directory $INSTALL_DIR already exists${NC}"
  read -p "Update existing installation? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$INSTALL_DIR"
    git pull
    echo -e "${GREEN}Repository updated${NC}"
  else
    echo -e "${YELLOW}Using existing installation${NC}"
  fi
else
  echo -e "${GREEN}Cloning repository...${NC}"
  git clone "$REPO_URL" "$INSTALL_DIR"
  echo -e "${GREEN}Repository cloned to $INSTALL_DIR${NC}"
fi

# Set up application
echo -e "${BLUE}Step 5/7: Setting up application...${NC}"
cd "$INSTALL_DIR"

# Create data directory with proper permissions
mkdir -p data
chown -R "$SERVICE_USER:$SERVICE_USER" data

# Install dependencies and build
echo -e "${GREEN}Installing dependencies and building application...${NC}"
bun install
bun run build

# Initialize database if it doesn't exist
echo -e "${GREEN}Initializing database...${NC}"
if [ ! -f "data/gitea-mirror.db" ]; then
  bun run manage-db init
  chown "$SERVICE_USER:$SERVICE_USER" data/gitea-mirror.db
fi

# Generate a random JWT secret if not provided
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}

# Create systemd service
echo -e "${BLUE}Step 6/7: Creating systemd service...${NC}"
cat >/etc/systemd/system/gitea-mirror.service <<SERVICE
[Unit]
Description=Gitea Mirror
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$(command -v bun) dist/server/entry.mjs
Restart=on-failure
RestartSec=10
User=$SERVICE_USER
Group=$SERVICE_USER
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=$PORT
Environment=DATABASE_URL=file:data/gitea-mirror.db
Environment=JWT_SECRET=${JWT_SECRET}

[Install]
WantedBy=multi-user.target
SERVICE

# Start service
echo -e "${BLUE}Step 7/7: Starting service...${NC}"
systemctl daemon-reload
systemctl enable gitea-mirror.service
systemctl start gitea-mirror.service

# Check if service started successfully
if systemctl is-active --quiet gitea-mirror.service; then
  echo -e "${GREEN}Gitea Mirror service started successfully!${NC}"
else
  echo -e "${RED}Failed to start Gitea Mirror service. Check logs with: journalctl -u gitea-mirror${NC}"
  exit 1
fi

# Get IP address
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Print success message
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              Gitea Mirror Installation Complete            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${GREEN}Gitea Mirror is now running at: http://$IP_ADDRESS:$PORT${NC}"
echo
echo -e "${YELLOW}Important security information:${NC}"
echo -e "JWT_SECRET: ${JWT_SECRET}"
echo -e "${YELLOW}Please save this JWT_SECRET in a secure location.${NC}"
echo
echo -e "${BLUE}To check service status:${NC} systemctl status gitea-mirror"
echo -e "${BLUE}To view logs:${NC} journalctl -u gitea-mirror -f"
echo -e "${BLUE}Data directory:${NC} $INSTALL_DIR/data"
echo
echo -e "${GREEN}Thank you for installing Gitea Mirror!${NC}"
