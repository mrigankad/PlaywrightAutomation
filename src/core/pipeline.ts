import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../logger';
import {
  PipelineContext,
  PipelineConfiguration,
  PipelineStepResult,
  EmailMessage,
  ExtractionResult,
  PortalSearchResult,
  PortalSearchQuery,
} from './types';
import { pluginRegistry } from './plugin-registry';

/**
 * Pipeline execution options
 */
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

/**
 * Complete pipeline result
 */
export interface PipelineResult {
  /** Run identifier */
  runId: string;
  /** Start time */
  startedAt: Date;
  /** End time */
  completedAt: Date;
  /** Total duration */
  durationMs: number;
  /** All step results */
  steps: PipelineStepResult[];
  /** Summary statistics */
  summary: {
    totalEmails: number;
    processedEmails: number;
    successfulSearches: number;
    failedSearches: number;
    errors: number;
  };
}

/**
 * Pipeline orchestrator using plugins
 */
export class Pipeline {
  private context: PipelineContext;
  private results: PipelineStepResult[] = [];

  constructor(
    private page: Page,
    private config: PipelineConfiguration
  ) {
    this.context = {
      runId: uuidv4(),
      startedAt: new Date(),
      page,
      config,
      state: new Map(),
      results: [],
    };
  }

  /**
   * Execute the full pipeline
   */
  async execute(options: PipelineOptions = {}): Promise<PipelineResult> {
    const startedAt = new Date();
    logger.info('Starting pipeline execution', { runId: this.context.runId });

    try {
      // Get plugins
      const emailProvider = pluginRegistry.getEmailProvider(this.config.emailProvider);
      const extractor = pluginRegistry.getExtractor(this.config.extractor);
      const portalAdapter = pluginRegistry.getPortalAdapter(this.config.portalAdapter);

      // Step 1: Authenticate with email provider
      await this.runStep('email-authenticate', async () => {
        const isAuth = await emailProvider.isAuthenticated(this.page);
        if (!isAuth) {
          await emailProvider.authenticate(this.page);
        }
        return { authenticated: true };
      });

      // Step 2: List emails
      const emailList: EmailMessage[] = await emailProvider.listEmails(this.page, {
        limit: options.maxEmails ?? this.config.automation.maxEmails,
      });

      await this.runStep(
        'list-emails',
        // eslint-disable-next-line @typescript-eslint/require-await
        async () => {
          return { count: emailList.length, emails: emailList.map(e => e.id) };
        }
      );

      // Process each email
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const email of emailList) {
        try {
          const processed = await this.processEmail(
            email,
            emailProvider,
            extractor,
            portalAdapter,
            options.dryRun ?? false
          );
          processedCount++;
          if (processed) {
            successCount++;
          }
        } catch (error) {
          errorCount++;
          logger.error('Failed to process email', {
            emailId: email.id,
            error: (error as Error).message,
          });
        }
      }

      const completedAt = new Date();
      const result: PipelineResult = {
        runId: this.context.runId,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        steps: this.results,
        summary: {
          totalEmails: emailList.length,
          processedEmails: processedCount,
          successfulSearches: successCount,
          failedSearches: processedCount - successCount,
          errors: errorCount,
        },
      };

      logger.info('Pipeline completed', result.summary);
      return result;
    } catch (error) {
      logger.error('Pipeline failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Process a single email through the pipeline
   */
  private async processEmail(
    email: EmailMessage,
    emailProvider: ReturnType<typeof pluginRegistry.getEmailProvider>,
    extractor: ReturnType<typeof pluginRegistry.getExtractor>,
    portalAdapter: ReturnType<typeof pluginRegistry.getPortalAdapter>,
    dryRun: boolean
  ): Promise<boolean> {
    logger.info(`Processing email ${email.id}`, { subject: email.subject });

    // Step 3: Extract data from email
    await this.runStep(
      'extract-data',
      async () => {
        const content = email.body.text ?? email.body.html ?? '';
        const result = await extractor.extract(
          content,
          this.config.extractorConfig ?? { fields: [] }
        );
        return {
          emailId: email.id,
          fields: result.fields.map(f => ({ name: f.name, value: f.value })),
          confidence: Math.min(...result.fields.map(f => f.confidence)),
        };
      },
      { emailId: email.id }
    );

    // Get the extraction result for searching
    const content = email.body.text ?? email.body.html ?? '';
    const extracted: ExtractionResult = await extractor.extract(
      content,
      this.config.extractorConfig ?? { fields: [] }
    );

    if (extracted.fields.length === 0) {
      logger.warn('No data extracted from email', { emailId: email.id });
      return false;
    }

    // Find best field to search
    const searchField = this.selectSearchField(extracted);
    if (!searchField) {
      logger.warn('No searchable field found', { emailId: email.id });
      return false;
    }

    if (dryRun) {
      logger.info('Dry run - skipping portal search', { emailId: email.id });
      return true;
    }

    // Step 4: Authenticate with portal
    await this.runStep('portal-authenticate', async () => {
      const isAuth = await portalAdapter.isAuthenticated(this.page);
      if (!isAuth) {
        await portalAdapter.authenticate(this.page, this.config.portalConfig!);
      }
      return { authenticated: true };
    });

    // Step 5: Navigate to portal
    await this.runStep('portal-navigate', async () => {
      await portalAdapter.navigate(this.page, this.config.portalConfig!);
      return { url: this.page.url() };
    });

    // Step 6: Search portal
    const query: PortalSearchQuery = {
      field: searchField.name,
      value: Array.isArray(searchField.value) ? searchField.value[0] : searchField.value,
      context: { emailId: email.id, subject: email.subject },
    };

    await this.runStep(
      'portal-search',
      async () => {
        const result = await portalAdapter.search(this.page, query, this.config.portalConfig!);
        return {
          success: result.success,
          hasData: result.data !== undefined,
          screenshotPath: result.screenshotPath,
        };
      },
      { emailId: email.id, field: searchField.name }
    );

    // Get actual search result
    const portalResult: PortalSearchResult = await portalAdapter.search(
      this.page,
      query,
      this.config.portalConfig!
    );

    return portalResult.success;
  }

  /**
   * Run a pipeline step with timing and error handling
   */
  private async runStep<T>(stepName: string, fn: () => Promise<T>, input?: unknown): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const output = await fn();
      const durationMs = Date.now() - startTime;

      const result: PipelineStepResult = {
        step: stepName,
        success: true,
        input,
        output,
        durationMs,
        timestamp,
      };

      this.results.push(result);
      this.context.results.push(result);
      return output;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const result: PipelineStepResult = {
        step: stepName,
        success: false,
        input,
        error: (error as Error).message,
        durationMs,
        timestamp,
      };

      this.results.push(result);
      this.context.results.push(result);
      throw error;
    }
  }

  /**
   * Select the best field for portal search
   */
  private selectSearchField(
    extraction: ExtractionResult
  ): { name: string; value: string | string[] } | null {
    // Priority order for search fields
    const priority = ['orderId', 'invoiceNumber', 'trackingNumber', 'casNumber'];

    for (const fieldName of priority) {
      const field = extraction.fields.find(f => f.name === fieldName && f.confidence > 0.5);
      if (field) {
        return { name: field.name, value: field.value };
      }
    }

    // Fall back to highest confidence field
    const bestField = extraction.fields
      .filter(f => f.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (bestField) {
      return { name: bestField.name, value: bestField.value };
    }

    return null;
  }
}
