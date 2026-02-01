# AGENTS.md

This guide outlines essential development processes and conventions for maintaining and contributing to the IBRA platform. This document is designed to help agentic coding agents (like yourself) integrate seamlessly into the development workflow of the IBRA project.

## 1. Build, Lint, and Test Commands
The following commands are used to build, lint, and test the IBRA project. Make sure to use these standards during development.

### General Commands

- **Install dependencies for both frontend and backend:**
  ```bash
  npm install
  ```

- **Run both frontend and backend:**
  ```bash
  npm run dev
  # OR individually:
  # For frontend:
  npm run start:frontend

  # For backend:
  npm run start:backend
  ```

### Frontend Commands
- **Start the development server:**
  ```bash
  npm run start:frontend
  ```
- **Build the production version:**
  ```bash
  npm run build:frontend
  ```
- **Lint the code:**
  ```bash
  npm run lint:frontend
  ```
- **Run all tests:**
  ```bash
  npm run test:frontend
  ```
- **Run a single test:**
  ```bash
  npm run test:frontend -- [test-file-path]
  ```

### Backend Commands
- **Start the backend server:**
  ```bash
  npm run start:backend
  ```
- **Build the backend project:**
  ```bash
  npm run build:backend
  ```
- **Lint and format the backend code:**
  ```bash
  npm run lint:backend
  ```
- **Run backend tests:**
  ```bash
  npm run test:backend
  ```
- **Run a single backend test:**
  ```bash
  npm run test:backend -- [test-file-path]
  ```

## 2. Code Style Guidelines
Follow these guidelines to ensure code consistency and maintainability across the IBRA project.

### 2.1 Imports
- **Order:**
  1. Core node modules (e.g., `fs`, `path`).
  2. External libraries from `node_modules` (e.g., `react`, `lodash`).
  3. Internal project modules/paths.

- **Group and sort imports:**
  ```javascript
  // Example
  import fs from 'fs';
  import path from 'path';

  import React from 'react';
  import { useState } from 'react';

  import MyComponent from '../components/MyComponent';
  import utils from '../lib/utils';
  ```

- Use absolute imports when navigating within the project structure.

### 2.2 Formatting
- Use [Prettier](https://prettier.io/) for consistent code formatting. Follow the `.prettierrc` configuration.
  - Run the formatter with:
    ```bash
    npm run format
    ```
- Line length: Maximum of 80 characters.
- Use 2 spaces for indentation.

### 2.3 Types
- Use **TypeScript** for static type-checking.
- Use interfaces or types for defining object shapes.
- Prefer `type` aliases over `interface` for simple structures.
- Explicitly type function arguments and return values.
  ```typescript
  const getDramaTitle = (id: string): string => {
    // Function logic
    return title;
  };
  ```
- Use `unknown` over `any` where applicable.

### 2.4 Naming Conventions
- **Variables:** Use `camelCase` for variable and function names.
- **Constants:** Use `UPPER_CASE` and snake case for constants.
- **Interfaces:** Prefix interface names with `I` (e.g., `IDrama`, `IUser`).
- **React Components:** Use `PascalCase` for component names (e.g., `VideoPlayer`).
- Folder/filename structure:
  - Use `kebab-case` for filenames and folders, e.g., `video-player.tsx`, `home-page.tsx`.

### 2.5 Error Handling
- Handle errors gracefully and display meaningful messages to the user.
- Use `try/catch` blocks for promise-based functions:
  ```javascript
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error('Error during data fetch:', error);
    throw new Error('Failed to fetch data. Please try again.');
  }
  ```
- Avoid exposing stack traces or sensitive server information in client-side error messages.

### 2.6 Comments
- Use JSDoc format for function and class documentation.
  ```javascript
  /**
   * Fetch the details of a drama.
   * @param {string} dramaId - The unique ID of the drama.
   * @returns {Promise<IDrama>} - Promise resolving to the drama details.
   */
  async function fetchDramaDetails(dramaId) {
    // Function logic
  }
  ```
- Avoid unnecessary comments. Write self-documenting code.

### 2.7 Best Practices
- Follow [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
- Use `async/await` for asynchronous operations.
- Keep components small and focused.
- Use React hooks (e.g., `useEffect`, `useState`) for state management wherever applicable.
- Avoid using magic numbers or hardcoded values. Use constants.
- Use environmental variables for sensitive values in the `.env` file.

### 2.8 Tests
- Write tests for **critical functions and features**.
- Use **Jest** for testing front-end components and utility functions.
- Use **Supertest** or equivalent for backend API endpoint testing (if applicable).
- Follow the `AAA` (Arrange-Act-Assert) format for tests.
- Follow these naming conventions for test files:
  - End with `.test.ts` or `.spec.ts`.

```javascript
// Example Jest Test
import { getDramaTitle } from '../lib/utils';
describe('getDramaTitle', () => {
  it('should return the title for a valid drama ID', () => {
    const title = getDramaTitle('123');
    expect(title).toBe('My Drama Title');
  });
});
```

### 2.9 Versioning
- Use **semantic versioning** (major.minor.patch) for releases.
- Update the `CHANGELOG.md` upon introducing significant changes.
  - Follow this format:
    ```plaintext
    ## [Version] - YYYY-MM-DD
    ### Added
    - List of new features or additions
    ### Changed
    - List of changes
    ### Fixed
    - List of bug fixes
    ```