# Changelog

All notable changes to the Gitea Mirror project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.12.0] - 2025-01-27

### Fixed
- Fixed SQLite "no such table: mirror_jobs" error during application startup
- Implemented automatic database table creation during database initialization
- Resolved database schema inconsistencies between development and production environments

### Improved
- Enhanced database initialization process with automatic table creation and indexing
- Added comprehensive error handling for database table creation
- Integrated database repair functionality into application startup for better reliability

## [2.5.3] - 2025-05-22

### Added
- Enhanced JWT_SECRET handling with auto-generation and persistence for improved security
- Updated Proxmox LXC deployment instructions and replaced deprecated script

## [2.5.2] - 2024-11-22

### Fixed
- Fixed version information in health API for Docker deployments by setting npm_package_version environment variable in entrypoint script

## [2.5.1] - 2024-10-01

### Fixed
- Fixed Docker entrypoint script to prevent unnecessary `bun install` on container startup
- Removed redundant dependency installation in Docker containers for pre-built images
- Fixed "PathAlreadyExists" errors during container initialization

### Changed
- Improved database initialization in Docker entrypoint script
- Added additional checks for TypeScript versions of database management scripts

## [2.5.0] - 2024-09-15

Initial public release with core functionality:

### Added
- GitHub to Gitea repository mirroring
- User authentication and management
- Dashboard with mirroring statistics
- Configuration management for mirroring settings
- Support for organization mirroring
- Automated mirroring with configurable schedules
- Docker multi-architecture support (amd64, arm64)
- LXC container deployment scripts
