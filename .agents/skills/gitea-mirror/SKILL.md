```markdown
# gitea-mirror Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `gitea-mirror` repository, a TypeScript project built with React. You'll learn about file naming, import/export styles, commit message conventions, and how to write and run tests. This guide also provides suggested commands for common workflows.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.tsx`, `repoList.ts`

### Import Style
- Mixed import styles are used, both named and default imports.
  - Example:
    ```typescript
    import React from 'react';
    import { useState } from 'react';
    import * as api from './apiService';
    ```

### Export Style
- Prefer **named exports**.
  - Example:
    ```typescript
    // Good
    export function fetchRepos() { ... }
    export const RepoList = () => { ... }

    // Avoid default exports
    // export default RepoList;
    ```

### Commit Message Conventions
- Use **conventional commits** with clear prefixes.
  - Prefixes: `fix`, `chore`
  - Average length: ~58 characters
  - Example:
    ```
    fix: resolve issue with repo cloning logic
    chore: update dependencies to latest versions
    ```

## Workflows

_No automated workflows detected in the repository._

## Testing Patterns

- Test files follow the pattern: `*.test.*`
  - Example: `repoList.test.tsx`
- Testing framework is **unknown** (not detected), but tests are colocated with source files using the `.test.` naming convention.
- Example test file:
  ```typescript
  import { render } from '@testing-library/react';
  import { RepoList } from './repoList';

  test('renders repo list', () => {
    render(<RepoList />);
    // assertions here
  });
  ```

## Commands

| Command      | Purpose                                 |
|--------------|-----------------------------------------|
| /test        | Run all test files (`*.test.*`)         |
| /lint        | Lint the codebase                       |
| /commit      | Create a conventional commit            |
| /format      | Format code according to conventions    |

```