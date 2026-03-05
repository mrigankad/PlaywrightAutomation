import { Page } from 'playwright';

import { logger } from '../logger';
import { EmailProvider, EmailMessage, ListEmailsOptions } from '../core/types';

/**
 * Configuration for Outlook provider
 */
export interface OutlookConfig {
  url: string;
  email: string;
  password: string;
}

/**
 * Outlook email provider plugin
 */
export class OutlookProvider implements EmailProvider {
  readonly id = 'outlook';
  readonly name = 'Microsoft Outlook';
  readonly version = '1.0.0';
  readonly type = 'email-provider' as const;
  readonly description = 'Microsoft Outlook 365 Web Client';

  constructor(private config: OutlookConfig) {}

  /**
   * Initialize the provider
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(): Promise<void> {
    logger.info('Outlook provider initialized');
  }

  /**
   * Dispose resources
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async dispose(): Promise<void> {
    logger.info('Outlook provider disposed');
  }

  /**
   * Check if already authenticated
   */
  async isAuthenticated(page: Page): Promise<boolean> {
    await page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

    try {
      // Look for email list indicators
      const selectors = [
        '[role="listbox"]',
        '[data-testid="mail-folder-list"]',
        '.mailListItem',
        '.ms-List-cell',
        '[role="listitem"]',
        '[data-conversation-id]',
      ];

      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Authenticate with Outlook
   */
  async authenticate(page: Page): Promise<void> {
    logger.info('Authenticating with Outlook...');

    await page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

    // Check if already authenticated
    if (await this.isAuthenticated(page)) {
      logger.info('Already authenticated');
      return;
    }

    // Wait for login form
    const result = await Promise.race([
      page
        .waitForSelector('input[type="email"], input[name="loginfmt"]', {
          timeout: 10000,
        })
        .then(() => 'email_form'),
      page
        .waitForSelector('input[type="password"]', { timeout: 10000 })
        .then(() => 'password_form'),
    ]).catch(() => 'unknown');

    if (result === 'email_form') {
      // Enter email
      await page.fill('input[type="email"], input[name="loginfmt"]', this.config.email);
      await page.click('input[type="submit"], #idSIButton9');
      await page.waitForTimeout(2000);
    }

    // Enter password
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', this.config.password);
    await page.click('input[type="submit"], #idSIButton9');

    // Handle "Stay signed in" prompt
    try {
      const yesButton = await page.waitForSelector('input[value="Yes"], #idSIButton9', {
        timeout: 5000,
      });
      await yesButton.click();
      await page.waitForTimeout(2000);
    } catch {
      // Prompt might not appear
    }

    // Wait for Outlook to load
    await page.waitForSelector('[role="listbox"], .mailListItem', { timeout: 30000 });
    logger.info('Successfully authenticated with Outlook');
  }

  /**
   * List emails from inbox
   */
  async listEmails(page: Page, options: ListEmailsOptions = {}): Promise<EmailMessage[]> {
    logger.info('Listing emails', { limit: options.limit });

    const limit = options.limit ?? 10;
    const emails: EmailMessage[] = [];

    // Wait for email list to load
    await page.waitForSelector('[role="listbox"] [role="listitem"], .mailListItem', {
      timeout: 10000,
    });

    // Get all email items
    const items = await page.locator('[role="listitem"], .mailListItem').all();

    for (let i = 0; i < Math.min(items.length, limit); i++) {
      try {
        const item = items[i];
        await item.click();
        await page.waitForTimeout(1000);

        const email = await this.parseEmailFromPage(page);
        if (email) {
          emails.push(email);
        }

        // Go back to list
        await page.goto(this.config.url);
        await page.waitForTimeout(1000);
      } catch (error) {
        logger.error('Failed to parse email', { error: (error as Error).message });
      }
    }

    return emails;
  }

  /**
   * Get a single email by ID
   */
  async getEmail(page: Page, emailId: string): Promise<EmailMessage | null> {
    // Navigate to specific email
    await page.goto(`${this.config.url}/inbox/id/${emailId}`);
    await page.waitForTimeout(2000);

    return this.parseEmailFromPage(page);
  }

  /**
   * Mark email as read
   */
  async markAsRead(page: Page, emailId: string): Promise<void> {
    // Outlook marks as read automatically when opened
    await this.getEmail(page, emailId);
  }

  /**
   * Move email to folder
   */
  async moveToFolder(page: Page, emailId: string, folder: string): Promise<void> {
    // Open email
    await this.getEmail(page, emailId);

    // Click move button and select folder
    // This is a simplified implementation
    logger.info(`Moving email ${emailId} to folder ${folder}`);

    // Look for move button
    const moveButton = await page.$('[title="Move to"], button:has-text("Move")');
    if (moveButton) {
      await moveButton.click();
      await page.waitForTimeout(500);

      // Select folder
      const folderOption = await page.$(`text=${folder}`);
      if (folderOption) {
        await folderOption.click();
      }
    }
  }

  /**
   * Get raw email content
   */
  async getRawContent(page: Page, emailId: string): Promise<string> {
    const email = await this.getEmail(page, emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }
    return email.body.text ?? email.body.html ?? '';
  }

  /**
   * Parse email from current page
   */
  private async parseEmailFromPage(page: Page): Promise<EmailMessage | null> {
    try {
      // Extract email data from page
      const subject = await page
        .$eval('[role="heading"], .subject', el => el.textContent)
        .catch(() => 'Unknown Subject');

      const senderText = await page
        .$eval('[data-testid="from-address"], .from', el => el.textContent)
        .catch(() => 'Unknown Sender');

      const bodyElement = await page.$('[role="document"], .email-body, #ReadingPaneContainer');
      const bodyHtml = bodyElement ? await bodyElement.innerHTML() : '';
      const bodyText = bodyElement ? await bodyElement.innerText() : '';

      // Extract ID from URL
      const url = page.url();
      const idMatch = url.match(/id\/([^/]+)/);
      const id = idMatch?.[1] ?? `email-${Date.now()}`;

      return {
        id,
        subject: subject ?? 'No Subject',
        sender: this.parseSender(senderText ?? ''),
        recipients: { to: [] },
        body: {
          html: bodyHtml,
          text: bodyText,
        },
        receivedAt: new Date(),
        isRead: true,
      };
    } catch (error) {
      logger.error('Failed to parse email from page', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Parse sender string into structured format
   */
  private parseSender(senderText: string): { name?: string; email: string } {
    const match = senderText.match(/(.+?)\s*<(.+)>/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    return { email: senderText.trim() };
  }
}

/**
 * Factory function for creating Outlook provider
 */
export function createOutlookProvider(config: OutlookConfig): OutlookProvider {
  return new OutlookProvider(config);
}
