# Changelog

All notable changes to the Gitea Mirror project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2025-07-17

### 🔴 Breaking Changes
- **Authentication System Overhaul**: Migrated from JWT to Better Auth session-based authentication
- **Login Method Changed**: Users now log in with email instead of username
- **Environment Variables**: `JWT_SECRET` renamed to `BETTER_AUTH_SECRET`, new `BETTER_AUTH_URL` required
- **API Endpoints**: Authentication endpoints moved from `/api/auth/login` to `/api/auth/[...all]`

### Added
- **Token Encryption**: All GitHub and Gitea tokens now encrypted with AES-256-GCM
- **SSO/OIDC Support**: Enterprise authentication with OAuth providers (Google, Azure AD, Okta, Authentik, etc.)
- **Header Authentication**: Support for reverse proxy authentication headers (Authentik, Authelia, Traefik Forward Auth)
- **OAuth Provider**: Gitea Mirror can act as an OIDC provider for other applications
- **Automated Migration**: Docker containers auto-migrate from v2 to v3
- **Session Management**: Improved security with session-based authentication
- **Database Migration System**: Drizzle Kit for better schema management
- **Zod v4 Compatibility**: Updated to Zod v4 for schema validation

### Improved
- **Security**: Enhanced error handling and security practices throughout
- **Documentation**: Comprehensive migration guide for v2 to v3 upgrade
- **User Management**: Better Auth provides improved user lifecycle management
- **Database Schema**: Optimized with proper indexes and relationships
- **Password Hashing**: Using bcrypt via Better Auth for secure password storage

### Fixed
- Mirroring issues for starred repositories
- Various security vulnerabilities in authentication system
- Improved error handling across all API endpoints

### Migration Required
- All users must re-authenticate after upgrade
- Existing tokens will be automatically encrypted
- Database schema updates applied automatically
- See [Migration Guide](MIGRATION_GUIDE.md) for detailed instructions

## [2.22.0] - 2025-07-07

### Added
- Comprehensive mobile and responsive design support across the entire application
- New drawer UI component for enhanced mobile navigation
- Mobile-specific layouts for major components (ActivityLog, Header, Organization, Repository)
- Mobile screenshots in documentation showcasing responsive design

### Improved
- Enhanced mobile user experience with optimized layouts for smaller screens
- Updated organization list cards with better mobile responsiveness
- Better touch interaction support throughout the application

### Fixed
- Type definition issues resolved
- Removed unnecessary console.log statements

### Documentation
- Updated README with mobile usage instructions and screenshots
- Added mobile-specific documentation sections

## [2.20.1] - 2025-07-07

### Fixed
- Fixed mixed mode organization strategy not persisting after page refresh
  - Added missing "mixed" case handler in GiteaConfigForm component
  - Enhanced getMirrorStrategy function to properly detect mixed mode configuration
- Updated dependencies to latest versions

## [2.20.0] - 2025-07-07

### Changed
- **BREAKING**: Repository moved from `arunavo4/gitea-mirror` to `RayLabsHQ/gitea-mirror`
- Docker images now hosted at `ghcr.io/raylabshq/gitea-mirror`
- Updated all repository references and links to new organization
- License changed from MIT to GNU General Public License v3.0

### Fixed
- Updated GitHub API endpoint for version checking to use new repository location
- Corrected all documentation references to point to RayLabsHQ organization

### Security
- Removed test security script after confirming vulnerability resolution
- Updated base Docker image to version 1.2.18-alpine

### Documentation
- Added repository migration notice in README
- Updated quickstart guide with new repository URLs
- Updated LXC deployment documentation with new repository location

## [2.18.0] - 2025-06-24

### Added
- Fourth organization strategy "Mixed Mode" that combines aspects of existing strategies
  - Personal repositories go to a single configurable organization
  - Organization repositories preserve their GitHub organization structure
- "Override Options" info button in Organization Strategy component explaining customization features
  - Organization overrides via edit buttons on organization cards
  - Repository overrides via inline destination editor
  - Starred repositories behavior and priority hierarchy

### Improved
- Simplified mixed strategy implementation to reuse existing database fields
- Enhanced organization strategy UI with comprehensive override documentation
- Better visual indicators for the new mixed strategy with orange color theme

## [2.17.0] - 2025-06-24

### Added
- Custom destination control for individual repositories with inline editing
- Organization-level destination overrides with visual destination editor
- Personal repositories organization override configuration option
- Visual indicators for starred repositories (⭐ icon) in repository list
- Repository-level destination override API endpoint
- Destination customization priority hierarchy system
- "View on Gitea" buttons for organizations with smart tooltip states

### Changed
- Enhanced repository table with destination column showing both GitHub org and Gitea destination
- Updated organization cards to display custom destinations with visual indicators
- Improved getGiteaRepoOwnerAsync to support repository-level destination overrides

### Improved
- Better visual feedback for custom destinations with badges and inline editing
- Enhanced user experience with hover-based edit buttons
- Comprehensive destination customization documentation in README

## [2.16.3] - 2025-06-20

### Added
- Custom 404 error page with helpful navigation links
- HoverCard components for better UX in configuration forms

### Improved
- Replaced popover components with hover cards for information tooltips
- Enhanced user experience with responsive hover interactions

## [2.16.2] - 2025-06-17

### Added
- Bulk actions for repository management with selection support

### Improved
- Enhanced organization card display with status badges and improved layout

## [2.16.1] - 2025-06-17

### Improved
- Improved repository owner handling and mirror strategy in Gitea integration
- Updated label for starred repositories organization for consistency

## [2.16.0] - 2025-06-17

### Added
- Enhanced OrganizationConfiguration component with improved layout and metadata options
- New GitHubMirrorSettings component with better organization and flexibility
- Enhanced starred repositories content selection and improved layout

### Improved
- Enhanced configuration interface layout and spacing across multiple components
- Streamlined OrganizationStrategy component with cleaner imports and better organization
- Improved responsive layout for larger screens in configuration forms
- Better icon usage and clarity in configuration components
- Enhanced tooltip descriptions and component organization
- Improved version comparison logic in health API
- Enhanced issue mirroring logic for starred repositories

### Fixed
- Fixed mirror to single organization functionality
- Resolved organization strategy layout issues
- Cleaned up unused imports across multiple components

### Refactored
- Simplified component structures by removing unused imports and dependencies
- Enhanced layout flexibility in GitHubConfigForm and GiteaConfigForm components
- Improved component organization and code clarity
- Removed ConnectionsForm and useMirror hook for better code organization

## [2.14.0] - 2025-06-17

### Added
- Enhanced UI components with @radix-ui/react-accordion dependency for improved configuration interface

### Fixed
- Mirror strategies now properly route repositories based on selected strategy
- Starred repositories now correctly go to the designated starred repos organization
- Organization routing for single-org and flat-user strategies

### Improved
- Documentation now explains all three mirror strategies (preserve, single-org, flat-user)
- Added detailed mirror strategy configuration guide
- Updated CLAUDE.md with mirror strategy architecture information
- Enhanced Docker Compose development configuration

## [2.13.2] - 2025-06-15

### Improved
- Enhanced documentation design and layout
- Updated README with improved formatting and content

## [2.13.1] - 2025-06-15

### Added
- Docker Hub authentication for Docker Scout security scanning
- Comprehensive Docker workflow consolidation with build, push & security scan

### Improved
- Enhanced CI/CD pipeline reliability with better error handling
- Updated Bun base image to latest version for improved security
- Migrated from Trivy to Docker Scout for more comprehensive security scanning
- Enhanced Docker workflow with wait steps for image availability

### Fixed
- Docker Scout action integration issues and image reference problems
- Workflow reliability improvements with proper error handling
- Security scanning workflow now continues on security issues without failing the build

### Changed
- Updated package dependencies to latest versions
- Consolidated multiple Docker workflows into single comprehensive workflow
- Enhanced security scanning with Docker Scout integration

## [2.13.0] - 2025-06-15

### Added
- Enhanced Configuration Interface with collapsible components and improved organization strategy UI
- Wiki Mirroring Support in configuration settings
- Auto-Save Functionality for all config forms, eliminating manual save buttons
- Live Refresh functionality with configuration status hooks and enhanced UI components
- Enhanced API Config Handling with mapping functions for UI and database structures
- Secure Error Responses with createSecureErrorResponse for consistent error handling
- Automatic Database Cleanup feature with configuration options and API support
- Enhanced Job Recovery with improved database schema and recovery mechanisms
- Fork tags to repository UI and enhanced organization cards with repository breakdown
- Skeleton loaders and better loading state management across the application

### Improved
- Navigation context and component loading states across the application
- Card components alignment and styling consistency
- Error logging and structured error message parsing
- HTTP client standardization across the application
- Database initialization and management processes
- Visual consistency with updated icons and custom logo integration

### Fixed
- Repository mirroring status inconsistencies
- Organizations getting stuck on mirroring status when empty
- JSON parsing errors and improved error handling
- Broken documentation links in README
- Various UI contrast and alignment issues

### Changed
- Migrated testing framework to Bun and updated test configurations
- Implemented graceful shutdown and enhanced job recovery capabilities
- Replaced SiGitea icons with custom logo
- Updated various dependencies for improved stability and performance

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
