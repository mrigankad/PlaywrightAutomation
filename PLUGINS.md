# Plugin System Documentation

The Playwright Automation Tool now features a powerful plugin system that allows you to customize every aspect of the automation pipeline.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Built-in Plugins](#built-in-plugins)
- [Creating Custom Plugins](#creating-custom-plugins)
- [Plugin Reference](#plugin-reference)

## Overview

The plugin system is built around three main plugin types:

1. **EmailProvider** - Connects to email services (Outlook, Gmail, etc.)
2. **DataExtractor** - Extracts structured data from email content
3. **PortalAdapter** - Automates portal searches

## Quick Start

### Simple Usage (One Function)

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

### Advanced Usage (Plugin Registry)

```typescript
import { registerDefaultPlugins, createPipeline, pluginRegistry } from 'playwright-automation-tool';
import { chromium } from 'playwright';

// Register all built-in plugins
registerDefaultPlugins({
  outlook: { email: 'user@company.com', password: 'password' },
  portal: { url: 'https://portal.company.com' },
});

// Launch browser
const browser = await chromium.launch();
const page = await browser.newPage();

// Create and run pipeline
const pipeline = createPipeline(page);
const result = await pipeline.execute({ maxEmails: 10 });

await browser.close();
```

## Built-in Plugins

### Email Providers

#### Outlook Provider

```typescript
import { createOutlookProvider } from 'playwright-automation-tool';

const outlook = createOutlookProvider({
  url: 'https://outlook.office.com/mail/',
  email: 'user@company.com',
  password: 'password',
});

pluginRegistry.register({
  id: 'outlook',
  type: 'email-provider',
  factory: () => outlook,
});
```

### Data Extractors

#### Regex Extractor

```typescript
import { createRegexExtractor } from 'playwright-automation-tool';

const extractor = createRegexExtractor();

// Add custom pattern
extractor.addPattern('projectCode', /PROJ-(\d{4})/i);

pluginRegistry.register({
  id: 'regex-extractor',
  type: 'extractor',
  factory: () => extractor,
});
```

**Default Patterns:**

| Field            | Pattern                                             | Example           |
| ---------------- | --------------------------------------------------- | ----------------- |
| `orderId`        | `ORD(?:ER)?[#\s-]*(\d{4,})`                         | ORD-12345         |
| `invoiceNumber`  | `INV(?:OICE)?[#\s-]*(\d{4,})`                       | INV-00123         |
| `casNumber`      | `CAS\s*#?\s*(\d{2,7}-\d{2}-\d)`                     | CAS 7732-18-5     |
| `trackingNumber` | `TRACK(?:ING)?[#\s:-]*([A-Z0-9]{8,})`               | TRACK-ABC123      |
| `emails`         | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`    | user@example.com  |
| `phones`         | `\+?\d{1,4}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}` | +1 (555) 123-4567 |
| `amounts`        | `[$€£]\s*([\d,]+\.?\d*)`                            | $1,234.56         |
| `dates`          | `\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}`             | 12/25/2023        |

### Portal Adapters

#### Generic Portal Adapter

Works with any portal using CSS selectors:

```typescript
import { createGenericPortalAdapter } from 'playwright-automation-tool';

const adapter = createGenericPortalAdapter();

pluginRegistry.register({
  id: 'generic-portal',
  type: 'portal-adapter',
  factory: () => adapter,
});
```

**Default Selectors:**

```typescript
{
  searchInput: 'input[type="search"], input[name="search"], #search',
  searchButton: 'button[type="submit"], .search-btn, #searchBtn',
  resultsContainer: '.results, .search-results, [data-testid="results"]',
}
```

## Creating Custom Plugins

### Custom Email Provider

```typescript
import { EmailProvider, EmailMessage, ListEmailsOptions } from 'playwright-automation-tool';
import { Page } from 'playwright';

export class GmailProvider implements EmailProvider {
  readonly id = 'gmail';
  readonly name = 'Google Gmail';
  readonly version = '1.0.0';
  readonly type = 'email-provider' as const;

  constructor(private config: { email: string; password: string }) {}

  async authenticate(page: Page): Promise<void> {
    // Implementation
  }

  async isAuthenticated(page: Page): Promise<boolean> {
    // Implementation
    return true;
  }

  async listEmails(page: Page, options?: ListEmailsOptions): Promise<EmailMessage[]> {
    // Implementation
    return [];
  }

  async getEmail(page: Page, emailId: string): Promise<EmailMessage | null> {
    // Implementation
    return null;
  }

  async markAsRead(page: Page, emailId: string): Promise<void> {
    // Implementation
  }

  async moveToFolder(page: Page, emailId: string, folder: string): Promise<void> {
    // Implementation
  }

  async getRawContent(page: Page, emailId: string): Promise<string> {
    // Implementation
    return '';
  }
}
```

### Custom Data Extractor

```typescript
import {
  DataExtractor,
  ExtractionResult,
  ExtractionConfig,
  ExtractedField,
} from 'playwright-automation-tool';

export class LLMExtractor implements DataExtractor {
  readonly id = 'llm-extractor';
  readonly name = 'LLM-based Extractor';
  readonly version = '1.0.0';
  readonly type = 'extractor' as const;

  async extract(content: string, config: ExtractionConfig): Promise<ExtractionResult> {
    const startTime = Date.now();
    const fields: ExtractedField[] = [];

    // Use OpenAI/Anthropic to extract data
    // const response = await openai.chat.completions.create({...});

    for (const fieldConfig of config.fields) {
      // Extract using LLM
      fields.push({
        name: fieldConfig.name,
        value: 'extracted-value',
        confidence: 0.95,
        source: 'llm',
      });
    }

    return {
      fields,
      rawText: content,
      extractedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}
```

### Custom Portal Adapter

```typescript
import {
  PortalAdapter,
  PortalConfig,
  PortalSearchQuery,
  PortalSearchResult,
} from 'playwright-automation-tool';
import { Page } from 'playwright';

export class SalesforceAdapter implements PortalAdapter {
  readonly id = 'salesforce';
  readonly name = 'Salesforce CRM';
  readonly version = '1.0.0';
  readonly type = 'portal-adapter' as const;

  async navigate(page: Page, config: PortalConfig): Promise<void> {
    await page.goto(config.url);
  }

  async authenticate(page: Page, config: PortalConfig): Promise<void> {
    // Salesforce-specific login
  }

  async isAuthenticated(page: Page): Promise<boolean> {
    // Check for Salesforce-specific elements
    return !!(await page.$('.slds-global-header'));
  }

  async search(
    page: Page,
    query: PortalSearchQuery,
    config: PortalConfig
  ): Promise<PortalSearchResult> {
    // Salesforce-specific search
    return {
      success: true,
      timestamp: new Date(),
    };
  }
}
```

## Plugin Reference

### PluginRegistry API

```typescript
// Register a plugin
pluginRegistry.register({
  id: 'my-plugin',
  type: 'email-provider', // or 'extractor' or 'portal-adapter'
  factory: () => new MyPlugin(),
});

// Get a plugin
const plugin = pluginRegistry.get('my-plugin');

// Get typed plugins
const emailProvider = pluginRegistry.getEmailProvider('outlook');
const extractor = pluginRegistry.getExtractor('regex-extractor');
const portalAdapter = pluginRegistry.getPortalAdapter('generic-portal');

// Check if registered
if (pluginRegistry.has('my-plugin')) {
  // ...
}

// List all plugins
const allPlugins = pluginRegistry.list();
const emailProviders = pluginRegistry.listByType('email-provider');

// Initialize all plugins
await pluginRegistry.initializeAll();

// Dispose all plugins
await pluginRegistry.disposeAll();

// Clear all registrations
pluginRegistry.clear();
```

### Pipeline Options

```typescript
export interface PipelineOptions {
  /** Maximum emails to process */
  maxEmails?: number;
  /** Specific email IDs to process */
  emailIds?: string[];
  /** Dry run - extract only, don't search */
  dryRun?: boolean;
  /** Callback for progress updates */
  onProgress?: (result: PipelineStepResult) => void;
}
```

### Pipeline Result

```typescript
export interface PipelineResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  steps: PipelineStepResult[];
  summary: {
    totalEmails: number;
    processedEmails: number;
    successfulSearches: number;
    failedSearches: number;
    errors: number;
  };
}
```

## Examples

### Example 1: Multi-Provider Setup

```typescript
import { pluginRegistry, createPipeline } from 'playwright-automation-tool';

// Register multiple email providers
pluginRegistry.register({
  id: 'outlook-work',
  type: 'email-provider',
  factory: () => createOutlookProvider({ email: 'work@company.com', password: '...' }),
});

pluginRegistry.register({
  id: 'outlook-personal',
  type: 'email-provider',
  factory: () => createOutlookProvider({ email: 'personal@outlook.com', password: '...' }),
});

// Use different providers for different pipelines
const workPipeline = new Pipeline(page, {
  emailProvider: 'outlook-work',
  extractor: 'regex-extractor',
  portalAdapter: 'generic-portal',
  // ...
});
```

### Example 2: Custom Extraction Pipeline

```typescript
import { RegexExtractor } from 'playwright-automation-tool';

const extractor = new RegexExtractor();

// Add company-specific patterns
extractor.addPattern('employeeId', /EMP-(\d{6})/i);
extractor.addPattern('department', /Dept:\s*(\w+)/i);
extractor.addPattern('costCenter', /CC-(\d{4})/i);

pluginRegistry.register({
  id: 'company-extractor',
  type: 'extractor',
  factory: () => extractor,
});
```

### Example 3: Handling Plugin Errors

```typescript
import { PluginNotFoundError, PluginTypeError } from 'playwright-automation-tool';

try {
  const provider = pluginRegistry.getEmailProvider('unknown-provider');
} catch (error) {
  if (error instanceof PluginNotFoundError) {
    console.error('Plugin not found:', error.message);
  } else if (error instanceof PluginTypeError) {
    console.error('Wrong plugin type:', error.message);
  }
}
```

---

For more examples, see the `examples/` directory in the repository.
