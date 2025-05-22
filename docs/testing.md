# Testing in Gitea Mirror

This document provides guidance on testing in the Gitea Mirror project.

## Current Status

The project now uses Bun's built-in test runner, which is Jest-compatible and provides a fast, reliable testing experience. We've migrated away from Vitest due to compatibility issues with Bun.

## Running Tests

To run tests, use the following commands:

```bash
# Run all tests
bun test

# Run tests in watch mode (automatically re-run when files change)
bun test --watch

# Run tests with coverage reporting
bun test --coverage
```

## Test File Naming Conventions

Bun's test runner automatically discovers test files that match the following patterns:

- `*.test.{js|jsx|ts|tsx}`
- `*_test.{js|jsx|ts|tsx}`
- `*.spec.{js|jsx|ts|tsx}`
- `*_spec.{js|jsx|ts|tsx}`

## Writing Tests

The project uses Bun's test runner with a Jest-compatible API. Here's an example test:

```typescript
// example.test.ts
import { describe, test, expect } from "bun:test";

describe("Example Test", () => {
  test("should pass", () => {
    expect(true).toBe(true);
  });
});
```

### Testing React Components

For testing React components, we use React Testing Library:

```typescript
// component.test.tsx
import { describe, test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import MyComponent from "../components/MyComponent";

describe("MyComponent", () => {
  test("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
```

## Test Setup

The test setup is defined in `src/tests/setup.bun.ts` and includes:

- Automatic cleanup after each test
- Setup for any global test environment needs

## Mocking

Bun's test runner provides built-in mocking capabilities:

```typescript
import { test, expect, mock } from "bun:test";

// Create a mock function
const mockFn = mock(() => "mocked value");

test("mock function", () => {
  const result = mockFn();
  expect(result).toBe("mocked value");
  expect(mockFn).toHaveBeenCalled();
});

// Mock a module
mock.module("./some-module", () => {
  return {
    someFunction: () => "mocked module function"
  };
});
```

## CI Integration

The CI workflow has been updated to use Bun's test runner. Tests are automatically run as part of the CI pipeline.

## Test Coverage

To generate test coverage reports, run:

```bash
bun test --coverage
```

This will generate a coverage report in the `coverage` directory.

## Types of Tests

The project includes several types of tests:

1. **Unit Tests**: Testing individual functions and utilities
2. **API Tests**: Testing API endpoints
3. **Component Tests**: Testing React components
4. **Integration Tests**: Testing how components work together

## Future Improvements

When expanding the test suite, consider:

1. Adding more comprehensive API endpoint tests
2. Increasing component test coverage
3. Setting up end-to-end tests with a tool like Playwright
4. Adding performance tests for critical paths
