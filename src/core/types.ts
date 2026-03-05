/**
 * Core types for the plugin system
 */

import { Page } from 'playwright';

// ============================================================================
// Base Plugin Interface
// ============================================================================

/**
 * Base interface that all plugins must implement
 */
export interface Plugin {
  /** Unique identifier for the plugin */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Version following semver */
  readonly version: string;
  /** Description of what the plugin does */
  readonly description?: string;
  /** Initialize the plugin */
  initialize?(): Promise<void>;
  /** Clean up resources */
  dispose?(): Promise<void>;
}

// ============================================================================
// Email Provider Plugin
// ============================================================================

/**
 * Represents an email message
 */
export interface EmailMessage {
  /** Unique identifier */
  id: string;
  /** Email subject */
  subject: string;
  /** Sender information */
  sender: {
    name?: string;
    email: string;
  };
  /** Recipients */
  recipients: {
    to: string[];
    cc?: string[];
    bcc?: string[];
  };
  /** Email body (HTML or text) */
  body: {
    html?: string;
    text?: string;
  };
  /** Attachments */
  attachments?: EmailAttachment[];
  /** Received date */
  receivedAt: Date;
  /** Whether email has been read */
  isRead: boolean;
}

/**
 * Email attachment metadata
 */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  /** Download attachment content */
  download(): Promise<Buffer>;
}

/**
 * Options for listing emails
 */
export interface ListEmailsOptions {
  /** Folder to list (inbox, sent, etc.) */
  folder?: string;
  /** Maximum number of emails */
  limit?: number;
  /** Filter by unread only */
  unreadOnly?: boolean;
  /** Search query */
  search?: string;
}

/**
 * Plugin interface for email providers
 */
export interface EmailProvider extends Plugin {
  readonly type: 'email-provider';

  /** Authenticate with the email service */
  authenticate(page: Page): Promise<void>;

  /** Check if already authenticated */
  isAuthenticated(page: Page): Promise<boolean>;

  /** List emails from the provider */
  listEmails(page: Page, options?: ListEmailsOptions): Promise<EmailMessage[]>;

  /** Get a single email by ID */
  getEmail(page: Page, emailId: string): Promise<EmailMessage | null>;

  /** Mark email as read */
  markAsRead(page: Page, emailId: string): Promise<void>;

  /** Move email to folder */
  moveToFolder(page: Page, emailId: string, folder: string): Promise<void>;

  /** Get raw email content */
  getRawContent(page: Page, emailId: string): Promise<string>;
}

// ============================================================================
// Data Extraction Plugin
// ============================================================================

/**
 * Extracted field with metadata
 */
export interface ExtractedField {
  /** Field name */
  name: string;
  /** Extracted value */
  value: string | string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Source of extraction */
  source: 'regex' | 'llm' | 'ocr' | 'manual';
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  /** All extracted fields */
  fields: ExtractedField[];
  /** Raw text that was processed */
  rawText: string;
  /** Extraction timestamp */
  extractedAt: Date;
  /** Time taken to extract */
  durationMs: number;
}

/**
 * Configuration for extraction
 */
export interface ExtractionConfig {
  /** Fields to extract */
  fields: ExtractionFieldConfig[];
  /** Whether to use OCR fallback */
  enableOcr?: boolean;
  /** Custom patterns */
  customPatterns?: Record<string, RegExp>;
}

/**
 * Configuration for a single extraction field
 */
export interface ExtractionFieldConfig {
  /** Field identifier */
  name: string;
  /** Human-readable label */
  label: string;
  /** Required field */
  required?: boolean;
  /** Multiple values allowed */
  multiple?: boolean;
  /** Validation pattern */
  pattern?: RegExp;
  /** Example value for documentation */
  example?: string;
}

/**
 * Plugin interface for data extraction strategies
 */
export interface DataExtractor extends Plugin {
  readonly type: 'extractor';

  /** Extract data from email content */
  extract(content: string, config: ExtractionConfig): Promise<ExtractionResult>;

  /** Validate extracted data */
  validate?(result: ExtractionResult): boolean;
}

// ============================================================================
// Portal Adapter Plugin
// ============================================================================

/**
 * Search query for portal
 */
export interface PortalSearchQuery {
  /** Field to search */
  field: string;
  /** Value to search for */
  value: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Search result from portal
 */
export interface PortalSearchResult {
  /** Whether search was successful */
  success: boolean;
  /** Found data */
  data?: Record<string, unknown>;
  /** Screenshot path */
  screenshotPath?: string;
  /** Page URL after search */
  url?: string;
  /** Timestamp */
  timestamp: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Portal configuration
 */
export interface PortalConfig {
  /** Portal URL */
  url: string;
  /** Authentication credentials */
  credentials?: {
    username: string;
    password: string;
  };
  /** Custom selectors */
  selectors?: PortalSelectors;
  /** Wait times */
  timeouts?: {
    navigation?: number;
    search?: number;
    results?: number;
  };
}

/**
 * CSS selectors for portal elements
 */
export interface PortalSelectors {
  /** Search input field */
  searchInput: string;
  /** Search button */
  searchButton: string;
  /** Results container */
  resultsContainer?: string;
  /** Login form selectors */
  login?: {
    usernameInput?: string;
    passwordInput?: string;
    submitButton?: string;
  };
}

/**
 * Plugin interface for portal adapters
 */
export interface PortalAdapter extends Plugin {
  readonly type: 'portal-adapter';

  /** Navigate to portal */
  navigate(page: Page, config: PortalConfig): Promise<void>;

  /** Authenticate with portal */
  authenticate(page: Page, config: PortalConfig): Promise<void>;

  /** Check if authenticated */
  isAuthenticated(page: Page): Promise<boolean>;

  /** Perform search */
  search(page: Page, query: PortalSearchQuery, config: PortalConfig): Promise<PortalSearchResult>;

  /** Extract data from search results */
  extractResults?(page: Page): Promise<Record<string, unknown>>;

  /** Handle pagination if needed */
  hasMoreResults?(page: Page): Promise<boolean>;
  loadMoreResults?(page: Page): Promise<void>;
}

// ============================================================================
// Pipeline Context
// ============================================================================

/**
 * Context passed through the pipeline
 */
export interface PipelineContext {
  /** Unique run identifier */
  runId: string;
  /** Start timestamp */
  startedAt: Date;
  /** Current page instance */
  page: Page;
  /** Configuration */
  config: PipelineConfiguration;
  /** Shared state between steps */
  state: Map<string, unknown>;
  /** Results accumulator */
  results: PipelineStepResult[];
}

/**
 * Pipeline configuration
 */
export interface PipelineConfiguration {
  /** Email provider plugin ID */
  emailProvider: string;
  /** Data extractor plugin ID */
  extractor: string;
  /** Portal adapter plugin ID */
  portalAdapter: string;
  /** Provider-specific config */
  providerConfig?: Record<string, unknown>;
  /** Extractor-specific config */
  extractorConfig?: ExtractionConfig;
  /** Portal-specific config */
  portalConfig?: PortalConfig;
  /** General automation settings */
  automation: {
    headless: boolean;
    slowMo: number;
    maxEmails: number;
    screenshotsDir: string;
  };
}

/**
 * Result of a pipeline step
 */
export interface PipelineStepResult {
  /** Step name */
  step: string;
  /** Success status */
  success: boolean;
  /** Input data */
  input?: unknown;
  /** Output data */
  output?: unknown;
  /** Error if failed */
  error?: string;
  /** Duration in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Plugin Factory Types
// ============================================================================

/**
 * Factory function type for creating plugins
 */
export type PluginFactory<T extends Plugin> = () => T;

/**
 * Plugin metadata for registration
 */
export interface PluginMetadata {
  id: string;
  type: 'email-provider' | 'extractor' | 'portal-adapter';
  factory: PluginFactory<Plugin>;
}
