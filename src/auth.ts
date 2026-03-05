import { BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { logger } from './logger';

/**
 * Manages authentication state for Outlook and portal
 */
export class AuthManager {
  private storagePath: string;

  constructor() {
    this.storagePath = config.paths.storage;
  }

  /**
   * Check if saved auth state exists
   */
  hasSavedAuth(): boolean {
    return fs.existsSync(this.storagePath);
  }

  /**
   * Get auth state path for Playwright context
   */
  getStorageState(): { storageState: string } | undefined {
    if (this.hasSavedAuth()) {
      return { storageState: this.storagePath };
    }
    return undefined;
  }

  /**
   * Take a debug screenshot
   */
  private async takeDebugScreenshot(page: Page, name: string): Promise<void> {
    const screenshotPath = path.join(config.paths.screenshots, `debug-${name}-${Date.now()}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.info(`📸 Debug screenshot saved: ${screenshotPath}`);
    } catch (e) {
      logger.warn(`Failed to take debug screenshot: ${(e as Error).message}`);
    }
  }

  /**
   * Perform Outlook login if not authenticated
   */
  async loginToOutlook(page: Page): Promise<void> {
    logger.info('🔐 Checking Outlook authentication...');

    await page.goto(config.outlook.url, { waitUntil: 'domcontentloaded' });

    // Wait for either the email list (already logged in) or login form
    const result = await Promise.race([
      page
        .waitForSelector(
          '[role="listbox"], [data-testid="mail-folder-list"], .mailListItem, .ms-List-cell',
          { timeout: 15000 }
        )
        .then(() => 'logged_in'),
      page
        .waitForSelector('input[type="email"], input[name="loginfmt"], input[name="username"]', {
          timeout: 15000,
        })
        .then(() => 'needs_login'),
      page.waitForSelector('#idSIButton9, #lightbox', { timeout: 15000 }).then(() => 'needs_login'),
      page.waitForSelector('[name="passwd"]', { timeout: 15000 }).then(() => 'password_only'),
    ]).catch(() => 'unknown');

    if (result === 'logged_in') {
      logger.info('✅ Already logged into Outlook');
      return;
    }

    logger.info(`🔑 Performing Outlook login (detected: ${result})...`);

    // Microsoft Login Flow with improved handling
    try {
      // Wait for page to settle after detecting login state
      await page.waitForTimeout(3000);

      // Handle email entry
      if (result === 'needs_login') {
        // Try multiple email input selectors
        const emailSelectors = [
          'input[type="email"]',
          'input[name="loginfmt"]',
          'input[name="username"]',
          'input[id*="email"]',
          'input[id*="user"]',
          'input[placeholder*="email" i]',
        ];

        let emailInput = null;
        for (const selector of emailSelectors) {
          emailInput = await page.$(selector);
          if (emailInput) {
            logger.debug(`Found email input using: ${selector}`);
            break;
          }
        }

        if (!emailInput) {
          await this.takeDebugScreenshot(page, 'no-email-input');
          throw new Error('Could not find email input field');
        }

        // Clear and fill email
        await emailInput.click();
        await emailInput.fill(config.outlook.email);
        logger.info('📧 Email entered');

        // Try to find and click the submit/next button
        const nextSelectors = [
          'input[type="submit"]',
          'button[type="submit"]',
          '#idSIButton9',
          '#next',
          'button:has-text("Next")',
          'button:has-text("Continue")',
          'input[value="Next"]',
        ];

        let nextButton = null;
        for (const selector of nextSelectors) {
          try {
            nextButton = await page.waitForSelector(selector, { timeout: 2000 });
            if (nextButton) {
              break;
            }
          } catch {
            continue;
          }
        }

        if (nextButton) {
          await Promise.all([
            page
              .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 })
              .catch(() => {}),
            nextButton.click(),
          ]);
        } else {
          // Try pressing Enter
          await emailInput.press('Enter');
          await page.waitForTimeout(2000);
        }
      }

      // Wait for password field or next step
      await page.waitForTimeout(2000);

      // Handle "Pick an account" screen
      const accountSelector = await page.$(
        '[data-testid="userDisplayName"], .table-cell, .account-item'
      );
      if (accountSelector) {
        logger.info('🔄 Handling account selection screen...');
        // Click the first account
        await accountSelector.click();
        await page.waitForTimeout(2000);
      }

      // Handle password entry
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="passwd"]',
        'input[id*="password"]',
        'input[placeholder*="password" i]',
      ];

      let passwordInput = null;
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await page.waitForSelector(selector, { timeout: 5000 });
          if (passwordInput) {
            logger.debug(`Found password input using: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }

      if (passwordInput) {
        await passwordInput.fill(config.outlook.password);
        logger.info('🔑 Password entered');

        // Find and click sign in button
        const signInSelectors = [
          'input[type="submit"]',
          'button[type="submit"]',
          '#idSIButton9',
          '#submitBtn',
          'button:has-text("Sign in")',
          'input[value="Sign in"]',
        ];

        let signInButton = null;
        for (const selector of signInSelectors) {
          try {
            signInButton = await page.waitForSelector(selector, { timeout: 2000 });
            if (signInButton) {
              break;
            }
          } catch {
            continue;
          }
        }

        if (signInButton) {
          await Promise.all([
            page
              .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
              .catch(() => {}),
            signInButton.click(),
          ]);
        } else {
          await passwordInput.press('Enter');
          await page.waitForTimeout(3000);
        }
      }

      // Handle "Stay signed in?" prompt
      await this.handleStaySignedInPrompt(page);

      // Handle "Don't show this again" checkbox
      await this.handleDontShowAgain(page);

      // Wait for Outlook to load - try multiple selectors
      const outlookSelectors = [
        '[role="listbox"]', // Email list container
        '[data-testid="mail-folder-list"]', // Folder list (left sidebar)
        '.mailListItem', // Individual mail items
        '.ms-List-cell', // Fluent UI list cells
        '[role="listitem"]', // Generic list items
        '[data-conversation-id]', // Conversation items
      ];

      let loaded = false;
      for (const selector of outlookSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 10000 });
          loaded = true;
          logger.debug(`Outlook loaded with selector: ${selector}`);
          break;
        } catch {
          continue;
        }
      }

      if (!loaded) {
        await this.takeDebugScreenshot(page, 'outlook-not-loaded');
        throw new Error('Outlook did not load after login');
      }

      logger.info('✅ Successfully logged into Outlook');
    } catch (error) {
      await this.takeDebugScreenshot(page, 'login-error');
      logger.error('❌ Outlook login failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Handle "Stay signed in?" prompt
   */
  private async handleStaySignedInPrompt(page: Page): Promise<void> {
    try {
      // Look for "Stay signed in?" text or Yes/No buttons
      const yesSelectors = [
        'input[value="Yes"]',
        'button:has-text("Yes")',
        '#idSIButton9',
        '#acceptButton',
        'button[data-testid="acceptButton"]',
      ];

      for (const selector of yesSelectors) {
        const button = await page.$(selector);
        if (button) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text?.toLowerCase().includes('yes') || selector.includes('SIButton9')) {
            logger.info('🔄 Handling "Stay signed in" prompt...');
            await button.click();
            await page.waitForTimeout(2000);
            return;
          }
        }
      }

      // Also check for "No" button to confirm we're on the right screen
      const noButton = await page.$('input[value="No"], button:has-text("No")');
      if (noButton) {
        // We're on the stay signed in screen, click Yes instead
        const yesButton = await page.$('input[value="Yes"], button:has-text("Yes"), #idSIButton9');
        if (yesButton) {
          logger.info('🔄 Handling "Stay signed in" prompt...');
          await yesButton.click();
          await page.waitForTimeout(2000);
        }
      }
    } catch {
      // Ignore errors - prompt might not appear
    }
  }

  /**
   * Handle "Don't show this again" checkbox on security info pages
   */
  private async handleDontShowAgain(page: Page): Promise<void> {
    try {
      const checkbox = await page.$(
        'input[type="checkbox"][name*="dontshow"], input[id*="KmsiCheckbox"]'
      );
      if (checkbox) {
        await checkbox.click();
        const continueButton = await page.$('#idSIButton9, input[value="Continue"]');
        if (continueButton) {
          await continueButton.click();
          await page.waitForTimeout(2000);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Perform Portal login if not authenticated
   */
  async loginToPortal(page: Page): Promise<void> {
    logger.info('🔐 Checking Portal authentication...');

    await page.goto(config.portal.url, { waitUntil: 'domcontentloaded' });

    // Check if already logged in (customize based on your portal)
    const isLoggedIn = await page.$eval('body', body => {
      // Look for common logged-in indicators
      const loggedInIndicators = [
        '.user-menu',
        '.dashboard',
        '[data-testid="user-profile"]',
        '.logout',
        'text=Welcome',
      ];
      return loggedInIndicators.some(
        selector =>
          body.textContent?.toLowerCase().includes('logout') ||
          body.querySelector(selector) !== null
      );
    });

    if (isLoggedIn) {
      logger.info('✅ Already logged into Portal');
      return;
    }

    logger.info('🔑 Performing Portal login...');

    try {
      // Common login selectors - adjust based on your portal
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[id*="user"]',
        'input[id*="email"]',
      ];

      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[id*="pass"]',
      ];

      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        '.login-button',
        '#login-btn',
      ];

      // Find and fill username
      for (const selector of usernameSelectors) {
        const el = await page.$(selector);
        if (el) {
          await el.fill(config.portal.username);
          logger.info('👤 Portal username entered');
          break;
        }
      }

      // Find and fill password
      for (const selector of passwordSelectors) {
        const el = await page.$(selector);
        if (el) {
          await el.fill(config.portal.password);
          logger.info('🔑 Portal password entered');
          break;
        }
      }

      // Click submit
      for (const selector of submitSelectors) {
        const el = await page.$(selector);
        if (el) {
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}),
            el.click(),
          ]);
          break;
        }
      }

      logger.info('✅ Successfully logged into Portal');
    } catch (error) {
      await this.takeDebugScreenshot(page, 'portal-login-error');
      logger.error('❌ Portal login failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Save authentication state
   */
  async saveAuth(context: BrowserContext): Promise<void> {
    await context.storageState({ path: this.storagePath });
    logger.info('💾 Auth state saved');
  }
}

export const authManager = new AuthManager();
