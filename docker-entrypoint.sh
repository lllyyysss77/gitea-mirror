#!/bin/sh
set -e


# Ensure data directory exists
mkdir -p /app/data

# If bun is available, run setup (for dev images)
if command -v bun >/dev/null 2>&1; then
  echo "Running bun setup (if needed)..."
  bun run setup || true
fi

# Initialize the database if it doesn't exist
if [ ! -f "/app/data/gitea-mirror.db" ]; then
  echo "Initializing database..."
  if [ -f "dist/scripts/init-db.js" ]; then
    bun dist/scripts/init-db.js
  elif [ -f "dist/scripts/manage-db.js" ]; then
    bun dist/scripts/manage-db.js init
  else
    echo "Warning: Could not find database initialization scripts in dist/scripts."
    echo "Creating and initializing database manually..."

    # Create the database file
    touch /app/data/gitea-mirror.db

    # Initialize the database with required tables
    sqlite3 /app/data/gitea-mirror.db <<EOF
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      github_config TEXT NOT NULL,
      gitea_config TEXT NOT NULL,
      include TEXT NOT NULL DEFAULT '["*"]',
      exclude TEXT NOT NULL DEFAULT '[]',
      schedule_config TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      config_id TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      url TEXT NOT NULL,
      clone_url TEXT NOT NULL,
      owner TEXT NOT NULL,
      organization TEXT,
      mirrored_location TEXT DEFAULT '',
      is_private INTEGER NOT NULL DEFAULT 0,
      is_fork INTEGER NOT NULL DEFAULT 0,
      forked_from TEXT,
      has_issues INTEGER NOT NULL DEFAULT 0,
      is_starred INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      size INTEGER NOT NULL DEFAULT 0,
      has_lfs INTEGER NOT NULL DEFAULT 0,
      has_submodules INTEGER NOT NULL DEFAULT 0,
      default_branch TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'imported',
      last_mirrored INTEGER,
      error_message TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (config_id) REFERENCES configs(id)
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      config_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      membership_role TEXT NOT NULL DEFAULT 'member',
      is_included INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'imported',
      last_mirrored INTEGER,
      error_message TEXT,
      repository_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (config_id) REFERENCES configs(id)
    );

    CREATE TABLE IF NOT EXISTS mirror_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      repository_id TEXT,
      repository_name TEXT,
      organization_id TEXT,
      organization_name TEXT,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'imported',
      message TEXT NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
EOF
    echo "Database initialized with required tables."
  fi
else
  echo "Database already exists, checking for issues..."
  if [ -f "dist/scripts/fix-db-issues.js" ]; then
    bun dist/scripts/fix-db-issues.js
  elif [ -f "dist/scripts/manage-db.js" ]; then
    bun dist/scripts/manage-db.js fix
  fi

  # Since the application is not used by anyone yet, we've removed the schema updates and migrations
  echo "Database already exists, no migrations needed."
fi

# Start the application
echo "Starting Gitea Mirror..."
exec bun ./dist/server/entry.mjs
