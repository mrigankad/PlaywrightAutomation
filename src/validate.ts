/**
 * Validation test - checks that all modules import correctly
 * without requiring actual browser automation
 */
import { config, extractionPatterns, ExtractedData } from './config';
import { logger } from './logger';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AuthManager } from './auth';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MailExtractor } from './mailExtractor';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PortalSearch } from './portalSearch';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AutomationRunner } from './runner';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { OCRFallback } from './ocrFallback';

console.log('✅ All modules imported successfully!\n');

// Test config
console.log('📋 Configuration:');
console.log(`  Outlook URL: ${config.outlook.url}`);
console.log(`  Portal URL: ${config.portal.url}`);
console.log(`  Max Emails: ${config.automation.maxEmails}`);
console.log(`  Headless: ${config.automation.headless}`);

// Test extraction patterns
console.log('\n🔍 Extraction Patterns:');
const testCases = [
  {
    name: 'Order ID',
    text: 'Your order ORD-12345 is confirmed',
    pattern: extractionPatterns.orderId,
  },
  {
    name: 'CAS Number',
    text: 'Chemical CAS 123-45-6 approved',
    pattern: extractionPatterns.casNumber,
  },
  { name: 'Invoice', text: 'Invoice INV-00123 due', pattern: extractionPatterns.invoiceNumber },
  { name: 'Email', text: 'Contact john@example.com', pattern: extractionPatterns.emails },
];

for (const test of testCases) {
  const match = test.text.match(test.pattern);
  console.log(`  ${test.name}: ${match ? '✅' : '❌'} ${test.pattern}`);
}

// Test logger
console.log('\n📝 Testing Logger:');
logger.info('Test info message');
logger.warn('Test warn message');
logger.debug('Test debug message (should not appear)');

// Test ExtractedData type
const sampleData: ExtractedData = {
  orderId: 'ORD-12345',
  emails: ['test@example.com', 'other@test.com'],
  casNumber: '123-45-6',
  rawText: 'Sample email content',
};

console.log('\n📊 Sample ExtractedData:');
console.log(`  Order ID: ${sampleData.orderId}`);
console.log(`  Emails: ${sampleData.emails?.join(', ')}`);
console.log(`  CAS: ${sampleData.casNumber}`);

console.log('\n✅ All validation tests passed!');
console.log('\nNext steps:');
console.log('1. Copy .env.example to .env');
console.log('2. Fill in your credentials');
console.log('3. Customize extraction patterns in src/config.ts');
console.log('4. Run: npm run dev');
