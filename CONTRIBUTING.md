# Contributing to Playwright Automation Tool

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/yourusername/playwright-automation-tool.git
   cd playwright-automation-tool
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

## Development Workflow

### Code Quality

We use several tools to maintain code quality:

- **ESLint**: Linting for TypeScript
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Jest**: Unit and integration testing

### Before Committing

Run these commands to ensure your changes pass all checks:

```bash
# Run all checks
npm run lint:check      # ESLint
npm run format:check    # Prettier
npm run type-check      # TypeScript
npm test               # Jest tests

# Or run all at once (CI does this)
npm run lint:check && npm run type-check && npm test
```

### Pre-commit Hooks

This project uses Husky and lint-staged to run checks before each commit:

- ESLint auto-fix
- Prettier formatting

If the hooks fail, fix the issues and try committing again.

## Project Structure

```
src/
 ├─ config.ts          # Configuration & extraction patterns
 ├─ logger.ts          # Structured logging
 ├─ auth.ts            # Authentication manager
 ├─ mailExtractor.ts   # Email data extraction
 ├─ portalSearch.ts    # Portal search operations
 ├─ runner.ts          # Main orchestrator
 ├─ ocrFallback.ts     # OCR fallback
 ├─ cli.ts             # Command line interface
 └─ index.ts           # Public API exports

tests/
 ├─ unit/              # Unit tests
 ├─ integration/       # Integration tests
 └─ fixtures/          # Test fixtures
```

## Writing Tests

### Unit Tests

Place unit tests in `tests/unit/` with the naming pattern `*.test.ts`:

```typescript
import { myFunction } from '../../src/myModule';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

### Integration Tests

Place integration tests in `tests/integration/`:

```typescript
describe('Email Extraction Pipeline', () => {
  it('should extract data from Outlook', async () => {
    // Integration test code
  });
});
```

### Test Coverage

We aim for:

- **70%+** line coverage
- **60%+** branch coverage

Run coverage report:

```bash
npm run test:coverage
```

## Code Style

### TypeScript

- Use strict TypeScript settings
- Explicit return types for public functions
- Prefer `??` over `||` for nullish coalescing
- Use `const` and `let`, never `var`

### Naming Conventions

- `PascalCase` for classes and interfaces
- `camelCase` for functions and variables
- `SCREAMING_SNAKE_CASE` for constants
- `kebab-case` for file names

### Example

```typescript
// Good
export class DataExtractor {
  private readonly config: ExtractorConfig;

  constructor(config: ExtractorConfig) {
    this.config = config;
  }

  public async extract(email: Email): Promise<ExtractedData> {
    const text = await this.getText(email);
    return this.parse(text);
  }
}

// Bad
export class data_extractor {
  config: any;

  constructor(cfg) {
    this.config = cfg;
  }

  extract(email) {
    var text = this.getText(email);
    return this.parse(text);
  }
}
```

## Submitting Changes

1. **Create a branch**

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Run checks**

   ```bash
   npm run lint:check && npm run type-check && npm test
   ```

4. **Commit**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `test:` Tests
   - `refactor:` Code refactoring
   - `chore:` Maintenance

5. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

## Reporting Issues

When reporting issues, please include:

1. **Description**: Clear description of the issue
2. **Steps to reproduce**: Minimal steps to reproduce
3. **Expected behavior**: What you expected to happen
4. **Actual behavior**: What actually happened
5. **Environment**: Node version, OS, etc.
6. **Logs**: Relevant log output

## Questions?

Feel free to open an issue for questions or join our discussions.

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
