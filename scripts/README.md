# Scripts Directory

This folder contains utility scripts for database management.

## Database Management Tool (manage-db.ts)

This is a consolidated database management tool that handles all database-related operations. It combines the functionality of the previous separate scripts into a single, more intelligent script that can check, fix, and initialize the database as needed.

### Features

- **Check Mode**: Validates the existence and integrity of the database
- **Init Mode**: Creates the database only if it doesn't already exist
- **Fix Mode**: Corrects database file location issues
- **Reset Users Mode**: Removes all users and their data
- **Auto Mode**: Automatically checks, fixes, and initializes the database if needed

## Running the Database Management Tool

You can execute the database management tool using your package manager with various commands:

```bash
# Checks database status (default action if no command is specified, equivalent to 'bun run check-db')
bun run manage-db

# Check database status
bun run check-db

# Initialize the database (only if it doesn't exist)
bun run init-db

# Fix database location issues
bun run fix-db

# Automatic check, fix, and initialize if needed
bun run db-auto

# Reset all users (for testing signup flow)
bun run reset-users

# Update the database schema to the latest version
bun run update-schema

# Remove database files completely
bun run cleanup-db

# Complete setup (install dependencies and initialize database)
bun run setup

# Start development server with a fresh database
bun run dev:clean

# Start production server with a fresh database
bun run start:fresh
```

## Database File Location

The database file should be located in the `./data/gitea-mirror.db` directory. If the file is found in the root directory, the fix mode will move it to the correct location.
