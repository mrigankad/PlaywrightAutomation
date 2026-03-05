/**
 * Example: Creating a Custom Plugin
 *
 * This example shows how to create custom plugins for the automation tool.
 */

import {
  EmailProvider,
  EmailMessage,
  ListEmailsOptions,
  DataExtractor,
  ExtractionResult,
  ExtractionConfig,
  PortalAdapter,
  PortalConfig,
  PortalSearchQuery,
  PortalSearchResult,
  pluginRegistry,
  createPipeline,
} from '../src/index';
import { Page } from 'playwright';

// =============================================================================
// Custom Email Provider: Mock Provider for Testing
// =============================================================================

export class MockEmailProvider implements EmailProvider {
  readonly id = 'mock-email';
  readonly name = 'Mock Email Provider';
  readonly version = '1.0.0';
  readonly type = 'email-provider' as const;
  readonly description = 'Mock provider for testing without real email';

  private mockEmails: EmailMessage[] = [
    {
      id: 'email-1',
      subject: 'Order Confirmation ORD-12345',
      sender: { name: 'Store', email: 'store@example.com' },
      recipients: { to: ['user@example.com'] },
      body: {
        text: 'Thank you for your order ORD-12345. Total: $99.99.',
        html: '<p>Thank you for your order ORD-12345. Total: $99.99.</p>',
      },
      receivedAt: new Date(),
      isRead: false,
    },
    {
      id: 'email-2',
      subject: 'Invoice INV-98765',
      sender: { name: 'Billing', email: 'billing@example.com' },
      recipients: { to: ['user@example.com'] },
      body: {
        text: 'Invoice INV-98765 for $250.00.',
        html: '<p>Invoice INV-98765 for $250.00.</p>',
      },
      receivedAt: new Date(),
      isRead: true,
    },
  ];

  async initialize(): Promise<void> {
    console.log('[MockEmailProvider] Initialized');
  }

  async dispose(): Promise<void> {
    console.log('[MockEmailProvider] Disposed');
  }

  async authenticate(): Promise<void> {
    console.log('[MockEmailProvider] Authenticated (mock)');
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
  }

  async listEmails(_page: Page, options?: ListEmailsOptions): Promise<EmailMessage[]> {
    const limit = options?.limit ?? 10;
    return this.mockEmails.slice(0, limit);
  }

  async getEmail(_page: Page, emailId: string): Promise<EmailMessage | null> {
    return this.mockEmails.find(e => e.id === emailId) || null;
  }

  async markAsRead(): Promise<void> {
    console.log('[MockEmailProvider] Marked as read (mock)');
  }

  async moveToFolder(): Promise<void> {
    console.log('[MockEmailProvider] Moved to folder (mock)');
  }

  async getRawContent(_page: Page, emailId: string): Promise<string> {
    const email = await this.getEmail(_page, emailId);
    return email?.body.text ?? '';
  }

  // Helper to add mock emails
  addMockEmail(email: EmailMessage): void {
    this.mockEmails.push(email);
  }
}

// =============================================================================
// Custom Data Extractor: Simple Keyword Extractor
// =============================================================================

export class KeywordExtractor implements DataExtractor {
  readonly id = 'keyword-extractor';
  readonly name = 'Keyword Extractor';
  readonly version = '1.0.0';
  readonly type = 'extractor' as const;
  readonly description = 'Extracts keywords from text';

  private keywords: Map<string, RegExp> = new Map();

  constructor() {
    // Default keywords
    this.keywords.set('urgent', /urgent|asap|immediately/i);
    this.keywords.set('deadline', /deadline|due date|by\s+\w+/i);
  }

  async initialize(): Promise<void> {
    console.log('[KeywordExtractor] Initialized');
  }

  async extract(content: string, config: ExtractionConfig): Promise<ExtractionResult> {
    const startTime = Date.now();
    const fields = [];

    for (const fieldConfig of config.fields) {
      const pattern = this.keywords.get(fieldConfig.name);
      if (pattern) {
        const matches = content.match(pattern);
        if (matches) {
          fields.push({
            name: fieldConfig.name,
            value: matches[0],
            confidence: 0.9,
            source: 'regex' as const,
          });
        }
      }
    }

    return {
      fields,
      rawText: content,
      extractedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  addKeyword(name: string, pattern: RegExp): void {
    this.keywords.set(name, pattern);
  }
}

// =============================================================================
// Custom Portal Adapter: Mock Portal for Testing
// =============================================================================

export class MockPortalAdapter implements PortalAdapter {
  readonly id = 'mock-portal';
  readonly name = 'Mock Portal';
  readonly version = '1.0.0';
  readonly type = 'portal-adapter' as const;
  readonly description = 'Mock portal for testing';

  async initialize(): Promise<void> {
    console.log('[MockPortalAdapter] Initialized');
  }

  async dispose(): Promise<void> {
    console.log('[MockPortalAdapter] Disposed');
  }

  async navigate(page: Page, config: PortalConfig): Promise<void> {
    console.log('[MockPortalAdapter] Navigating to', config.url);
    await page.goto('about:blank');
  }

  async authenticate(): Promise<void> {
    console.log('[MockPortalAdapter] Authenticated (mock)');
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
  }

  async search(
    _page: Page,
    query: PortalSearchQuery,
    _config: PortalConfig
  ): Promise<PortalSearchResult> {
    console.log('[MockPortalAdapter] Searching for', query.field, '=', query.value);

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      data: {
        query: query.value,
        results: ['Mock Result 1', 'Mock Result 2'],
      },
      timestamp: new Date(),
    };
  }
}

// =============================================================================
// Usage Example
// =============================================================================

async function useCustomPlugins() {
  console.log('=== Custom Plugin Example ===\n');

  // Create custom plugins
  const mockEmailProvider = new MockEmailProvider();
  const keywordExtractor = new KeywordExtractor();
  const mockPortalAdapter = new MockPortalAdapter();

  // Register plugins
  pluginRegistry.register({
    id: 'mock-email',
    type: 'email-provider',
    factory: () => mockEmailProvider,
  });

  pluginRegistry.register({
    id: 'keyword-extractor',
    type: 'extractor',
    factory: () => keywordExtractor,
  });

  pluginRegistry.register({
    id: 'mock-portal',
    type: 'portal-adapter',
    factory: () => mockPortalAdapter,
  });

  // Add custom keywords
  keywordExtractor.addKeyword('orderId', /ORD-\d+/i);
  keywordExtractor.addKeyword('invoiceNumber', /INV-\d+/i);

  // Add mock email
  mockEmailProvider.addMockEmail({
    id: 'email-3',
    subject: 'Urgent: Order Update',
    sender: { email: 'support@example.com' },
    recipients: { to: ['user@example.com'] },
    body: {
      text: 'This is urgent! Please process ORD-99999 immediately.',
    },
    receivedAt: new Date(),
    isRead: false,
  });

  // Create pipeline configuration
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Use custom plugins
    const { Pipeline } = await import('../src/core/pipeline');
    const pipeline = new Pipeline(page, {
      emailProvider: 'mock-email',
      extractor: 'keyword-extractor',
      portalAdapter: 'mock-portal',
      extractorConfig: {
        fields: [
          { name: 'orderId', label: 'Order ID' },
          { name: 'urgent', label: 'Urgent Flag' },
        ],
      },
      portalConfig: {
        url: 'https://mock-portal.example.com',
      },
      automation: {
        headless: true,
        slowMo: 0,
        maxEmails: 10,
        screenshotsDir: './screenshots',
      },
    });

    // Execute
    const result = await pipeline.execute({ maxEmails: 3 });

    console.log('\nPipeline completed!');
    console.log('Summary:', result.summary);
    console.log('Steps:', result.steps.length);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  useCustomPlugins().catch(console.error);
}
