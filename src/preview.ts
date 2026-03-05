/**
 * Preview Mode - Shows what data will be extracted from your real Outlook
 * Dry-run: Opens emails, extracts data, but doesn't search portal
 */
import { chromium } from 'playwright';
import { config } from './config';
import { logger } from './logger';
import { authManager } from './auth';
import { createMailExtractor } from './mailExtractor';
import fs from 'fs';

interface PreviewResult {
  index: number;
  subject: string;
  sender: string;
  extracted: Record<string, string | string[]> | null;
  rawText: string;
  willSearch: boolean;
  searchValue?: string;
}

async function preview() {
  logger.info('🔍 PREVIEW MODE - Extracting data from your real Outlook');
  logger.info('='.repeat(60));
  logger.info('This will:');
  logger.info('  1. Open Chrome browser');
  logger.info('  2. Log into YOUR Outlook');
  logger.info('  3. Open each email and show extracted data');
  logger.info('  4. Tell you what WOULD be searched on portal');
  logger.info('  5. NOT actually search the portal (dry run)');
  logger.info('='.repeat(60) + '\n');

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500, // Slower for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const results: PreviewResult[] = [];

  try {
    // Login to Outlook
    logger.info('🔐 Logging into Outlook...');
    await authManager.loginToOutlook(page);
    logger.info('✅ Logged in successfully\n');

    const extractor = createMailExtractor(page);

    // Ask user how many emails to preview
    logger.info('How many emails do you want to preview?');
    logger.info('(Watch the browser - it will open each email)\n');

    const maxEmails = config.automation.maxEmails;
    logger.info(`Processing up to ${maxEmails} emails...\n`);

    // Process each email
    for (let i = 0; i < maxEmails; i++) {
      try {
        logger.info(`\n📧 Email ${i + 1}`);
        logger.info('-'.repeat(40));

        // Open email
        await extractor.openEmail(i);

        // Get header info
        const header = await extractor.extractHeaderInfo();
        logger.info(`Subject: ${header.subject}`);
        logger.info(`From: ${header.sender}`);
        logger.info(`Date: ${header.date}`);

        // Extract data
        const data = await extractor.extractData({ maxRawTextLength: 1000 });

        if (data) {
          logger.info('\n📊 Extracted Data:');
          const extracted: Record<string, string | string[]> = {};

          for (const [key, value] of Object.entries(data)) {
            if (key === 'rawText') {
              continue;
            }
            extracted[key] = value as string | string[];

            if (Array.isArray(value)) {
              logger.info(`  ✅ ${key}: ${value.join(', ')}`);
            } else {
              logger.info(`  ✅ ${key}: ${value}`);
            }
          }

          // Determine what would be searched
          const searchPriority = [
            'orderId',
            'invoiceNumber',
            'trackingNumber',
            'rateCardId',
            'casNumber',
          ];
          let searchField: string | null = null;
          let searchValue: string | undefined;

          for (const field of searchPriority) {
            if (extracted[field]) {
              searchField = field;
              const val = extracted[field];
              searchValue = Array.isArray(val) ? val[0] : val;
              break;
            }
          }

          results.push({
            index: i,
            subject: header.subject,
            sender: header.sender,
            extracted,
            rawText: data.rawText ?? '',
            willSearch: !!searchField,
            searchValue,
          });

          if (searchField) {
            logger.info(`\n🔍 WOULD SEARCH: ${searchField} = "${searchValue}"`);
            logger.info(`   Portal: ${config.portal.url}`);
          } else {
            logger.info('\n⚠️  No searchable data found in this email');
          }
        } else {
          logger.info('\n⚠️  No data patterns matched');
          results.push({
            index: i,
            subject: header.subject,
            sender: header.sender,
            extracted: null,
            rawText: '',
            willSearch: false,
          });
        }

        // Wait so user can see
        await page.waitForTimeout(2000);
      } catch (error) {
        logger.error(`Failed to process email ${i + 1}`, {
          error: (error as Error).message,
        });
      }
    }

    // Summary
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 PREVIEW SUMMARY');
    logger.info('='.repeat(60));

    const searchable = results.filter(r => r.willSearch);
    logger.info(`\nTotal emails scanned: ${results.length}`);
    logger.info(`Emails with searchable data: ${searchable.length}`);
    logger.info(`Emails skipped: ${results.length - searchable.length}`);

    logger.info('\n📊 Searchable Items:');
    for (const item of searchable) {
      logger.info(`  ${item.index + 1}. ${item.subject.substring(0, 50)}...`);
      logger.info(`     → Search: "${item.searchValue}"`);
    }

    // Save detailed report
    const reportPath = 'logs/preview-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    logger.info(`\n💾 Detailed report saved to: ${reportPath}`);

    // Show raw text sample from first email
    if (results.length > 0 && results[0].rawText) {
      logger.info('\n📝 Sample Raw Text (first 500 chars):');
      logger.info('-'.repeat(40));
      logger.info(results[0].rawText.substring(0, 500));
      logger.info('-'.repeat(40));
      logger.info('(Use this to design custom extraction patterns)');
    }

    logger.info('\n✅ Preview complete!');
    logger.info('\nNext steps:');
    logger.info('  1. Review the extracted data above');
    logger.info('  2. If patterns need adjustment, edit src/config.ts');
    logger.info('  3. Run full automation: npm run dev');

    // Keep browser open
    logger.info('\n⏳ Browser staying open for 30 seconds...');
    logger.info('   (Close manually or wait)');
    await page.waitForTimeout(30000);
  } catch (error) {
    logger.error('Preview failed', { error: (error as Error).message });
  } finally {
    await browser.close();
    logger.info('\n👋 Browser closed');
  }
}

// Run
preview().catch(console.error);
