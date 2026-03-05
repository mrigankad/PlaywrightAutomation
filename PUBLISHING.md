# Publishing Guide

This guide explains how to publish the `@email-automation/core` package to npm.

## Prerequisites

1. **NPM Account**: You need an npm account. If you don't have one, sign up at [npmjs.com](https://www.npmjs.com/).

2. **Scoped Package Access**: Since this is a scoped package (`@email-automation/core`), you need to either:
   - Create an npm organization called `email-automation`, OR
   - Use your personal scope and rename the package

3. **Authentication**: Login to npm from your CLI:
   ```bash
   npm login
   ```

## Pre-Publish Checklist

Before publishing, ensure all checks pass:

```bash
# Run all checks
npm run lint:check      # ESLint
npm run format:check    # Prettier
npm run type-check      # TypeScript
npm test                # Jest tests
npm run build:clean     # Build package
```

Or use the pre-publish script:

```bash
npm run prepublishOnly
```

## Publishing Steps

### 1. Update Version

Choose the appropriate version bump:

```bash
# Patch - bug fixes (1.0.0 -> 1.0.1)
npm run version:patch

# Minor - new features (1.0.0 -> 1.1.0)
npm run version:minor

# Major - breaking changes (1.0.0 -> 2.0.0)
npm run version:major
```

### 2. Create a Release (Recommended)

Use GitHub releases with automatic npm publishing:

1. Push your changes to main
2. Create and push a tag:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```
3. The GitHub Actions workflow will automatically:
   - Run all tests
   - Build the package
   - Publish to npm
   - Create a GitHub release

### 3. Manual Publishing

If you prefer to publish manually:

```bash
# Build the package
npm run build:clean

# Preview what will be published
npm pack

# Publish to npm
npm publish --access public
```

## CI/CD Publishing

The repository includes a GitHub Actions workflow (`.github/workflows/release.yml`) that automatically publishes when you push a version tag.

### Setup

1. Add your npm token to GitHub Secrets:
   - Go to `Settings` > `Secrets and variables` > `Actions`
   - Add `NPM_TOKEN` with your npm automation token

2. Create a release by pushing a tag:
   ```bash
   git tag -a v1.0.0 -m "First stable release"
   git push origin v1.0.0
   ```

## Verifying the Package

After publishing, verify the package works:

```bash
# Create a test directory
mkdir test-install && cd test-install

# Install the package
npm install @email-automation/core

# Test the import
node -e "const { runAutomation } = require('@email-automation/core'); console.log('Import successful!')"
```

## Troubleshooting

### 403 Forbidden

If you get a 403 error, it could mean:

- The package name is already taken
- You're not logged in correctly
- You don't have access to the scope

Solutions:

1. Check if you're logged in: `npm whoami`
2. Verify the package name is unique
3. For scoped packages, ensure you have access or use `--access public`

### Build Failures

If the build fails:

1. Clean node_modules: `rm -rf node_modules && npm install`
2. Check TypeScript errors: `npm run type-check`
3. Ensure all dependencies are installed

### Missing Files in Package

If files are missing from the published package:

1. Check `files` array in package.json
2. Verify `.npmignore` isn't excluding needed files
3. Use `npm pack` to inspect the tarball before publishing

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes that require users to update their code
- **MINOR** - New features that are backward compatible
- **PATCH** - Bug fixes that are backward compatible

### Pre-release Versions

For beta/alpha releases:

```bash
npm version 1.1.0-beta.0
npm publish --tag beta
```

Users can then install with:

```bash
npm install @email-automation/core@beta
```

## Post-Publish

After publishing:

1. **Verify on npm**: Check the package page at `https://www.npmjs.com/package/@email-automation/core`

2. **Update documentation**: Ensure README.md examples use the correct package name

3. **Announce**: Share the release on relevant channels (GitHub releases, Twitter, etc.)

4. **Monitor**: Watch for issues and feedback from early adopters

## License

Ensure the `LICENSE` file is included in the published package. The current MIT license allows free use, modification, and distribution.
