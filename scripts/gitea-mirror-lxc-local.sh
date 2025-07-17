#!/usr/bin/env bash
# gitea-mirror-lxc-local.sh  (offline, local repo, verbose)

set -euo pipefail

CONTAINER="gitea-test"
IMAGE="ubuntu:22.04"
INSTALL_DIR="/opt/gitea-mirror"
PORT=4321
BETTER_AUTH_SECRET="$(openssl rand -hex 32)"

BUN_ZIP="/tmp/bun-linux-x64.zip"
BUN_URL="https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip"

LOCAL_REPO_DIR="${LOCAL_REPO_DIR:-./gitea-mirror}"
REPO_TAR="/tmp/gitea-mirror-local.tar.gz"

need() { command -v "$1" >/dev/null || { echo "Missing $1"; exit 1; }; }
need curl; need lxc; need tar; need unzip

# ── build host artefacts ────────────────────────────────────────────────
[[ -d $LOCAL_REPO_DIR ]] || { echo "❌ LOCAL_REPO_DIR not found"; exit 1; }
[[ -f $LOCAL_REPO_DIR/package.json ]] || { echo "❌ package.json missing"; exit 1; }
[[ -f $BUN_ZIP ]] || curl -L --retry 5 --retry-delay 5 -o "$BUN_ZIP" "$BUN_URL"
tar -czf "$REPO_TAR" -C "$(dirname "$LOCAL_REPO_DIR")" "$(basename "$LOCAL_REPO_DIR")"

# ── ensure container exists ─────────────────────────────────────────────
lxd init --auto >/dev/null 2>&1 || true
lxc info "$CONTAINER" >/dev/null 2>&1 || lxc launch "$IMAGE" "$CONTAINER"

echo "🔧  installing base packages…"
sudo lxc exec "$CONTAINER" -- bash -c 'set -ex; apt update; apt install -y unzip tar openssl sqlite3'

echo "⬆️  pushing artefacts…"
sudo lxc file push "$BUN_ZIP"  "$CONTAINER/opt/"
sudo lxc file push "$REPO_TAR" "$CONTAINER/opt/"

echo "📦  unpacking Bun + repo…"
sudo lxc exec "$CONTAINER" -- bash -ex <<'IN'
cd /opt
# Bun
unzip -oq bun-linux-x64.zip -d bun
BIN=$(find /opt/bun -type f -name bun -perm -111 | head -n1)
ln -sf "$BIN" /usr/local/bin/bun      # bun
ln -sf "$BIN" /usr/local/bin/bunx     # bunx shim
# Repo
rm -rf /opt/gitea-mirror
mkdir -p /opt/gitea-mirror
tar -xzf gitea-mirror-local.tar.gz --strip-components=1 -C /opt/gitea-mirror
IN

echo "🏗️  bun install / build…"
sudo lxc exec "$CONTAINER" -- bash -ex <<'IN'
cd /opt/gitea-mirror
bun install
bun run build
bun run manage-db init
IN

echo "📝  systemd unit…"
sudo lxc exec "$CONTAINER" -- bash -ex <<IN
cat >/etc/systemd/system/gitea-mirror.service <<SERVICE
[Unit]
Description=Gitea Mirror
After=network.target
[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/local/bin/bun dist/server/entry.mjs
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=$PORT
Environment=DATABASE_URL=file:data/gitea-mirror.db
Environment=BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable gitea-mirror
systemctl restart gitea-mirror
IN

echo -e "\n✅  finished; service status:"
sudo lxc exec "$CONTAINER" -- systemctl status gitea-mirror --no-pager
