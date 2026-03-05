# Email Automation Core

[![npm version](https://badge.fury.io/js/@email-automation%2Fcore.svg)](https://www.npmjs.com/package/@email-automation/core)
[![npm downloads](https://img.shields.io/npm/dm/@email-automation/core.svg)](https://www.npmjs.com/package/@email-automation/core)
[![CI/CD](https://github.com/yourusername/email-automation-tool/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/yourusername/email-automation-tool/actions)
[![codecov](https://codecov.io/gh/yourusername/email-automation-tool/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/email-automation-tool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Production-grade automation pipeline** that extracts structured data from emails and searches for it on external portals. Built with Playwright and featuring an extensible plugin architecture.

## Installation

```bash
npm install @email-automation/core
```

Or with yarn:

```bash
yarn add @email-automation/core
```

Or with pnpm:

```bash
pnpm add @email-automation/core
```

### Peer Dependencies

This package requires Playwright browsers to be installed:

```bash
npx playwright install chromium
```

## Architecture

```
Outlook → Extract Structured Data → Transform → Navigate to Portal → Search → Capture Result
```

## Features

- ✅ **Plugin Architecture** - Swappable email providers, extractors, and portal adapters
- ✅ **DOM-based extraction** (faster & more accurate than OCR)
- ✅ **Modular design** (easy to extend and maintain)
- ✅ **Authentication persistence** (saves login state)
- ✅ **Comprehensive logging** (structured JSON logs)
- ✅ **Configurable patterns** (extract Order IDs, CAS numbers, etc.)
- ✅ **Error handling & retry logic**
- ✅ **OCR fallback** (for image-based emails)
- ✅ **Enterprise features** (move processed emails to folders)
- ✅ **TypeScript** - Full type safety and IntelliSense support

## Project Structure

```
src/
 ├─ core/               # Plugin system core
 │   ├─ types.ts       # Plugin interfaces
 │   ├─ plugin-registry.ts  # Plugin management
 │   ├─ pipeline.ts    # Pipeline orchestrator
 │   └─ factory.ts     # Factory functions
 ├─ providers/          # Email provider plugins
 │   └─ outlook-provider.ts
 ├─ plugins/            # Data extractor plugins
 │   └─ regex-extractor.ts
 ├─ adapters/           # Portal adapter plugins
 │   └─ generic-portal-adapter.ts
 ├─ config.ts          # Configuration & extraction patterns
 ├─ logger.ts          # Structured logging
 ├─ auth.ts            # Authentication manager
 ├─ mailExtractor.ts   # Email data extraction (legacy)
 ├─ portalSearch.ts    # Portal search operations (legacy)
 ├─ runner.ts          # Main orchestrator (legacy)
 ├─ ocrFallback.ts     # OCR fallback
 ├─ cli.ts             # Command line interface
 └─ index.ts           # Public API exports

storage/               # Auth state storage
screenshots/           # Result screenshots
logs/                  # Execution logs
```

## Quick Start

### As a Library

```typescript
import { runAutomation } from '@email-automation/core';

const result = await runAutomation(
  {
    outlook: {
      email: 'user@company.com',
      password: 'password123',
    },
    portal: {
      url: 'https://portal.company.com',
      username: 'portal-user',
      password: 'portal-pass',
    },
    extraction: {
      fields: [
        { name: 'orderId', label: 'Order ID' },
        { name: 'invoiceNumber', label: 'Invoice Number' },
      ],
    },
  },
  {
    maxEmails: 5,
  }
);

console.log('Processed:', result.summary.processedEmails);
console.log('Successful:', result.summary.successfulSearches);
```

### As a CLI

```bash
# Install globally
npm install -g @email-automation/core

# Set environment variables
export OUTLOOK_EMAIL=user@company.com
export OUTLOOK_PASSWORD=password
export PORTAL_URL=https://portal.company.com

# Run
email-automation --count 5
```

### With Custom Plugins

```typescript
import { pluginRegistry, createPipeline } from '@email-automation/core';
import { MyCustomProvider } from './my-provider';

// Register custom plugin
pluginRegistry.register({
  id: 'my-provider',
  type: 'email-provider',
  factory: () => new MyCustomProvider(),
});

// Use it
const pipeline = createPipeline(page, {
  emailProvider: 'my-provider',
  // ...
});
```

## Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/email-automation-tool.git
cd email-automation-tool
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Tests

```bash
npm test
```

## Usage

### Quick Start

Process emails with full authentication:

```bash
npm run dev
```

### CLI Commands

```bash
# Process 5 emails
npm run cli -- --count 5

# Quick run with saved auth
npm run cli -- --quick --count 3

# Headless mode
npm run cli -- --headless --count 10

# Show help
npm run cli -- --help
```

### Programmatic API

#### Legacy API (still supported)

```typescript
import { AutomationRunner } from './src/runner';

const runner = new AutomationRunner();

// Run full pipeline
await runner.runPipeline({ maxEmails: 5 });

// Or use saved auth for faster runs
await runner.runQuick({ maxEmails: 3 });
```

#### New Plugin API (recommended)

```typescript
import { runAutomation } from 'playwright-automation-tool';

const result = await runAutomation(
  {
    outlook: {
      email: 'user@company.com',
      password: 'password123',
    },
    portal: {
      url: 'https://portal.company.com',
      username: 'portal-user',
      password: 'portal-pass',
    },
    extraction: {
      fields: [
        { name: 'orderId', label: 'Order ID' },
        { name: 'invoiceNumber', label: 'Invoice Number' },
      ],
    },
  },
  {
    maxEmails: 5,
  }
);

console.log('Processed:', result.summary.processedEmails);
console.log('Successful:', result.summary.successfulSearches);
```

### Plugin System

The tool now supports a powerful plugin architecture:

- **Email Providers**: Outlook (built-in), or create your own for Gmail, IMAP, etc.
- **Data Extractors**: Regex-based (built-in), or create custom extractors using LLMs
- **Portal Adapters**: Generic adapter (built-in), or create specific adapters for Salesforce, SAP, etc.

See [PLUGINS.md](./PLUGINS.md) for detailed documentation and examples.

## Custom Extraction Patterns

Based on your email structure, customize patterns in `src/config.ts`:

| Field      | Example Pattern | Matches                    |
| ---------- | --------------- | -------------------------- |
| Order ID   | `ORD-12345`     | ORD-12345, ORDER-12345     |
| CAS Number | `CAS 123-45-6`  | CAS 123-45-6, CAS#123-45-6 |
| Invoice    | `INV-00123`     | INV-00123, INVOICE #00123  |
| Tracking   | `TRACK-ABC123`  | Various tracking formats   |
| Rate Card  | `RC-12345`      | RC-12345, RATECARD-12345   |

## How It Works

1. **Initialize**: Launch browser with saved auth if available
2. **Outlook Login**: Authenticate with Microsoft if needed
3. **Extract Emails**: Iterate through inbox emails
4. **Parse Data**: Use regex patterns to extract structured data
5. **Portal Search**: Navigate to portal and search extracted data
6. **Capture Results**: Take screenshots of search results
7. **Cleanup**: Move processed emails to folder (optional)

## OCR Fallback

For image-based emails, OCR is available:

```bash
# OCR is automatically used when DOM extraction fails
# Or force it programmatically:
import { OCRFallback } from './src/ocrFallback';

const ocr = new OCRFallback(page);
const text = await ocr.extractTextFromScreenshot();
```

⚠️ OCR is 5x slower than DOM extraction. Use only when necessary.

## Logging

Logs are stored in `logs/` directory with structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Data extracted successfully",
  "fields": ["orderId", "casNumber"]
}
```

## Enterprise Features

- **Processed folder tagging**: Automatically move emails after processing
- **Batch operations**: Process multiple emails in sequence
- **Error tracking**: Detailed error logging with screenshots
- **Retry logic**: Built-in handling for transient failures
- **Configurable selectors**: Adapt to different portal designs

## Troubleshooting

### Portal selectors not working?

Customize selectors in `.env`:

```env
SEARCH_INPUT_SELECTOR=your-custom-selector
SEARCH_BUTTON_SELECTOR=your-custom-selector
```

### Login failing?

1. Delete `storage/auth.json` to force re-authentication
2. Check credentials in `.env`
3. Run with `HEADLESS=false` to see what's happening

### Extracting wrong data?

Update patterns in `src/config.ts` to match your email format.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[MIT](./LICENSE) © Your Name
