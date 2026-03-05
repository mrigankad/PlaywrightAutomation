import { Page, Locator } from 'playwright';
import { extractionPatterns, ExtractedData } from './config';
import { logger } from './logger';

/**
 * Email data extraction options
 */
export interface ExtractionOptions {
  /** Extract only specific fields */
  fields?: (keyof typeof extractionPatterns)[];
  /** Custom regex patterns */
  customPatterns?: Record<string, RegExp>;
  /** Maximum length of raw text to extract */
  maxRawTextLength?: number;
}

/**
 * Represents an email item in the list
 */
export interface EmailItem {
  subject: string;
  sender: string;
  preview: string;
  timestamp: string;
  element: Locator;
}

/**
 * Extract structured data from email body using DOM
 */
export class MailExtractor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get list of emails from inbox
   */
  async getEmailList(maxCount: number = 10): Promise<EmailItem[]> {
    logger.info(`📧 Fetching up to ${maxCount} emails...`);

    // Wait for email list to load
    await this.page.waitForSelector('[role="listbox"], [role="main"]', { timeout: 10000 });

    // Find all email rows - using Outlook's specific selectors
    const emailRows = await this.page.$$('[role="listbox"] [role="option"]');

    const emails: EmailItem[] = [];

    for (let i = 0; i < Math.min(emailRows.length, maxCount); i++) {
      try {
        const row = emailRows[i];

        // Extract basic info without opening
        // For Outlook, the entire row text contains sender, subject, and preview
        const fullText = await row.evaluate(el => el.textContent?.trim() || '');

        // Try to extract components from the row
        const subject = await row
          .$eval(
            '[role="heading"], .subject, h3, span[class*="subject"]',
            el => el.textContent?.trim() || ''
          )
          .catch(() => {
            // Fallback: try to extract subject from text (usually after sender name)
            const lines = fullText.split('\n').filter(l => l.trim());
            return lines[1] || lines[0] || 'No subject';
          });

        const sender = await row
          .$eval(
            '[title*="@"], span[class*="sender"], div[class*="from"]',
            el => el.textContent?.trim() || ''
          )
          .catch(() => {
            // Fallback: first line is usually sender
            const lines = fullText.split('\n').filter(l => l.trim());
            return lines[0] || 'Unknown';
          });

        const preview = await row
          .$eval(
            '[class*="preview"], [class*="snippet"], [class*="body"]',
            el => el.textContent?.trim() || ''
          )
          .catch(() => '');

        const timestamp = await row
          .$eval('time, [class*="time"], [class*="date"]', el => el.textContent?.trim() || '')
          .catch(() => '');

        emails.push({
          subject,
          sender,
          preview,
          timestamp,
          element: this.page.locator(`[role="listbox"] [role="option"]:nth-of-type(${i + 1})`),
        });
      } catch (error) {
        logger.warn(`Failed to parse email at index ${i}`, { error: (error as Error).message });
      }
    }

    logger.info(`📧 Found ${emails.length} emails`);
    return emails;
  }

  /**
   * Open an email by index in the list
   */
  async openEmail(index: number): Promise<void> {
    logger.info(`📖 Opening email at index ${index}...`);

    const emailRows = await this.page.$$('[role="listbox"] [role="option"]');

    if (index >= emailRows.length) {
      throw new Error(`Email index ${index} out of range. Only ${emailRows.length} emails found.`);
    }

    await emailRows[index].click();
    await this.page.waitForSelector('[role="document"], .ReadingPaneContent, .email-body', {
      timeout: 10000,
    });
    await this.page.waitForTimeout(1000); // Allow content to settle
  }

  /**
   * Extract full text content from currently opened email
   */
  async extractEmailText(): Promise<string> {
    // Try multiple selectors for email content
    const selectors = [
      '[role="document"]',
      '.ReadingPaneContent',
      '.email-body',
      '._3NulTsZDpLzJ3ZW6Jrzea',
      '[data-testid="message-body"]',
      '.ms-Stack .ms-TextField-fieldGroup',
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        const text = await element.innerText();
        if (text && text.length > 10) {
          return text;
        }
      }
    }

    // Fallback: get all text from main content area
    const fallbackSelectors = ['[role="main"]', '#app', 'main', 'body'];

    for (const selector of fallbackSelectors) {
      const text = await this.page
        .locator(selector)
        .innerText()
        .catch(() => '');
      if (text && text.length > 50) {
        return text;
      }
    }

    throw new Error('Could not extract email text content');
  }

  /**
   * Extract structured data from email using regex patterns
   */
  async extractData(options: ExtractionOptions = {}): Promise<ExtractedData | null> {
    logger.info('🔍 Extracting data from email...');

    try {
      const emailText = await this.extractEmailText();
      logger.debug('Email text extracted', { length: emailText.length });

      const data: ExtractedData = {
        rawText: emailText.substring(0, options.maxRawTextLength ?? 5000),
      };

      // Determine which patterns to use
      const patternsToUse =
        options.fields ?? (Object.keys(extractionPatterns) as (keyof typeof extractionPatterns)[]);
      const allPatterns = {
        ...extractionPatterns,
        ...options.customPatterns,
      };

      // Apply each pattern
      for (const field of patternsToUse) {
        const pattern = allPatterns[field];
        if (!pattern) {
          continue;
        }

        const multiMatchFields = ['emails', 'phones', 'amounts', 'dates'];
        if (multiMatchFields.includes(field)) {
          // Multi-match patterns
          const matches = emailText.match(pattern);
          if (matches) {
            (data as Record<string, string[]>)[field] = [...new Set(matches)]; // Remove duplicates
            logger.debug(`Found ${field}:`, { count: matches.length });
          }
        } else {
          // Single match patterns
          const match = emailText.match(pattern);
          if (match) {
            (data as Record<string, string>)[field] = match[1] ?? match[0];
            logger.debug(`Found ${field}:`, { value: match[1] || match[0] });
          }
        }
      }

      // Check if we found anything meaningful
      const hasData = Object.keys(data).some(
        key => key !== 'rawText' && data[key as keyof ExtractedData] !== undefined
      );

      if (!hasData) {
        logger.warn('⚠️ No structured data found in email');
        return null;
      }

      logger.info('✅ Data extracted successfully', {
        fields: Object.keys(data).filter(k => k !== 'rawText'),
      });

      return data;
    } catch (error) {
      logger.error('❌ Failed to extract email data', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Extract data from specific email fields (subject, sender, etc.)
   */
  async extractHeaderInfo(): Promise<{ subject: string; sender: string; date: string }> {
    // Try multiple selectors for subject - Outlook specific
    const subjectSelectors = [
      '[data-testid="message-subject"]',
      '[role="region"] h2',
      '[role="region"] h1',
      '.subject-text',
      'div[class*="subject"] span',
      '[role="document"] h2',
      '[role="document"] h1',
      // Fallback: look for subject in the raw text (usually starts with "Subject:")
    ];

    let subject = '';
    for (const selector of subjectSelectors) {
      try {
        subject = await this.page.$eval(selector, el => el.textContent?.trim() || '');
        if (subject && subject !== 'Navigation pane') {
          break;
        }
      } catch {
        continue;
      }
    }

    // If still no subject, try to extract from the email body text (which contains "Subject: XXX")
    if (!subject || subject === 'Navigation pane') {
      try {
        const emailText = await this.extractEmailText();
        const subjectMatch = emailText.match(/Subject:\s*(.+?)(?:\n|\r|$)/i);
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
        }
      } catch {
        // ignore
      }
    }

    // Try multiple selectors for sender
    const senderSelectors = [
      '[data-testid="message-from"]',
      '[class*="from"] span',
      '[class*="sender"] span',
      '[role="region"] [title*="@"]',
    ];

    let sender = '';
    for (const selector of senderSelectors) {
      try {
        sender = await this.page.$eval(selector, el => el.textContent?.trim() || '');
        if (sender) {
          break;
        }
      } catch {
        continue;
      }
    }

    // Try to extract sender from email text as fallback
    if (!sender) {
      try {
        const emailText = await this.extractEmailText();
        const fromMatch = emailText.match(/From:\s*(.+?)(?:\n|\r|<|\s{2,})/i);
        if (fromMatch) {
          sender = fromMatch[1].trim();
        }
      } catch {
        // ignore
      }
    }

    const date = await this.page
      .$eval('time, [class*="date"], [class*="time"]', el => el.textContent?.trim() || '')
      .catch(() => '');

    return { subject, sender, date };
  }

  /**
   * Mark email as read (optional)
   */
  async markAsRead(): Promise<void> {
    try {
      // Look for "Mark as read" button or option
      const markReadBtn = await this.page.$(
        'button[title*="Mark as read"], button[aria-label*="Mark as read"]'
      );
      if (markReadBtn) {
        await markReadBtn.click();
        logger.debug('Marked email as read');
      }
    } catch (error) {
      logger.warn('Could not mark email as read', { error: (error as Error).message });
    }
  }

  /**
   * Move email to folder (e.g., "Processed")
   */
  async moveToFolder(folderName: string): Promise<void> {
    logger.info(`📁 Moving email to folder: ${folderName}`);

    try {
      // Click "More actions" menu
      const moreActions = await this.page.$(
        'button[aria-label*="More actions"], button[title*="More"]'
      );
      if (moreActions) {
        await moreActions.click();
        await this.page.waitForTimeout(500);

        // Click "Move to"
        const moveTo = await this.page.$('text=Move to, [role="menuitem"]:has-text("Move")');
        if (moveTo) {
          await moveTo.click();
          await this.page.waitForTimeout(500);

          // Select folder
          const folder = await this.page.$(`text=${folderName}`);
          if (folder) {
            await folder.click();
            logger.info(`✅ Email moved to ${folderName}`);
          } else {
            logger.warn(`Folder "${folderName}" not found`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to move email', { error: (error as Error).message });
    }
  }

  /**
   * Go back to inbox
   */
  async goBackToInbox(): Promise<void> {
    await this.page.goBack();
    await this.page.waitForSelector('[role="listbox"], [role="main"]', { timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }
}

/**
 * Factory function to create extractor instance
 */
export function createMailExtractor(page: Page): MailExtractor {
  return new MailExtractor(page);
}
