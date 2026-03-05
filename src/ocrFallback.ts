import { Page } from 'playwright';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * OCR-based extraction fallback
 * Use only when DOM extraction fails (e.g., image-based emails)
 */
export class OCRFallback {
  private page: Page;
  private tempDir: string;

  constructor(page: Page) {
    this.page = page;
    this.tempDir = path.join(__dirname, '../temp');

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Take screenshot and extract text using OCR
   */
  async extractTextFromScreenshot(): Promise<string> {
    logger.info('🔍 Using OCR fallback for text extraction...');

    const timestamp = Date.now();
    const screenshotPath = path.join(this.tempDir, `ocr-${timestamp}.png`);

    try {
      // Take screenshot of email content area
      const emailContent = await this.page.$('[role="document"], .email-body, .ReadingPaneContent');

      if (emailContent) {
        await emailContent.screenshot({ path: screenshotPath });
      } else {
        // Fallback to full page
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
      }

      // Perform OCR
      const result = await Tesseract.recognize(screenshotPath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const extractedText = result.data.text;
      logger.info('✅ OCR extraction complete', {
        textLength: extractedText.length,
        confidence: result.data.confidence,
      });

      return extractedText;
    } catch (error) {
      logger.error('❌ OCR extraction failed', { error: (error as Error).message });
      throw error;
    } finally {
      // Cleanup temp file
      if (fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
      }
    }
  }

  /**
   * Extract structured data using OCR
   */
  async extractDataWithOCR(
    patterns: Record<string, RegExp>
  ): Promise<Record<string, string | string[]>> {
    const text = await this.extractTextFromScreenshot();
    const data: Record<string, string | string[]> = {};

    for (const [field, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        data[field] = matches.length > 1 ? matches : matches[0];
      }
    }

    return data;
  }
}

/**
 * Check if OCR is needed (email appears to be image-based)
 */
export async function isImageBasedEmail(page: Page): Promise<boolean> {
  try {
    // Check for image-heavy content
    const images = await page.$$('img');
    const textContent = await page
      .locator('[role="document"]')
      .innerText()
      .catch(() => '');

    // If lots of images and minimal text, might be image-based
    if (images.length > 5 && textContent.length < 100) {
      return true;
    }

    // Check for common image-based email indicators
    const hasImageAttachment =
      (await page.$('text=image, text=.png, text=.jpg, text=.jpeg')) !== null;

    return hasImageAttachment;
  } catch {
    return false;
  }
}
