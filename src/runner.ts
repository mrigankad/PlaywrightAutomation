import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from './config';
import { logger } from './logger';
import { authManager } from './auth';
import { createMailExtractor } from './mailExtractor';
import type { ExtractedData } from './config';
import { createPortalSearch, SearchResult } from './portalSearch';

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  emailIndex: number;
  extractedData: ExtractedData | null;
  searchResult?: SearchResult;
  processed: boolean;
  error?: string;
}

/**
 * Main automation orchestrator
 */
export class AutomationRunner {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private results: PipelineResult[] = [];

  /**
   * Initialize browser and context
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing automation runner...');

    this.browser = await chromium.launch({
      headless: config.automation.headless,
      slowMo: config.automation.slowMo,
    });

    // Use saved auth if available
    const storageState = authManager.getStorageState();

    this.context = await this.browser.newContext({
      ...storageState,
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();

    // Enable console logging in debug mode
    if (config.logging.level === 'debug') {
      this.page.on('console', msg => logger.debug(`[Browser Console] ${msg.text()}`));
    }

    logger.info('✅ Browser initialized');
  }

  /**
   * Authenticate with Outlook
   */
  async authenticateOutlook(): Promise<void> {
    if (!this.page) {
      throw new Error('Runner not initialized');
    }

    await authManager.loginToOutlook(this.page);
    await authManager.saveAuth(this.context!);
  }

  /**
   * Authenticate with Portal
   */
  async authenticatePortal(): Promise<void> {
    if (!this.page) {
      throw new Error('Runner not initialized');
    }

    await authManager.loginToPortal(this.page);
    await authManager.saveAuth(this.context!);
  }

  /**
   * Process a single email through the pipeline
   */
  async processEmail(emailIndex: number): Promise<PipelineResult> {
    if (!this.page) {
      throw new Error('Runner not initialized');
    }

    logger.info(`📧 Processing email ${emailIndex + 1}...`);

    const extractor = createMailExtractor(this.page);
    const result: PipelineResult = {
      emailIndex,
      extractedData: null,
      processed: false,
    };

    try {
      // Open email
      await extractor.openEmail(emailIndex);

      // Extract header info for logging
      const headerInfo = await extractor.extractHeaderInfo();
      logger.info('📧 Email opened', {
        subject: headerInfo.subject,
        sender: headerInfo.sender,
      });

      // Extract data from email
      const data = await extractor.extractData();
      result.extractedData = data;

      if (!data) {
        logger.warn('⚠️ No data extracted from email');
        result.processed = false;
        return result;
      }

      // Determine what to search for (prioritize orderId, invoiceNumber, etc.)
      const searchField = this.getSearchField(data);

      if (searchField && (data as Record<string, unknown>)[searchField]) {
        // Navigate to portal and search
        const searcher = createPortalSearch(this.page);
        await searcher.navigate();

        const fieldValue = (data as Record<string, unknown>)[searchField];
        const searchValue = Array.isArray(fieldValue) ? String(fieldValue[0]) : String(fieldValue);

        result.searchResult = await searcher.search({
          query: searchValue,
          screenshotName: `email-${emailIndex + 1}-${searchField as string}`,
        });

        result.processed = result.searchResult.success;

        // Go back to Outlook
        await this.page.goto(config.outlook.url);
        await this.page.waitForSelector('[role="main"]', { timeout: 10000 });
      } else {
        logger.warn('⚠️ No searchable field found in extracted data');
      }

      // Optionally mark as processed
      if (result.processed && config.automation.processedFolder) {
        await extractor.moveToFolder(config.automation.processedFolder);
      }
    } catch (error) {
      logger.error(`❌ Error processing email ${emailIndex + 1}`, {
        error: (error as Error).message,
      });
      result.error = (error as Error).message;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Run full pipeline on multiple emails
   */
  async runPipeline(
    options: {
      maxEmails?: number;
      searchField?: keyof ExtractedData;
    } = {}
  ): Promise<PipelineResult[]> {
    const { maxEmails = config.automation.maxEmails } = options;

    logger.info('🏃 Starting automation pipeline...', { maxEmails });

    try {
      // Initialize
      await this.initialize();

      // Authenticate with Outlook
      await this.authenticateOutlook();

      // Process each email
      for (let i = 0; i < maxEmails; i++) {
        try {
          await this.processEmail(i);
        } catch (error) {
          logger.error(`Failed to process email ${i + 1}`, {
            error: (error as Error).message,
          });
        }

        // Small delay between emails
        if (i < maxEmails - 1) {
          await this.page!.waitForTimeout(1500);
        }
      }

      // Summary
      this.printSummary();
    } catch (error) {
      logger.error('Pipeline failed', { error: (error as Error).message });
    } finally {
      await this.cleanup();
    }

    return this.results;
  }

  /**
   * Run with pre-authenticated state
   */
  async runQuick(
    options: {
      maxEmails?: number;
    } = {}
  ): Promise<PipelineResult[]> {
    const { maxEmails = config.automation.maxEmails } = options;

    if (!authManager.hasSavedAuth()) {
      logger.info('No saved auth found. Running full authentication...');
      return this.runPipeline({ maxEmails });
    }

    logger.info('🚀 Running with saved authentication...');

    try {
      await this.initialize();

      // Go directly to Outlook
      await this.page!.goto(config.outlook.url);
      await this.page!.waitForSelector('[role="main"]', { timeout: 15000 });

      // Process emails
      for (let i = 0; i < maxEmails; i++) {
        await this.processEmail(i);
      }

      this.printSummary();
    } catch (error) {
      logger.error('Quick run failed', { error: (error as Error).message });
    } finally {
      await this.cleanup();
    }

    return this.results;
  }

  /**
   * Get the best field to search for
   */
  private getSearchField(data: ExtractedData): keyof ExtractedData | null {
    // Priority order for search fields
    const priority: (keyof ExtractedData)[] = [
      'orderId',
      'invoiceNumber',
      'trackingNumber',
      'rateCardId',
      'casNumber',
    ];

    for (const field of priority) {
      if (data[field]) {
        return field;
      }
    }

    return null;
  }

  /**
   * Print execution summary
   */
  private printSummary(): void {
    const total = this.results.length;
    const processed = this.results.filter(r => r.processed).length;
    const errors = this.results.filter(r => r.error).length;

    logger.info('📊 Pipeline Summary');
    logger.info('='.repeat(40));
    logger.info(`Total emails processed: ${total}`);
    logger.info(`Successfully processed: ${processed}`);
    logger.info(`Errors: ${errors}`);
    logger.info('='.repeat(40));

    // List processed items
    this.results.forEach((result, idx) => {
      const status = result.processed ? '✅' : result.error ? '❌' : '⚠️';
      const field = result.extractedData ? this.getSearchField(result.extractedData) : null;
      const value = field && result.extractedData ? result.extractedData[field] : 'N/A';

      logger.info(
        `${status} Email ${idx + 1}: ${String(field ?? 'no data')} = ${Array.isArray(value) ? value[0] : value}`
      );
    });
  }

  /**
   * Get results
   */
  getResults(): PipelineResult[] {
    return this.results;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up...');

    if (this.browser) {
      await this.browser.close();
    }

    logger.info('✅ Cleanup complete');
  }
}

/**
 * Main execution function
 */
export async function main(): Promise<void> {
  const runner = new AutomationRunner();

  try {
    await runner.runPipeline();
  } catch (error) {
    logger.error('Main execution failed', { error: (error as Error).message });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  void main();
}
