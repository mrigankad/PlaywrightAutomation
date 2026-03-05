import { Page } from 'playwright';

import { config as appConfig } from '../config';
import { createOutlookProvider } from '../providers/outlook-provider';
import { createRegexExtractor } from '../plugins/regex-extractor';
import { createGenericPortalAdapter } from '../adapters/generic-portal-adapter';
import { pluginRegistry } from './plugin-registry';
import { Pipeline, PipelineOptions, PipelineResult } from './pipeline';
import { PipelineConfiguration, ExtractionFieldConfig } from './types';

/**
 * Default extraction fields
 */
export const defaultExtractionFields: ExtractionFieldConfig[] = [
  { name: 'orderId', label: 'Order ID', required: false },
  { name: 'invoiceNumber', label: 'Invoice Number', required: false },
  { name: 'casNumber', label: 'CAS Number', required: false },
  { name: 'trackingNumber', label: 'Tracking Number', required: false },
  { name: 'emails', label: 'Email Addresses', required: false, multiple: true },
  { name: 'phones', label: 'Phone Numbers', required: false, multiple: true },
  { name: 'amounts', label: 'Amounts', required: false, multiple: true },
];

/**
 * Options for creating the automation pipeline
 */
export interface CreatePipelineOptions {
  /** Outlook configuration */
  outlook?: {
    url?: string;
    email: string;
    password: string;
  };
  /** Portal configuration */
  portal?: {
    url: string;
    username?: string;
    password?: string;
    selectors?: {
      searchInput?: string;
      searchButton?: string;
      resultsContainer?: string;
    };
  };
  /** Extraction configuration */
  extraction?: {
    fields?: ExtractionFieldConfig[];
    customPatterns?: Record<string, RegExp>;
  };
  /** Automation settings */
  automation?: {
    headless?: boolean;
    slowMo?: number;
    maxEmails?: number;
    screenshotsDir?: string;
  };
}

/**
 * Register all built-in plugins
 */
export function registerDefaultPlugins(options: CreatePipelineOptions = {}): void {
  // Register Outlook provider
  const outlookConfig = {
    url: options.outlook?.url ?? appConfig.outlook.url,
    email: options.outlook?.email ?? appConfig.outlook.email,
    password: options.outlook?.password ?? appConfig.outlook.password,
  };

  pluginRegistry.register({
    id: 'outlook',
    type: 'email-provider',
    factory: () => createOutlookProvider(outlookConfig),
  });

  // Register regex extractor
  pluginRegistry.register({
    id: 'regex-extractor',
    type: 'extractor',
    factory: createRegexExtractor,
  });

  // Register generic portal adapter
  pluginRegistry.register({
    id: 'generic-portal',
    type: 'portal-adapter',
    factory: createGenericPortalAdapter,
  });
}

/**
 * Create pipeline configuration from options
 */
export function createPipelineConfig(options: CreatePipelineOptions = {}): PipelineConfiguration {
  return {
    emailProvider: 'outlook',
    extractor: 'regex-extractor',
    portalAdapter: 'generic-portal',
    providerConfig: options.outlook,
    extractorConfig: {
      fields: options.extraction?.fields ?? defaultExtractionFields,
      customPatterns: options.extraction?.customPatterns,
    },
    portalConfig: options.portal
      ? {
          url: options.portal.url,
          credentials:
            options.portal.username && options.portal.password
              ? {
                  username: options.portal.username,
                  password: options.portal.password,
                }
              : undefined,
          selectors: options.portal.selectors
            ? {
                searchInput: options.portal.selectors.searchInput ?? '#searchInput',
                searchButton: options.portal.selectors.searchButton ?? '#searchBtn',
                resultsContainer: options.portal.selectors.resultsContainer,
              }
            : undefined,
        }
      : undefined,
    automation: {
      headless: options.automation?.headless ?? appConfig.automation.headless,
      slowMo: options.automation?.slowMo ?? appConfig.automation.slowMo,
      maxEmails: options.automation?.maxEmails ?? appConfig.automation.maxEmails,
      screenshotsDir: options.automation?.screenshotsDir ?? appConfig.paths.screenshots,
    },
  };
}

/**
 * Create a fully configured pipeline
 *
 * @example
 * ```typescript
 * import { chromium } from 'playwright';
 * import { createPipeline, registerDefaultPlugins } from 'playwright-automation-tool';
 *
 * // Register plugins once
 * registerDefaultPlugins({
 *   outlook: { email: 'user@example.com', password: 'pass' },
 *   portal: { url: 'https://portal.example.com', username: 'user', password: 'pass' }
 * });
 *
 * // Create and run pipeline
 * const browser = await chromium.launch();
 * const page = await browser.newPage();
 * const pipeline = createPipeline(page);
 * const result = await pipeline.execute({ maxEmails: 5 });
 * ```
 */
export function createPipeline(page: Page, options: CreatePipelineOptions = {}): Pipeline {
  // Ensure plugins are registered
  if (!pluginRegistry.has('outlook')) {
    registerDefaultPlugins(options);
  }

  const config = createPipelineConfig(options);
  return new Pipeline(page, config);
}

/**
 * Run the complete automation with one function
 *
 * @example
 * ```typescript
 * import { runAutomation } from 'playwright-automation-tool';
 *
 * const result = await runAutomation({
 *   outlook: { email: 'user@example.com', password: 'pass' },
 *   portal: { url: 'https://portal.example.com' }
 * }, { maxEmails: 5 });
 *
 * console.log(result.summary);
 * ```
 */
export async function runAutomation(
  options: CreatePipelineOptions,
  pipelineOptions: PipelineOptions = {}
): Promise<PipelineResult> {
  const { chromium } = await import('playwright');

  // Register plugins
  registerDefaultPlugins(options);

  // Launch browser
  const browser = await chromium.launch({
    headless: options.automation?.headless ?? appConfig.automation.headless,
    slowMo: options.automation?.slowMo ?? appConfig.automation.slowMo,
  });

  try {
    const page = await browser.newPage();
    const pipeline = createPipeline(page, options);
    return await pipeline.execute(pipelineOptions);
  } finally {
    await browser.close();
  }
}
