#!/usr/bin/env bash
# gitea-mirror-proxmox.sh
# Fully online installer for a Proxmox LXC guest running Gitea Mirror + Bun.

set -euo pipefail

# ────── adjustable defaults ──────────────────────────────────────────────
CTID=${CTID:-106}                       # container ID
HOSTNAME=${HOSTNAME:-gitea-mirror}
STORAGE=${STORAGE:-local-lvm}           # where rootfs lives
DISK_SIZE=${DISK_SIZE:-8G}
CORES=${CORES:-2}
MEMORY=${MEMORY:-2048}                  # MiB
BRIDGE=${BRIDGE:-vmbr0}
IP_CONF=${IP_CONF:-dhcp}                # or "192.168.1.240/24,gw=192.168.1.1"

PORT=4321
JWT_SECRET=$(openssl rand -hex 32)

REPO="https://github.com/arunavo4/gitea-mirror.git"
# ─────────────────────────────────────────────────────────────────────────

TEMPLATE='ubuntu-22.04-standard_22.04-1_amd64.tar.zst'
TEMPLATE_PATH="/var/lib/vz/template/cache/${TEMPLATE}"

echo "▶️  Ensuring template exists…"
if [[ ! -f $TEMPLATE_PATH ]]; then
  pveam update >/dev/null
  pveam download "$STORAGE" "$TEMPLATE"
fi

echo "▶️  Creating container $CTID (if missing)…"
if ! pct status "$CTID" &>/dev/null; then
  pct create "$CTID" "$TEMPLATE_PATH" \
    --rootfs "$STORAGE:$DISK_SIZE" \
    --hostname "$HOSTNAME" \
    --cores "$CORES" --memory "$MEMORY" \
    --net0 "name=eth0,bridge=$BRIDGE,ip=$IP_CONF" \
    --features nesting=1 \
    --unprivileged 0
fi

pct start "$CTID"

echo "▶️  Installing base packages inside CT $CTID…"
pct exec "$CTID" -- bash -c 'apt update && apt install -y curl git build-essential openssl sqlite3 unzip'

echo "▶️  Installing Bun runtime…"
pct exec "$CTID" -- bash -c '
  export BUN_INSTALL=/opt/bun
  curl -fsSL https://bun.sh/install | bash -s -- --yes
  ln -sf /opt/bun/bin/bun /usr/local/bin/bun
  ln -sf /opt/bun/bin/bun /usr/local/bin/bunx
  bun --version
'

echo "▶️  Cloning & building Gitea Mirror…"
pct exec "$CTID" -- bash -c "
  git clone --depth=1 '$REPO' /opt/gitea-mirror || (cd /opt/gitea-mirror && git pull)
  cd /opt/gitea-mirror
  bun install
  bun run build
  bun run manage-db init
"

echo "▶️  Creating systemd service…"
pct exec "$CTID" -- bash -c "
cat >/etc/systemd/system/gitea-mirror.service <<SERVICE
[Unit]
Description=Gitea Mirror
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/gitea-mirror
ExecStart=/usr/local/bin/bun dist/server/entry.mjs
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=$PORT
Environment=DATABASE_URL=file:data/gitea-mirror.db
Environment=JWT_SECRET=$JWT_SECRET
[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable gitea-mirror
systemctl restart gitea-mirror
"

echo -e "\n🔍  Service status:"
pct exec "$CTID" -- systemctl status gitea-mirror --no-pager | head -n15

GUEST_IP=$(pct exec "$CTID" -- hostname -I | awk '{print $1}')
echo -e "\n🌐  Browse to:  http://$GUEST_IP:$PORT\n"
echo "🗝️  JWT_SECRET = $JWT_SECRET"
echo -e "\n✅  Done – Gitea Mirror is running in CT $CTID."
