import { chromium } from 'playwright';
import { config } from './config';
import { logger } from './logger';
import { authManager } from './auth';

/**
 * Diagnostic script to inspect Outlook interface
 * Run with: npx ts-node src/diagnose-outlook.ts
 */

async function diagnoseOutlook(): Promise<void> {
  logger.info('🔧 Starting Outlook diagnosis...');
  logger.info(`Email: ${config.outlook.email}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate and login
    logger.info('\n📍 Step 1: Logging into Outlook...');
    await authManager.loginToOutlook(page);
    await page.screenshot({ path: './screenshots/diag-01-logged-in.png', fullPage: true });
    logger.info('📸 Saved: screenshots/diag-01-logged-in.png');

    // Step 2: Wait for page to fully load
    logger.info('\n📍 Step 2: Waiting for page to settle...');
    await page.waitForTimeout(5000);

    // Step 3: Analyze page structure
    logger.info('\n📍 Step 3: Analyzing page structure...');

    const pageAnalysis = await page.evaluate(() => {
      const results: Record<string, any> = {};

      // Check for common email list containers
      results.url = window.location.href;
      results.title = document.title;

      // Listbox (common for email lists)
      const listbox = document.querySelector('[role="listbox"]');
      results.hasListbox = !!listbox;
      results.listboxChildren = listbox ? listbox.children.length : 0;

      // List items
      const listitems = document.querySelectorAll('[role="listitem"]');
      results.listitemCount = listitems.length;

      // MS List cell (Fluent UI)
      const msListCells = document.querySelectorAll('.ms-List-cell');
      results.msListCellCount = msListCells.length;

      // Conversation items
      const conversationItems = document.querySelectorAll('[data-conversation-id]');
      results.conversationCount = conversationItems.length;

      // Main content area
      const main = document.querySelector('[role="main"]');
      results.hasMain = !!main;

      // All divs with potential email classes
      const allDivs = Array.from(document.querySelectorAll('div'));
      results.totalDivs = allDivs.length;

      // Look for elements containing "email" or "message" in class
      const emailRelated = allDivs
        .filter(
          d =>
            d.className &&
            (d.className.toLowerCase().includes('email') ||
              d.className.toLowerCase().includes('message') ||
              d.className.toLowerCase().includes('mail') ||
              d.className.toLowerCase().includes('conversation'))
        )
        .map(d => ({
          className: d.className,
          tagName: d.tagName,
          childCount: d.children.length,
        }))
        .slice(0, 10);
      results.emailRelatedElements = emailRelated;

      // Check for shadow DOM
      results.hasShadowRoot = !!document.querySelector('*')?.shadowRoot;

      return results;
    });

    logger.info('Page analysis results:');
    logger.info(JSON.stringify(pageAnalysis, null, 2));

    // Step 4: Try different email selectors
    logger.info('\n📍 Step 4: Testing email selectors...');

    const selectorsToTest = [
      { name: 'role=listitem', selector: '[role="listitem"]' },
      { name: 'ms-List-cell', selector: '.ms-List-cell' },
      { name: 'data-conversation-id', selector: '[data-conversation-id]' },
      { name: 'data-testid', selector: '[data-testid*="mail"], [data-testid*="message"]' },
      {
        name: 'email row classes',
        selector: '[class*="Mail"], [class*="mail"], [class*="message"]',
      },
      { name: 'div with specific patterns', selector: 'div[class*="item"], div[class*="Item"]' },
    ];

    for (const { name, selector } of selectorsToTest) {
      try {
        const count = await page.locator(selector).count();
        logger.info(`  ${name}: ${count > 0 ? '✅' : '❌'} Found ${count} elements`);

        if (count > 0) {
          // Get sample HTML of first element
          const firstEl = page.locator(selector).first();
          const className = await firstEl.evaluate(el => el.className).catch(() => 'N/A');
          const outerHTML = await firstEl
            .evaluate(el => el.outerHTML.substring(0, 200))
            .catch(() => 'N/A');
          logger.info(`    First element class: ${className.substring(0, 100)}`);
          logger.info(`    First element HTML: ${outerHTML}...`);
        }
      } catch (e) {
        logger.info(`  ${name}: ❌ Error - ${(e as Error).message}`);
      }
    }

    // Step 5: Check if we're on the right page
    logger.info('\n📍 Step 5: Checking current page...');
    const currentUrl = page.url();
    logger.info(`Current URL: ${currentUrl}`);

    if (!currentUrl.includes('mail') && !currentUrl.includes('outlook')) {
      logger.warn('⚠️ You may not be on the Outlook mail page!');
    }

    // Step 6: Take full screenshot
    logger.info('\n📍 Step 6: Taking full page screenshot...');
    await page.screenshot({ path: './screenshots/diag-02-full-page.png', fullPage: true });
    logger.info('📸 Saved: screenshots/diag-02-full-page.png');

    // Step 7: Save HTML for inspection
    logger.info('\n📍 Step 7: Saving page HTML...');
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('./logs/outlook-page.html', html.substring(0, 50000)); // First 50KB
    logger.info('💾 Saved: logs/outlook-page.html (first 50KB)');

    logger.info('\n✅ Diagnosis complete!');
    logger.info('Check the screenshots and logs for details.');

    // Keep browser open
    logger.info('\n⏳ Browser will stay open for 60 seconds...');
    await page.waitForTimeout(60000);
  } catch (error) {
    logger.error('❌ Diagnosis failed', { error: (error as Error).message });
    await page.screenshot({ path: './screenshots/diag-error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  diagnoseOutlook().catch(err => {
    logger.error('Fatal error:', err);
    process.exit(1);
  });
}
