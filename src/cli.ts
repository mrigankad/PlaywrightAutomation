#!/usr/bin/env node
/* eslint-disable no-console */
import { AutomationRunner } from './runner';
import { config } from './config';
import { logger } from './logger';

/**
 * Command line interface for the automation tool
 */
async function runCLI(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    maxEmails: parseInt(getArg(args, '--count', '-c') ?? String(config.automation.maxEmails), 10),
    headless: args.includes('--headless') || config.automation.headless,
    quick: args.includes('--quick') || args.includes('-q'),
    help: args.includes('--help') || args.includes('-h'),
  };

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  logger.info('🤖 Playwright Automation Tool');
  logger.info('='.repeat(40));

  const runner = new AutomationRunner();

  try {
    if (options.quick) {
      await runner.runQuick({ maxEmails: options.maxEmails });
    } else {
      await runner.runPipeline({ maxEmails: options.maxEmails });
    }
  } catch (error) {
    logger.error('Execution failed', { error: (error as Error).message });
    process.exit(1);
  }
}

/**
 * Get argument value
 */
function getArg(args: string[], longName: string, shortName: string): string | undefined {
  const longIndex = args.indexOf(longName);
  const shortIndex = args.indexOf(shortName);

  const index = longIndex !== -1 ? longIndex : shortIndex;

  if (index !== -1 && index < args.length - 1) {
    return args[index + 1];
  }

  return undefined;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Playwright Automation Tool - Multi-step Email to Portal Pipeline

Usage:
  npx ts-node src/cli.ts [options]

Options:
  -c, --count <n>     Process n emails (default: ${config.automation.maxEmails})
  -q, --quick         Use saved authentication if available
  --headless          Run browser in headless mode
  -h, --help          Show this help message

Examples:
  # Process 5 emails with full authentication
  npx ts-node src/cli.ts --count 5

  # Quick run with saved auth
  npx ts-node src/cli.ts --quick --count 3

  # Headless mode for CI/CD
  npx ts-node src/cli.ts --headless --count 10

Environment:
  Set required variables in .env file:
    OUTLOOK_EMAIL, OUTLOOK_PASSWORD
    PORTAL_URL, PORTAL_USERNAME, PORTAL_PASSWORD
`);
}

// Run CLI
void runCLI();
