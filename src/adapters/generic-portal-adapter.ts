import path from 'path';

import { Page } from 'playwright';

import { logger } from '../logger';
import { PortalAdapter, PortalConfig, PortalSearchQuery, PortalSearchResult } from '../core/types';

/**
 * Default selectors for common portal patterns
 */
export const defaultSelectors = {
  searchInput: 'input[type="search"], input[name="search"], #search',
  searchButton: 'button[type="submit"], .search-btn, #searchBtn',
  resultsContainer: '.results, .search-results, [data-testid="results"]',
  login: {
    usernameInput: 'input[name="username"], input[type="email"], #username',
    passwordInput: 'input[name="password"], input[type="password"], #password',
    submitButton: 'button[type="submit"], .login-btn, #login',
  },
};

/**
 * Generic portal adapter that works with configurable selectors
 */
export class GenericPortalAdapter implements PortalAdapter {
  readonly id = 'generic-portal';
  readonly name = 'Generic Portal Adapter';
  readonly version = '1.0.0';
  readonly type = 'portal-adapter' as const;
  readonly description = 'Works with any portal using CSS selectors';

  /**
   * Initialize the adapter
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(): Promise<void> {
    logger.info('Generic portal adapter initialized');
  }

  /**
   * Dispose resources
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async dispose(): Promise<void> {
    logger.info('Generic portal adapter disposed');
  }

  /**
   * Navigate to portal
   */
  async navigate(page: Page, config: PortalConfig): Promise<void> {
    logger.info('Navigating to portal', { url: config.url });
    await page.goto(config.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(page: Page): Promise<boolean> {
    // Look for common logged-in indicators
    const indicators = [
      '.user-menu',
      '.dashboard',
      '[data-testid="user-profile"]',
      '.logout',
      '.account',
      'text=/welcome/i',
    ];

    for (const selector of indicators) {
      const element = await page.$(selector);
      if (element) {
        return true;
      }
    }

    // Check for login form
    const loginForm = await page.$('input[type="password"], .login-form');
    return !loginForm;
  }

  /**
   * Authenticate with portal
   */
  async authenticate(page: Page, config: PortalConfig): Promise<void> {
    if (!config.credentials) {
      throw new Error('Credentials required for authentication');
    }

    logger.info('Authenticating with portal');

    const selectors = { ...defaultSelectors.login, ...config.selectors?.login };

    // Find and fill username
    const usernameSelectors = selectors.usernameInput?.split(', ') ?? [
      'input[name="username"]',
      'input[type="email"]',
      '#username',
    ];

    for (const selector of usernameSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.fill(config.credentials.username);
        logger.debug('Username filled');
        break;
      }
    }

    // Find and fill password
    const passwordSelectors = selectors.passwordInput?.split(', ') ?? [
      'input[name="password"]',
      'input[type="password"]',
      '#password',
    ];

    for (const selector of passwordSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.fill(config.credentials.password);
        logger.debug('Password filled');
        break;
      }
    }

    // Click submit
    const submitSelectors = selectors.submitButton?.split(', ') ?? [
      'button[type="submit"]',
      '.login-btn',
      '#login',
    ];

    for (const selector of submitSelectors) {
      const button = await page.$(selector);
      if (button) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
          button.click(),
        ]);
        logger.debug('Login submitted');
        break;
      }
    }

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Verify authentication
    if (!(await this.isAuthenticated(page))) {
      throw new Error('Portal authentication failed');
    }

    logger.info('Successfully authenticated with portal');
  }

  /**
   * Perform search
   */
  async search(
    page: Page,
    query: PortalSearchQuery,
    config: PortalConfig
  ): Promise<PortalSearchResult> {
    logger.info('Performing portal search', { field: query.field, value: query.value });

    const selectors = {
      ...defaultSelectors,
      ...config.selectors,
    };

    const timeout = config.timeouts?.search ?? 10000;

    try {
      // Find search input
      const searchSelectors = selectors.searchInput.split(', ');
      let searchInput = null;

      for (const selector of searchSelectors) {
        searchInput = await page.$(selector);
        if (searchInput) {
          break;
        }
      }

      if (!searchInput) {
        throw new Error('Search input not found');
      }

      // Clear and fill search
      await searchInput.fill('');
      await searchInput.fill(query.value);

      // Find and click search button
      const buttonSelectors = selectors.searchButton?.split(', ') ?? ['button[type="submit"]'];
      let searchButton = null;

      for (const selector of buttonSelectors) {
        searchButton = await page.$(selector);
        if (searchButton) {
          break;
        }
      }

      if (searchButton) {
        await searchButton.click();
      } else {
        // Press Enter
        await searchInput.press('Enter');
      }

      // Wait for results
      await page.waitForTimeout(2000);

      // Wait for results container if specified
      if (selectors.resultsContainer) {
        await page
          .waitForSelector(selectors.resultsContainer, { timeout })
          .catch(() => logger.warn('Results container not found'));
      }

      // Take screenshot
      const screenshotName = `search-${query.field}-${Date.now()}.png`;
      const screenshotPath = path.join(process.cwd(), 'screenshots', screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Try to extract results
      let resultsData: Record<string, unknown> | undefined;
      try {
        resultsData = await this.extractResults(page);
      } catch (error) {
        logger.warn('Could not extract results', { error: (error as Error).message });
      }

      return {
        success: true,
        data: resultsData,
        screenshotPath,
        url: page.url(),
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Search failed', { error: (error as Error).message });

      // Take error screenshot
      const screenshotPath = path.join(
        process.cwd(),
        'screenshots',
        `search-error-${Date.now()}.png`
      );
      await page.screenshot({ path: screenshotPath }).catch(() => {});

      return {
        success: false,
        error: (error as Error).message,
        screenshotPath,
        url: page.url(),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Extract data from search results
   */
  async extractResults(page: Page): Promise<Record<string, unknown>> {
    // Try to extract common result patterns
    const data: Record<string, unknown> = {
      title: await page.title(),
      url: page.url(),
    };

    // Look for result counts
    const resultCount = await page
      .$eval('.result-count, .results-count', el => el.textContent)
      .catch(() => null);

    if (resultCount) {
      data.resultCount = resultCount;
    }

    // Look for result items
    const resultItems = await page
      .locator('.result-item, .search-result, [data-testid="result"]')
      .all();

    data.resultItemCount = resultItems.length;

    return data;
  }

  /**
   * Check if more results available
   */
  async hasMoreResults(page: Page): Promise<boolean> {
    const nextButton = await page.$('.next, .pagination-next, [aria-label="Next"]');
    return !!nextButton;
  }

  /**
   * Load more results
   */
  async loadMoreResults(page: Page): Promise<void> {
    const nextButton = await page.$('.next, .pagination-next, [aria-label="Next"]');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Factory function for creating generic portal adapter
 */
export function createGenericPortalAdapter(): GenericPortalAdapter {
  return new GenericPortalAdapter();
}
