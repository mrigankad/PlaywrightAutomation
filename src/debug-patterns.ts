/**
 * Debug tool for testing extraction patterns against your email text
 * Paste your actual email content to see what gets extracted
 */
import { extractionPatterns } from './config';

console.log('🧪 EXTRACTION PATTERN DEBUGGER\n');
console.log('This tool helps you customize patterns for your emails.\n');

// Sample email text - replace with your actual email content
const sampleEmails = [
  {
    name: 'Sample Order Email',
    text: `Subject: Order Confirmation ORD-12345
From: orders@supplier.com

Dear Customer,

Your order ORD-12345 has been confirmed.
CAS Number: 7732-18-5
Invoice Number: INV-98765
Total Amount: $1,234.56

Expected delivery: 03/15/2026
Contact us at: support@supplier.com or +1 (555) 123-4567

Tracking: TRACK-ABC123XYZ
Rate Card: RC-55443

Thank you for your business!`,
  },
  {
    name: 'Sample Invoice Email',
    text: `Subject: Invoice #INV-99999 - Payment Due
From: billing@company.com

Invoice #: INV-99999
Date: 02/26/2026
Amount Due: $5,000.00 USD

Please remit payment by 03/30/2026
Questions? Email billing@company.com`,
  },
];

console.log('Testing extraction patterns...\n');
console.log('='.repeat(60));

for (const email of sampleEmails) {
  console.log(`\n📧 ${email.name}`);
  console.log('-'.repeat(40));

  const extracted: Record<string, string | string[]> = {};

  for (const [field, pattern] of Object.entries(extractionPatterns)) {
    const match = email.text.match(pattern);
    if (match) {
      if (field === 'emails' || field === 'phones' || field === 'amounts' || field === 'dates') {
        const unique = [...new Set(match)];
        extracted[field] = unique;
        console.log(`  ✅ ${field}: ${unique.join(', ')}`);
      } else {
        extracted[field] = match[1] || match[0];
        console.log(`  ✅ ${field}: ${match[1] || match[0]}`);
      }
    }
  }

  if (Object.keys(extracted).length === 0) {
    console.log('  ⚠️  No patterns matched');
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 CUSTOMIZING PATTERNS:');
console.log('Edit src/config.ts and modify extractionPatterns\n');
console.log('Current patterns:');
for (const [field, pattern] of Object.entries(extractionPatterns)) {
  console.log(`  ${field}: ${pattern}`);
}

console.log('\n📝 TIPS FOR CUSTOM PATTERNS:');
console.log('  • Use https://regex101.com to test patterns');
console.log('  • Wrap capture groups in () to extract just that part');
console.log('  • Use (?i) for case-insensitive matching');
console.log('  • Test with your actual email content\n');

console.log('To test with YOUR email content:');
console.log('  1. Open src/debug-patterns.ts');
console.log('  2. Replace sampleEmails with your actual email text');
console.log('  3. Run: npx ts-node src/debug-patterns.ts\n');
