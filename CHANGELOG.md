# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Package name**: Renamed from `playwright-automation-tool` to `@email-automation/core`
- **License**: Changed from ISC to MIT for broader compatibility
- **Build system**: Added dual module support (ESM + CJS)

### Added

- **Plugin System** - Complete plugin architecture with support for:
  - Email Provider plugins (`EmailProvider` interface)
  - Data Extractor plugins (`DataExtractor` interface)
  - Portal Adapter plugins (`PortalAdapter` interface)
  - `PluginRegistry` for managing plugins
  - `Pipeline` orchestrator using plugins
  - Factory functions for easy setup (`runAutomation`, `createPipeline`)
- Built-in plugins:
  - `OutlookProvider` - Microsoft Outlook 365 Web Client
  - `RegexExtractor` - Pattern-based data extraction with default patterns
  - `GenericPortalAdapter` - Configurable CSS selector-based portal adapter
- Plugin documentation (`PLUGINS.md`)
- Example implementations (`examples/`)
- ESLint configuration with TypeScript support
- Prettier configuration
- Jest testing framework
- GitHub Actions CI/CD pipeline
- Husky pre-commit hooks
- Unit tests for logger, config, plugin-registry, and regex-extractor modules
- Contributing guidelines
- This changelog

### Changed

- Migrated from `.eslintrc.js` to `eslint.config.mjs` (flat config)
- Updated tsconfig.json to include tests
- Replaced `||` with `??` for nullish coalescing throughout codebase

### Fixed

- ESLint errors in all source files
- TypeScript strict mode compliance

## [1.0.0] - 2024-01-XX

### Added

- Initial release
- Outlook email extraction
- Portal search automation
- Configurable extraction patterns
- Authentication persistence
- Structured logging
- CLI interface
- OCR fallback support
