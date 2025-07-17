#!/bin/sh
set -e


# Ensure data directory exists
mkdir -p /app/data

# Handle custom CA certificates
if [ -d "/app/certs" ] && [ "$(ls -A /app/certs/*.crt 2>/dev/null)" ]; then
  echo "Custom CA certificates found, configuring Node.js to use them..."
  
  # Combine all CA certificates into a bundle for Node.js
  CA_BUNDLE="/app/certs/ca-bundle.crt"
  > "$CA_BUNDLE"
  
  for cert in /app/certs/*.crt; do
    if [ -f "$cert" ]; then
      echo "Adding certificate: $(basename "$cert")"
      cat "$cert" >> "$CA_BUNDLE"
      echo "" >> "$CA_BUNDLE"  # Add newline between certificates
    fi
  done
  
  # Set Node.js to use the custom CA bundle
  export NODE_EXTRA_CA_CERTS="$CA_BUNDLE"
  echo "NODE_EXTRA_CA_CERTS set to: $NODE_EXTRA_CA_CERTS"
  
  # For Bun compatibility, also set the CA bundle in system location if writable
  if [ -f "/etc/ssl/certs/ca-certificates.crt" ] && [ -w "/etc/ssl/certs/" ]; then
    echo "Appending custom certificates to system CA bundle..."
    cat "$CA_BUNDLE" >> /etc/ssl/certs/ca-certificates.crt
  fi
  
else
  echo "No custom CA certificates found in /app/certs"
fi

# Check if system CA bundle is mounted and use it
if [ -f "/etc/ssl/certs/ca-certificates.crt" ] && [ ! -L "/etc/ssl/certs/ca-certificates.crt" ]; then
  # Check if it's a mounted file (not the default symlink)
  if [ "$(stat -c '%d' /etc/ssl/certs/ca-certificates.crt 2>/dev/null)" != "$(stat -c '%d' / 2>/dev/null)" ] || \
     [ "$(stat -f '%d' /etc/ssl/certs/ca-certificates.crt 2>/dev/null)" != "$(stat -f '%d' / 2>/dev/null)" ]; then
    echo "System CA bundle mounted, configuring Node.js to use it..."
    export NODE_EXTRA_CA_CERTS="/etc/ssl/certs/ca-certificates.crt"
    echo "NODE_EXTRA_CA_CERTS set to: $NODE_EXTRA_CA_CERTS"
  fi
fi

# Optional: If GITEA_SKIP_TLS_VERIFY is set, configure accordingly
if [ "$GITEA_SKIP_TLS_VERIFY" = "true" ]; then
  echo "Warning: GITEA_SKIP_TLS_VERIFY is set to true. This is insecure!"
  export NODE_TLS_REJECT_UNAUTHORIZED=0
fi

# Generate a secure BETTER_AUTH_SECRET if one isn't provided or is using the default value
BETTER_AUTH_SECRET_FILE="/app/data/.better_auth_secret"
JWT_SECRET_FILE="/app/data/.jwt_secret"  # Old file for backward compatibility

if [ "$BETTER_AUTH_SECRET" = "your-secret-key-change-this-in-production" ] || [ -z "$BETTER_AUTH_SECRET" ]; then
  # Check if we have a previously generated secret
  if [ -f "$BETTER_AUTH_SECRET_FILE" ]; then
    echo "Using previously generated BETTER_AUTH_SECRET"
    export BETTER_AUTH_SECRET=$(cat "$BETTER_AUTH_SECRET_FILE")
  # Check for old JWT_SECRET file for backward compatibility
  elif [ -f "$JWT_SECRET_FILE" ]; then
    echo "Migrating from old JWT_SECRET to BETTER_AUTH_SECRET"
    export BETTER_AUTH_SECRET=$(cat "$JWT_SECRET_FILE")
    # Save to new file
    echo "$BETTER_AUTH_SECRET" > "$BETTER_AUTH_SECRET_FILE"
    chmod 600 "$BETTER_AUTH_SECRET_FILE"
    # Optionally remove old file after successful migration
    rm -f "$JWT_SECRET_FILE"
  else
    echo "Generating a secure random BETTER_AUTH_SECRET"
    # Try to generate a secure random string using OpenSSL
    if command -v openssl >/dev/null 2>&1; then
      GENERATED_SECRET=$(openssl rand -hex 32)
    else
      # Fallback to using /dev/urandom if openssl is not available
      echo "OpenSSL not found, using fallback method for random generation"
      GENERATED_SECRET=$(head -c 32 /dev/urandom | sha256sum | cut -d' ' -f1)
    fi
    export BETTER_AUTH_SECRET="$GENERATED_SECRET"
    # Save the secret to a file for persistence across container restarts
    echo "$GENERATED_SECRET" > "$BETTER_AUTH_SECRET_FILE"
    chmod 600 "$BETTER_AUTH_SECRET_FILE"
  fi
  echo "BETTER_AUTH_SECRET has been set to a secure random value"
fi

# Generate a secure ENCRYPTION_SECRET if one isn't provided
ENCRYPTION_SECRET_FILE="/app/data/.encryption_secret"

if [ -z "$ENCRYPTION_SECRET" ]; then
  # Check if we have a previously generated secret
  if [ -f "$ENCRYPTION_SECRET_FILE" ]; then
    echo "Using previously generated ENCRYPTION_SECRET"
    export ENCRYPTION_SECRET=$(cat "$ENCRYPTION_SECRET_FILE")
  else
    echo "Generating a secure random ENCRYPTION_SECRET"
    # Generate a 48-character secret for encryption
    if command -v openssl >/dev/null 2>&1; then
      GENERATED_ENCRYPTION_SECRET=$(openssl rand -base64 36)
    else
      # Fallback to using /dev/urandom if openssl is not available
      echo "OpenSSL not found, using fallback method for encryption secret generation"
      GENERATED_ENCRYPTION_SECRET=$(head -c 36 /dev/urandom | base64 | tr -d '\n' | head -c 48)
    fi
    export ENCRYPTION_SECRET="$GENERATED_ENCRYPTION_SECRET"
    # Save the secret to a file for persistence across container restarts
    echo "$GENERATED_ENCRYPTION_SECRET" > "$ENCRYPTION_SECRET_FILE"
    chmod 600 "$ENCRYPTION_SECRET_FILE"
  fi
  echo "ENCRYPTION_SECRET has been set to a secure random value"
fi



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

  # Run v3 migrations if needed
  echo "Checking for v3 migrations..."
  
  # Check if we need to run Better Auth migration (check if accounts table exists)
  if ! sqlite3 /app/data/gitea-mirror.db "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts';" | grep -q accounts; then
    echo "🔄 v3 Migration: Creating Better Auth tables..."
    # Create Better Auth tables
    sqlite3 /app/data/gitea-mirror.db <<EOF
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt INTEGER,
      password TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_accounts_userId ON accounts(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_verification_identifier_token ON verification_tokens(identifier, token);
EOF
  fi
  
  # Run Better Auth user migration
  if [ -f "dist/scripts/migrate-better-auth.js" ]; then
    echo "🔄 v3 Migration: Migrating users to Better Auth..."
    bun dist/scripts/migrate-better-auth.js
  elif [ -f "scripts/migrate-better-auth.ts" ]; then
    echo "🔄 v3 Migration: Migrating users to Better Auth..."
    bun scripts/migrate-better-auth.ts
  fi
  
  # Run token encryption migration
  if [ -f "dist/scripts/migrate-tokens-encryption.js" ]; then
    echo "🔄 v3 Migration: Encrypting stored tokens..."
    bun dist/scripts/migrate-tokens-encryption.js
  elif [ -f "scripts/migrate-tokens-encryption.ts" ]; then
    echo "🔄 v3 Migration: Encrypting stored tokens..."
    bun scripts/migrate-tokens-encryption.ts
  fi
fi

# Extract version from package.json and set as environment variable
if [ -f "package.json" ]; then
  export npm_package_version=$(grep -o '"version": *"[^"]*"' package.json | cut -d'"' -f4)
  echo "Setting application version: $npm_package_version"
fi



# Run startup recovery to handle any interrupted jobs
echo "Running startup recovery..."
if [ -f "dist/scripts/startup-recovery.js" ]; then
  echo "Running startup recovery using compiled script..."
  bun dist/scripts/startup-recovery.js --timeout=30000
  RECOVERY_EXIT_CODE=$?
elif [ -f "scripts/startup-recovery.ts" ]; then
  echo "Running startup recovery using TypeScript script..."
  bun scripts/startup-recovery.ts --timeout=30000
  RECOVERY_EXIT_CODE=$?
else
  echo "Warning: Startup recovery script not found. Skipping recovery."
  RECOVERY_EXIT_CODE=0
fi

# Log recovery result
if [ $RECOVERY_EXIT_CODE -eq 0 ]; then
  echo "✅ Startup recovery completed successfully"
elif [ $RECOVERY_EXIT_CODE -eq 1 ]; then
  echo "⚠️  Startup recovery completed with warnings"
else
  echo "❌ Startup recovery failed with exit code $RECOVERY_EXIT_CODE"
fi

# Run repository status repair to fix any inconsistent mirroring states
echo "Running repository status repair..."
if [ -f "dist/scripts/repair-mirrored-repos.js" ]; then
  echo "Running repository repair using compiled script..."
  bun dist/scripts/repair-mirrored-repos.js --startup
  REPAIR_EXIT_CODE=$?
elif [ -f "scripts/repair-mirrored-repos.ts" ]; then
  echo "Running repository repair using TypeScript script..."
  bun scripts/repair-mirrored-repos.ts --startup
  REPAIR_EXIT_CODE=$?
else
  echo "Warning: Repository repair script not found. Skipping repair."
  REPAIR_EXIT_CODE=0
fi

# Log repair result
if [ $REPAIR_EXIT_CODE -eq 0 ]; then
  echo "✅ Repository status repair completed successfully"
else
  echo "⚠️  Repository status repair completed with warnings (exit code $REPAIR_EXIT_CODE)"
fi

# Function to handle shutdown signals
shutdown_handler() {
  echo "🛑 Received shutdown signal, forwarding to application..."
  if [ ! -z "$APP_PID" ]; then
    kill -TERM "$APP_PID"
    wait "$APP_PID"
  fi
  exit 0
}

# Set up signal handlers
trap 'shutdown_handler' TERM INT HUP

# Start the application
echo "Starting Gitea Mirror..."
bun ./dist/server/entry.mjs &
APP_PID=$!

# Wait for the application to finish
wait "$APP_PID"
