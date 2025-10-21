# Contributing to Campus Navigation App

Thank you for your interest in contributing to the Campus Navigation App! We welcome contributions from the community and are excited to work with you.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Development Scripts](#development-scripts)
- [Project Structure](#project-structure)

## Getting Started

### Prerequisites

- [Node.js (version 18 or higher)](https://nodejs.org/en/download)
- npm package manager
- Git

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/Campus-Navigation-App.git
   cd Campus-Navigation-App
   ```

3. **Add the upstream remote**

   ```bash
   git remote add upstream https://github.com/Phoenix-Programming/Campus-Navigation-App.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173` to see the app running locally.

## Development Workflow

1. **Sync with upstream** before starting work:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** from the current development branch:

   ```bash
   git checkout -b FName_LInitial_IssueNum_Feature-Name
   ```

3. **Make your changes** following the established code style.

4. **Write or update tests** for your changes.

5. **Run the linter** to ensure code quality:

   ```bash
   npm run lint
   ```

6. **Test your changes** thoroughly:

   ```bash
   npm run test
   npm run coverage
   ```

7. **Commit your changes** with a descriptive commit message:

   ```bash
   git add .
   git commit -m "feat: add indoor navigation for IST building"
   ```

8. **Push to your fork**:

   ```bash
   git push origin your-branch-name
   ```

9. **Create a pull request** and provide a clear description of your changes.

10. **Respond to feedback** and make necessary changes requested during review.

## Code Standards

### General Guidelines

- Follow TypeScript best practices
- Use functional components with hooks
- Write comprehensive tests for new features
- Follow the existing file structure and naming conventions
- Ensure accessibility standards are met
- Document complex functions and components

### Code Style

- Use meaningful variable and function names
- Add JSDoc comments for public functions and complex logic
- Follow existing naming conventions:
  - Components: PascalCase (`LeafletMap.tsx`)
  - Files: camelCase for utilities, PascalCase for components
  - Variables and functions: camelCase

### TypeScript Guidelines

- Always use TypeScript types
- Avoid `any` type - use proper type definitions
- Create interfaces for complex objects
- Use type definitions from the `types/` directory

### SCSS Guidelines

- Follow Block Element Modifier (BEM) methodology for SCSS class naming
- Use SCSS variables defined in `src/styles/abstracts/_variables.scss`
- Keep component styles in corresponding files under `src/styles/components/`

## Testing Guidelines

### Test Structure

- Place tests in the `tests/` directory mirroring the `src/` structure
- Use descriptive test names that explain what is being tested
- Group related tests using `describe` blocks
- Use `it` for individual test cases

### Test Types

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **Coverage**: Aim for at least 70% code coverage

### Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run coverage

# Run tests with coverage in watch mode
npm run coverage:watch
```

## Pull Request Process

### Before Submitting

1. **Ensure your code passes all checks**:

   - All tests pass: `npm run test`
   - Linting passes: `npm run lint`
   - Build succeeds: `npm run build`

2. **Update documentation** if needed
3. **Add or update tests** for new functionality
4. **Ensure your branch is up to date** with the main branch

### PR Description

Include the following in your pull request description:

- **Summary**: Brief description of what the PR does
- **Changes**: List of specific changes made
- **Testing**: How you tested your changes
- **Screenshots**: If applicable, add screenshots of UI changes
- **Related Issues**: Reference any related issues using `Closes #42` or `Fixes #92`

### Review Process

1. At least two team members must review and approve the PR
2. All automated checks must pass
3. Address any and all feedback from reviewers
4. Once approved, the PR may be merged

## Development Scripts

The following npm scripts are available for development:

- **`npm run dev`**: Start development server with hot reload
- **`npm run build`**: Build the application for production
- **`npm run lint`**: Run ESLint to check code quality
- **`npm run preview`**: Preview the production build locally
- **`npm run test`**: Run all tests once with Vitest
- **`npm run test:watch`**: Run tests in watch mode
- **`npm run coverage`**: Run tests with coverage report
- **`npm run coverage:watch`**: Run tests in watch mode with coverage

## Project Structure

Understanding the project structure will help you navigate and contribute effectively:

```text
campus-navigation-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── features/       # Feature-specific modules
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API and data services
│   ├── styles/         # SCSS stylesheets
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── tests/              # Test files mirroring src structure
├── public/             # Static assets and data files
└── coverage/           # Test coverage reports
```

For a detailed breakdown of the project structure, see the [README.md](./README.md).

## Questions or Issues?

If you have questions about contributing or encounter issues:

1. Check the [existing issues](https://github.com/Phoenix-Programming/Campus-Navigation-App/issues) on GitHub
2. Create a new issue if your question/problem isn't already addressed
3. Reach out to the team for guidance

Thank you for contributing to the Campus Navigation App!
