#!/bin/sh
set -e


# Ensure data directory exists
mkdir -p /app/data

# Skip dependency installation entirely for pre-built images
# Dependencies are already installed during the Docker build process

# Initialize the database if it doesn't exist
if [ ! -f "/app/data/gitea-mirror.db" ]; then
  echo "Initializing database..."
  if [ -f "dist/scripts/init-db.js" ]; then
    bun dist/scripts/init-db.js
  elif [ -f "dist/scripts/manage-db.js" ]; then
    bun dist/scripts/manage-db.js init
  elif [ -f "scripts/manage-db.ts" ]; then
    bun scripts/manage-db.ts init
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

      -- New fields for job resilience
      job_type TEXT NOT NULL DEFAULT 'mirror',
      batch_id TEXT,
      total_items INTEGER,
      completed_items INTEGER DEFAULT 0,
      item_ids TEXT, -- JSON array as text
      completed_item_ids TEXT DEFAULT '[]', -- JSON array as text
      in_progress INTEGER NOT NULL DEFAULT 0, -- Boolean as integer
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      last_checkpoint TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_mirror_jobs_user_id ON mirror_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_mirror_jobs_batch_id ON mirror_jobs(batch_id);
    CREATE INDEX IF NOT EXISTS idx_mirror_jobs_in_progress ON mirror_jobs(in_progress);
    CREATE INDEX IF NOT EXISTS idx_mirror_jobs_job_type ON mirror_jobs(job_type);
    CREATE INDEX IF NOT EXISTS idx_mirror_jobs_timestamp ON mirror_jobs(timestamp);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      payload TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_user_channel ON events(user_id, channel);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_read ON events(read);
EOF
    echo "Database initialized with required tables."
  fi
else
  echo "Database already exists, checking for issues..."
  if [ -f "dist/scripts/fix-db-issues.js" ]; then
    bun dist/scripts/fix-db-issues.js
  elif [ -f "dist/scripts/manage-db.js" ]; then
    bun dist/scripts/manage-db.js fix
  elif [ -f "scripts/manage-db.ts" ]; then
    bun scripts/manage-db.ts fix
  fi

  # Run database migrations
  echo "Running database migrations..."

  # Update mirror_jobs table with new columns for resilience
  if [ -f "dist/scripts/update-mirror-jobs-table.js" ]; then
    echo "Updating mirror_jobs table..."
    bun dist/scripts/update-mirror-jobs-table.js
  elif [ -f "scripts/update-mirror-jobs-table.ts" ]; then
    echo "Updating mirror_jobs table using TypeScript script..."
    bun scripts/update-mirror-jobs-table.ts
  else
    echo "Warning: Could not find mirror_jobs table update script."
  fi
fi

# Start the application
echo "Starting Gitea Mirror..."
exec bun ./dist/server/entry.mjs
