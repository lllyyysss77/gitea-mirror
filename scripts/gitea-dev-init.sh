#!/bin/sh
# Initialize Gitea for development with pre-configured settings

# Create necessary directories
mkdir -p /data/gitea/conf

# Copy pre-configured app.ini if it doesn't exist
if [ ! -f /data/gitea/conf/app.ini ]; then
    echo "Initializing Gitea with development configuration..."
    cp /tmp/app.ini /data/gitea/conf/app.ini
    chown 1000:1000 /data/gitea/conf/app.ini
fi

# Start Gitea in background
/usr/bin/entrypoint "$@" &
GITEA_PID=$!

# Wait for Gitea to be ready
echo "Waiting for Gitea to start..."
until wget --no-verbose --tries=1 --spider http://localhost:3000/ 2>/dev/null; do
    sleep 2
done

# Create admin user if it doesn't exist
if [ ! -f /data/.admin_created ]; then
    echo "Creating default admin user..."
    su git -c "gitea admin user create --username admin --password admin123 --email admin@localhost --admin --must-change-password=false" && \
    touch /data/.admin_created
fi

# Keep Gitea running in foreground
wait $GITEA_PID