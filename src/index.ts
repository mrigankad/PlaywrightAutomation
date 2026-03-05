/**
 * Playwright Automation Tool
 * Multi-step automation pipeline: Outlook → Extract Data → Portal Search
 *
 * @module playwright-automation-tool
 */

// ============================================================================
// Legacy Exports (maintaining backwards compatibility)
// ============================================================================

export { AutomationRunner, PipelineResult as LegacyPipelineResult } from './runner';
export { createMailExtractor, MailExtractor, EmailItem, ExtractionOptions } from './mailExtractor';
export { createPortalSearch, PortalSearch, SearchOptions, SearchResult } from './portalSearch';
export { authManager, AuthManager } from './auth';
export { logger, Logger } from './logger';
export { config, extractionPatterns } from './config';
export type { ExtractedData } from './config';
export { OCRFallback, isImageBasedEmail } from './ocrFallback';

// ============================================================================
// Plugin System (New)
// ============================================================================

// Core types
export type {
  // Base
  Plugin,
  PluginMetadata,
  // Email
  EmailProvider,
  EmailMessage,
  EmailAttachment,
  ListEmailsOptions,
  // Extraction
  DataExtractor,
  ExtractionResult,
  ExtractionConfig,
  ExtractionFieldConfig,
  ExtractedField,
  // Portal
  PortalAdapter,
  PortalConfig,
  PortalSelectors,
  PortalSearchQuery,
  PortalSearchResult,
  // Pipeline
  PipelineConfiguration,
  PipelineContext,
  PipelineStepResult,
} from './core/types';

// Core classes
export { PluginRegistry, pluginRegistry } from './core/plugin-registry';
export { Pipeline, PipelineOptions } from './core/pipeline';
export type { PipelineResult } from './core/pipeline';

// ============================================================================
// Built-in Plugins
// ============================================================================

// Email Providers
export {
  OutlookProvider,
  createOutlookProvider,
  OutlookConfig,
} from './providers/outlook-provider';

// Data Extractors
export { RegexExtractor, createRegexExtractor, defaultPatterns } from './plugins/regex-extractor';

// Portal Adapters
export {
  GenericPortalAdapter,
  createGenericPortalAdapter,
  defaultSelectors,
} from './adapters/generic-portal-adapter';

// Factory functions
export {
  createPipeline,
  runAutomation,
  registerDefaultPlugins,
  createPipelineConfig,
  defaultExtractionFields,
  CreatePipelineOptions,
} from './core/factory';
