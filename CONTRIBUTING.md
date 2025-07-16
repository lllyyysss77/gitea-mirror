# Contributing to Gitea Mirror

Thank you for your interest in contributing to Gitea Mirror! This document provides guidelines and instructions for contributing to the open-source version of the project.

## 🎯 Project Overview

Gitea Mirror is an open-source, self-hosted solution for mirroring GitHub repositories to Gitea instances. This guide provides everything you need to know about contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/gitea-mirror.git
   cd gitea-mirror
   ```

3. Install dependencies:
   ```bash
   bun install
   ```

4. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start development:
   ```bash
   bun run dev
   ```

## 🛠 Development Workflow

### Running the Application

```bash
# Development mode
bun run dev

# Build for production
bun run build

# Run tests
bun test
```

### Database Management

```bash
# Initialize database
bun run init-db

# Reset database
bun run cleanup-db && bun run init-db
```

## 📝 Code Guidelines

### General Principles

1. **Keep it Simple**: Gitea Mirror should remain easy to self-host
2. **Focus on Core Features**: Prioritize repository mirroring and synchronization
3. **Database**: Use SQLite for simplicity and portability
4. **Dependencies**: Minimize external dependencies for easier deployment

### Code Style

- Use TypeScript for all new code
- Follow the existing code formatting (Prettier is configured)
- Write meaningful commit messages
- Add tests for new features

### Scope of Contributions

This project focuses on personal/small team use cases. Please keep contributions aligned with:
- Core mirroring functionality
- Self-hosted simplicity
- Minimal external dependencies
- SQLite as the database
- Single-instance deployments

## 🐛 Reporting Issues

1. Check existing issues first
2. Use issue templates when available
3. Provide clear reproduction steps
4. Include relevant logs and screenshots

## 🎯 Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code guidelines

3. Test your changes:
   ```bash
   # Run tests
   bun test
   
   # Build and check
   bun run build:oss
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: add new feature"
   ```

5. Push to your fork and create a Pull Request

### PR Requirements

- Clear description of changes
- Tests for new functionality
- Documentation updates if needed
- No breaking changes without discussion
- Passes all CI checks

## 🏗 Architecture Overview

```
src/
├── components/     # React components
├── lib/           # Core utilities
│   ├── db/        # Database queries (SQLite only)
│   ├── github/    # GitHub API integration
│   ├── gitea/     # Gitea API integration
│   └── utils/     # Helper functions
├── pages/         # Astro pages
│   └── api/       # API endpoints
└── types/         # TypeScript types
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run with coverage
bun test:coverage
```

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update .env.example for new environment variables

## 💡 Feature Requests

We welcome feature requests! When proposing new features, please consider:
- Does it enhance the core mirroring functionality?
- Will it benefit self-hosted users?
- Can it be implemented without complex external dependencies?
- Does it maintain the project's simplicity?

## 🤝 Community

- Be respectful and constructive
- Help others in issues and discussions
- Share your use cases and feedback

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

## Questions?

Feel free to open an issue for any questions about contributing!

---

Thank you for helping make Gitea Mirror better! 🎉