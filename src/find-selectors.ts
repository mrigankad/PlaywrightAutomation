import { chromium } from 'playwright';
import { logger } from './logger';
import { authManager } from './auth';

/**
 * Script to find the correct email selectors
 * Run with: npx ts-node src/find-selectors.ts
 */

async function findSelectors(): Promise<void> {
  logger.info('🔍 Finding email selectors...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Login
    logger.info('Logging in...');
    await authManager.loginToOutlook(page);
    await page.waitForTimeout(3000);

    // Find email list structure
    logger.info('\n📧 Analyzing email list structure...');

    const emailStructure = await page.evaluate(() => {
      const results: any = {};

      // Find the listbox
      const listbox = document.querySelector('[role="listbox"]');
      if (listbox) {
        results.listboxFound = true;
        results.listboxHTML = listbox.outerHTML.substring(0, 500);
        results.listboxChildren = listbox.children.length;
        results.listboxChildTypes = Array.from(listbox.children)
          .slice(0, 5)
          .map(c => ({
            tagName: c.tagName,
            className: c.className?.substring(0, 100),
            role: c.getAttribute('role'),
          }));
      }

      // Find all divs inside the listbox
      if (listbox) {
        const allDivs = listbox.querySelectorAll('div');
        results.divsInListbox = allDivs.length;

        // Find divs that look like email items (have sender/subject info)
        const emailItems = Array.from(allDivs)
          .filter(div => {
            const text = div.textContent || '';
            return (
              text.length > 20 &&
              text.length < 500 &&
              (div.className?.includes('item') ||
                div.className?.includes('row') ||
                div.getAttribute('role') === 'option')
            );
          })
          .slice(0, 5);

        results.possibleEmailItems = emailItems.map(el => ({
          className: el.className?.substring(0, 200),
          role: el.getAttribute('role'),
          textPreview: el.textContent?.substring(0, 100),
        }));
      }

      // Try to find clickable email items by looking for common patterns
      const allElements = document.querySelectorAll('*');
      const clickableItems = Array.from(allElements)
        .filter(el => {
          const text = el.textContent || '';
          const hasEmailContent =
            text.includes('@') || text.includes('Re:') || text.includes('FW:');
          const isClickable =
            (el.tagName === 'DIV' && (el as HTMLElement).onclick !== null) ||
            el.getAttribute('role') === 'option' ||
            el.getAttribute('role') === 'button';
          return hasEmailContent && (isClickable || el.className?.includes('item'));
        })
        .slice(0, 5);

      results.clickableEmailItems = clickableItems.map(el => ({
        tagName: el.tagName,
        className: el.className?.substring(0, 200),
        role: el.getAttribute('role'),
        dataId: el.getAttribute('data-id')?.substring(0, 50),
        textPreview: el.textContent?.substring(0, 100),
      }));

      return results;
    });

    logger.info('Email structure found:');
    logger.info(JSON.stringify(emailStructure, null, 2));

    // Try different selector patterns
    logger.info('\n🎯 Testing selector patterns...');

    const selectorTests = [
      '[role="listbox"] > div',
      '[role="listbox"] [role="option"]',
      '[role="listbox"] div[class*="item"]',
      '[role="listbox"] div[data-id]',
      'div[role="listbox"] div[role="presentation"]',
      '.ms-List-cell',
      '[data-conversation-id]',
      'div[class*="message"]',
      'div[class*="conversation"]',
      'div[class*="mail"]',
    ];

    for (const selector of selectorTests) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        logger.info(`✅ ${selector}: ${count} elements`);

        // Get details of first element
        try {
          const firstEl = page.locator(selector).first();
          const details = await firstEl.evaluate(el => ({
            className: el.className?.substring(0, 100),
            role: el.getAttribute('role'),
            textContent: el.textContent?.substring(0, 100),
          }));
          logger.info(`   First: class="${details.className}" role="${details.role}"`);
        } catch {
          // ignore
        }
      } else {
        logger.info(`❌ ${selector}: 0 elements`);
      }
    }

    // Test clicking on the first email item
    logger.info('\n🖱️  Testing email click...');

    // Try to find and click the first email
    const emailClicked = await page.evaluate(() => {
      const listbox = document.querySelector('[role="listbox"]');
      if (!listbox) {
        return false;
      }

      // Find the first div that looks like an email
      const items = listbox.querySelectorAll(
        'div[role="option"], div[class*="item"], div[data-id]'
      );
      if (items.length > 0) {
        (items[0] as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (emailClicked) {
      logger.info('✅ Successfully clicked on email item');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/selector-test-email-open.png' });
    } else {
      logger.info('❌ Could not find clickable email item');
    }

    logger.info('\n✅ Selector analysis complete!');
    logger.info('Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);
  } catch (error) {
    logger.error('Error:', { error: (error as Error).message });
    await page.screenshot({ path: './screenshots/selector-error.png' });
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  findSelectors().catch(console.error);
}
