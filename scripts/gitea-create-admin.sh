#!/bin/sh
# Create admin user for Gitea development instance

echo "Creating admin user for Gitea..."
docker exec -u git gitea gitea admin user create \
  --username admin \
  --password admin123 \
  --email admin@localhost \
  --admin \
  --must-change-password=false

echo "Admin user created!"
echo "Username: admin"
echo "Password: admin123"