import { chromium } from 'playwright';
import { config } from './config';
import { logger } from './logger';
import { authManager } from './auth';

/**
 * Debug script to test Outlook login flow
 * Run with: npx ts-node src/debug-login.ts
 */

async function debugLogin(): Promise<void> {
  logger.info('🔧 Starting login debug mode...');
  logger.info(`Email: ${config.outlook.email}`);
  logger.info(`URL: ${config.outlook.url}`);
  logger.info(`Headless: ${config.automation.headless}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500, // Slower for debugging
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Enable verbose logging
  page.on('console', msg => logger.info(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => logger.error(`[Browser Error] ${err.message}`));
  page.on('request', req => logger.debug(`[Request] ${req.method()} ${req.url()}`));
  page.on('response', res => logger.debug(`[Response] ${res.status()} ${res.url()}`));

  try {
    logger.info('📍 Step 1: Navigating to Outlook...');
    await page.goto(config.outlook.url, { waitUntil: 'domcontentloaded' });

    logger.info('📍 Step 2: Taking initial screenshot...');
    await page.screenshot({ path: './screenshots/debug-01-initial.png', fullPage: true });
    logger.info('📸 Saved: screenshots/debug-01-initial.png');

    logger.info('📍 Step 3: Detecting page state...');

    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      return {
        url: (window as Window).location.href,
        title: document.title,
        hasEmailInput: !!document.querySelector('input[type="email"], input[name="loginfmt"]'),
        hasPasswordInput: !!document.querySelector('input[type="password"], input[name="passwd"]'),
        bodyText: document.body.innerText.substring(0, 500),
      };
    });

    logger.info('Page info:', pageInfo);

    // Check for specific selectors
    const selectors = [
      { name: 'Email input', selector: 'input[type="email"], input[name="loginfmt"]' },
      { name: 'Password input', selector: 'input[type="password"], input[name="passwd"]' },
      { name: 'Next button', selector: '#idSIButton9, input[type="submit"], #next' },
      { name: 'Main content', selector: '[role="main"], .pBKjV, #MainModule' },
      { name: 'Account picker', selector: '[data-testid="userDisplayName"], .account-item' },
    ];

    for (const { name, selector } of selectors) {
      const element = await page.$(selector);
      logger.info(`  ${name}: ${element ? '✅ Found' : '❌ Not found'}`);
    }

    logger.info('📍 Step 4: Attempting login...');
    await authManager.loginToOutlook(page);

    logger.info('📍 Step 5: Taking post-login screenshot...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './screenshots/debug-02-logged-in.png', fullPage: true });
    logger.info('📸 Saved: screenshots/debug-02-logged-in.png');

    // Save auth state
    await authManager.saveAuth(context);
    logger.info('💾 Auth state saved');

    logger.info('✅ Debug login successful!');
    logger.info('Press Ctrl+C to close browser, or wait 30 seconds...');
    await page.waitForTimeout(30000);
  } catch (error) {
    logger.error('❌ Debug login failed', { error: (error as Error).message });

    // Take error screenshot
    await page.screenshot({ path: './screenshots/debug-error.png', fullPage: true });
    logger.info('📸 Error screenshot saved: screenshots/debug-error.png');

    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  debugLogin().catch(err => {
    logger.error('Fatal error:', err);
    process.exit(1);
  });
}
