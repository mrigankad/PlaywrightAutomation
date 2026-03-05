import { Page } from 'playwright';
import path from 'path';
import { config } from './config';
import { logger } from './logger';
import { ExtractedData } from './config';

/**
 * Portal search options
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Additional search parameters */
  params?: Record<string, string>;
  /** Wait for results selector */
  waitForResults?: boolean;
  /** Take screenshot after search */
  takeScreenshot?: boolean;
  /** Screenshot filename */
  screenshotName?: string;
}

/**
 * Search result data
 */
export interface SearchResult {
  success: boolean;
  query: string;
  screenshotPath?: string;
  results?: string;
  error?: string;
}

/**
 * Handles portal search operations
 */
export class PortalSearch {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to portal
   */
  async navigate(): Promise<void> {
    logger.info(`🌐 Navigating to portal: ${config.portal.url}`);

    await this.page.goto(config.portal.url, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
  }

  /**
   * Perform search with extracted data
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const { query, params, waitForResults = true, takeScreenshot = true, screenshotName } = options;

    logger.info(`🔎 Searching for: ${query}`);

    try {
      // Clear and fill search input
      const searchInput = await this.getSearchInput();
      await searchInput.fill('');
      await searchInput.fill(query);

      // Add additional parameters if provided
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          const paramInput = await this.page.$(`input[name="${key}"], #${key}`);
          if (paramInput) {
            await paramInput.fill(value);
          }
        }
      }

      // Submit search
      await this.submitSearch();

      // Wait for results
      if (waitForResults) {
        await this.waitForResults();
      }

      // Extract results if available
      const results = await this.extractResults().catch(() => undefined);

      // Take screenshot
      let screenshotPath: string | undefined;
      if (takeScreenshot) {
        screenshotPath = await this.captureResult(query, screenshotName);
      }

      logger.info('✅ Search completed successfully', { query });

      return {
        success: true,
        query,
        screenshotPath,
        results,
      };
    } catch (error) {
      logger.error('❌ Search failed', { error: (error as Error).message, query });

      // Take error screenshot
      const errorScreenshot = await this.captureResult(`${query}-error`, `error-${query}`);

      return {
        success: false,
        query,
        error: (error as Error).message,
        screenshotPath: errorScreenshot,
      };
    }
  }

  /**
   * Get the search input element
   */
  private async getSearchInput() {
    // Try configured selector first
    const configuredInput = await this.page.$(config.selectors.searchInput);
    if (configuredInput) {
      return this.page.locator(config.selectors.searchInput);
    }

    // Fallback selectors
    const fallbackSelectors = [
      'input[type="search"]',
      'input[placeholder*="search" i]',
      'input[name="q"]',
      'input[name="search"]',
      '#search',
      '.search-input',
      '[data-testid*="search"]',
    ];

    for (const selector of fallbackSelectors) {
      const el = await this.page.$(selector);
      if (el) {
        return this.page.locator(selector);
      }
    }

    throw new Error('Could not find search input on portal');
  }

  /**
   * Submit the search query
   */
  private async submitSearch(): Promise<void> {
    // Try configured button first
    const configuredBtn = await this.page.$(config.selectors.searchButton);
    if (configuredBtn) {
      await configuredBtn.click();
      return;
    }

    // Fallback methods
    const methods = [
      // Click search button
      async () => {
        const btn = await this.page.$(
          'button[type="submit"], .search-btn, button:has-text("Search")'
        );
        if (btn) {
          await btn.click();
          return true;
        }
        return false;
      },
      // Press Enter
      async () => {
        const input = await this.getSearchInput();
        await input.press('Enter');
        return true;
      },
      // Click search icon
      async () => {
        const icon = await this.page.$('.search-icon, svg[role="img"], .icon-search');
        if (icon) {
          await icon.click();
          return true;
        }
        return false;
      },
    ];

    for (const method of methods) {
      try {
        const success = await method();
        if (success) {
          await this.page.waitForTimeout(1000);
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error('Could not submit search');
  }

  /**
   * Wait for search results to load
   */
  private async waitForResults(): Promise<void> {
    const resultSelectors = [
      config.selectors.results,
      '.search-results',
      '.results',
      '[data-testid*="result"]',
      '.table-responsive',
      '.grid',
      '.list-group',
      'table',
      '.no-results', // Also consider "no results" as a valid state
    ];

    try {
      await Promise.race(
        resultSelectors.map(selector =>
          this.page.waitForSelector(selector, { timeout: 10000 }).catch(() => null)
        )
      );
      await this.page.waitForTimeout(1000); // Allow results to settle
    } catch {
      logger.warn('Could not detect search results loading');
    }
  }

  /**
   * Extract search results text
   */
  private async extractResults(): Promise<string> {
    const resultSelectors = [
      '.search-results',
      '.results',
      '[data-testid*="result"]',
      'table',
      '.grid',
      '.list-group',
    ];

    for (const selector of resultSelectors) {
      const text = await this.page
        .locator(selector)
        .innerText()
        .catch(() => '');
      if (text && text.length > 10) {
        return text;
      }
    }

    // Return page text as fallback
    return this.page
      .locator('main, body')
      .innerText()
      .catch(() => '');
  }

  /**
   * Capture screenshot of results
   */
  private async captureResult(query: string, customName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeQuery = query.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = customName
      ? `${customName}-${timestamp}.png`
      : `result-${safeQuery}-${timestamp}.png`;

    const screenshotPath = path.join(config.paths.screenshots, filename);

    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    logger.info(`📸 Screenshot saved: ${filename}`);
    return screenshotPath;
  }

  /**
   * Search using specific field from extracted data
   */
  async searchByField(
    data: ExtractedData,
    field: keyof ExtractedData
  ): Promise<SearchResult | null> {
    const value = data[field];

    if (!value || (Array.isArray(value) && value.length === 0)) {
      logger.warn(`Field "${field}" not found in extracted data`);
      return null;
    }

    const query = Array.isArray(value) ? value[0] : value;

    return this.search({
      query,
      screenshotName: `search-${field as string}`,
    });
  }

  /**
   * Batch search with multiple queries
   */
  async batchSearch(queries: string[]): Promise<SearchResult[]> {
    logger.info(`🔄 Starting batch search with ${queries.length} queries`);

    const results: SearchResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      logger.info(`[${i + 1}/${queries.length}] Processing: ${query}`);

      const result = await this.search({
        query,
        screenshotName: `batch-${i + 1}`,
      });

      results.push(result);

      // Small delay between searches
      if (i < queries.length - 1) {
        await this.page.waitForTimeout(1000);
      }
    }

    logger.info('✅ Batch search completed', { total: results.length });
    return results;
  }
}

/**
 * Factory function to create portal search instance
 */
export function createPortalSearch(page: Page): PortalSearch {
  return new PortalSearch(page);
}
