import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Outlook Configuration
  outlook: {
    url: process.env.OUTLOOK_URL ?? 'https://outlook.office.com/mail/',
    email: process.env.OUTLOOK_EMAIL ?? '',
    password: process.env.OUTLOOK_PASSWORD ?? '',
  },

  // Portal Configuration
  portal: {
    url: process.env.PORTAL_URL ?? 'https://example-portal.com',
    username: process.env.PORTAL_USERNAME ?? '',
    password: process.env.PORTAL_PASSWORD ?? '',
  },

  // Selectors - customize based on your portal
  selectors: {
    searchInput: process.env.SEARCH_INPUT_SELECTOR ?? '#searchInput',
    searchButton: process.env.SEARCH_BUTTON_SELECTOR ?? '#searchBtn',
    results: process.env.RESULTS_SELECTOR ?? '.search-results',
  },

  // Automation Settings
  automation: {
    headless: process.env.HEADLESS === 'true',
    slowMo: parseInt(process.env.SLOW_MO ?? '100', 10),
    maxEmails: parseInt(process.env.MAX_EMAILS_TO_PROCESS ?? '10', 10),
    processedFolder: process.env.PROCESSED_FOLDER_NAME ?? 'Processed',
  },

  // Paths
  paths: {
    storage: path.join(__dirname, '../storage/auth.json'),
    screenshots: path.join(__dirname, '../screenshots'),
    logs: path.join(__dirname, '../logs'),
  },

  // Logging
  logging: {
    level: (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
};

// Extraction patterns - customize based on your email structure
export const extractionPatterns = {
  // Order ID: matches ORD-12345, ORDER-12345, etc.
  orderId: /(?:ORD(?:ER)?-?\s*)(\d{4,})/i,

  // Invoice number: matches INV-12345, INVOICE #12345, etc.
  invoiceNumber: /(?:INV(?:OICE)?[#\s-]*)(\d{4,})/i,

  // CAS Number: matches CAS 123-45-6, CAS#123456-78-9, etc.
  casNumber: /(?:CAS\s*#?\s*)(\d{2,7}-\d{2}-\d)/i,

  // Rate Card ID: matches RC-12345, RATECARD-12345, etc.
  rateCardId: /(?:RC|RATE\s*CARD)[#\s-]*(\d{4,})/i,

  // Tracking number: matches various formats
  trackingNumber: /(?:TRACK(?:ING)?[#\s:-]*)([A-Z0-9]{8,})/i,

  // Client name: extracts from "Client: Name" or "Customer: Name"
  clientName: /(?:CLIENT|CUSTOMER)[\s:]*([A-Z][A-Za-z\s&]+?)(?=\n|\r|EMAIL|PHONE|$)/i,

  // Email addresses
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Phone numbers
  phones: /\+?\d{1,4}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,

  // Amount/Currency: $1,234.56 or USD 1234.56
  // eslint-disable-next-line no-useless-escape
  amounts: /(?:[\$€£]|USD|EUR|GBP)\s*([\d,]+\.?\d*)/g,

  // Date: various formats (MM/DD/YYYY, DD-MM-YYYY, etc.)
  // eslint-disable-next-line no-useless-escape
  dates: /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g,
};

export type ExtractedData = {
  orderId?: string;
  invoiceNumber?: string;
  casNumber?: string;
  rateCardId?: string;
  trackingNumber?: string;
  clientName?: string;
  emails?: string[];
  phones?: string[];
  amounts?: string[];
  dates?: string[];
  rawText?: string;
  [key: string]: string | string[] | undefined;
};
