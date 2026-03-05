/**
 * Example: Basic Plugin Usage
 *
 * This example demonstrates how to use the plugin system
 * with built-in plugins for a complete automation workflow.
 */

import {
  registerDefaultPlugins,
  createPipeline,
  runAutomation,
} from '../src/index';
import { chromium } from 'playwright';

// =============================================================================
// Example 1: One-Function Approach (Simplest)
// =============================================================================

async function exampleOneFunction() {
  console.log('=== Example 1: One-Function Approach ===\n');

  const result = await runAutomation(
    {
      outlook: {
        email: process.env.OUTLOOK_EMAIL || 'user@example.com',
        password: process.env.OUTLOOK_PASSWORD || 'password',
      },
      portal: {
        url: process.env.PORTAL_URL || 'https://portal.example.com',
        username: process.env.PORTAL_USERNAME,
        password: process.env.PORTAL_PASSWORD,
      },
      extraction: {
        fields: [
          { name: 'orderId', label: 'Order ID' },
          { name: 'invoiceNumber', label: 'Invoice Number' },
          { name: 'casNumber', label: 'CAS Number' },
        ],
      },
      automation: {
        headless: false,
        maxEmails: 3,
      },
    },
    {
      maxEmails: 3,
      dryRun: true, // Don't actually search portal
    }
  );

  console.log('Pipeline completed!');
  console.log('Summary:', result.summary);
  console.log('Duration:', result.durationMs, 'ms');
}

// =============================================================================
// Example 2: Manual Plugin Registration (More Control)
// =============================================================================

async function exampleManualRegistration() {
  console.log('\n=== Example 2: Manual Plugin Registration ===\n');

  // Register plugins with configuration
  registerDefaultPlugins({
    outlook: {
      email: process.env.OUTLOOK_EMAIL || 'user@example.com',
      password: process.env.OUTLOOK_PASSWORD || 'password',
    },
    portal: {
      url: process.env.PORTAL_URL || 'https://portal.example.com',
    },
  });

  // Launch browser manually
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  try {
    const page = await browser.newPage();

    // Create pipeline with page
    const pipeline = createPipeline(page, {
      extraction: {
        fields: [
          { name: 'orderId', label: 'Order ID' },
          { name: 'trackingNumber', label: 'Tracking Number' },
        ],
      },
    });

    // Execute pipeline
    const result = await pipeline.execute({
      maxEmails: 5,
      onProgress: step => {
        console.log(`Step: ${step.step}, Success: ${step.success}`);
      },
    });

    console.log('Pipeline completed!');
    console.log('Summary:', result.summary);
  } finally {
    await browser.close();
  }
}

// =============================================================================
// Example 3: Custom Configuration
// =============================================================================

async function exampleCustomConfig() {
  console.log('\n=== Example 3: Custom Configuration ===\n');

  const result = await runAutomation(
    {
      outlook: {
        url: 'https://outlook.office.com/mail/',
        email: 'user@company.com',
        password: 'password123',
      },
      portal: {
        url: 'https://custom-portal.company.com',
        selectors: {
          searchInput: '#custom-search',
          searchButton: '#custom-search-btn',
          resultsContainer: '.custom-results',
        },
      },
      extraction: {
        fields: [
          { name: 'orderId', label: 'Order ID', required: true },
          { name: 'projectCode', label: 'Project Code' },
          { name: 'costCenter', label: 'Cost Center' },
        ],
        customPatterns: {
          projectCode: /PROJ-(\d{4})/i,
          costCenter: /CC-(\d{4})/i,
        },
      },
      automation: {
        headless: true,
        slowMo: 50,
        maxEmails: 10,
        screenshotsDir: './custom-screenshots',
      },
    },
    {
      maxEmails: 10,
      dryRun: false,
    }
  );

  console.log('Pipeline completed!');
  console.log('Summary:', result.summary);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  // Run examples (uncomment the one you want to try)

  // Example 1: Simplest approach
  // await exampleOneFunction();

  // Example 2: More control
  // await exampleManualRegistration();

  // Example 3: Custom configuration
  // await exampleCustomConfig();

  console.log('Uncomment an example in the main() function to run it.');
  console.log('Make sure to set environment variables or update the example code.');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
