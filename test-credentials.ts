/**
 * Test script to verify credentials are properly configured
 * WITHOUT actually logging in or running automation
 */
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

console.log('🔐 Credential Validation Test\n');
console.log('='.repeat(50));

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found!');
  console.log('\nRun the setup script first:');
  console.log('  .\\setup-credentials.ps1');
  process.exit(1);
}

console.log('✅ .env file exists\n');

// Check required fields
const required = [
  { key: 'OUTLOOK_EMAIL', name: 'Outlook Email' },
  { key: 'OUTLOOK_PASSWORD', name: 'Outlook Password' },
  { key: 'PORTAL_URL', name: 'Portal URL' },
];

const optional = [
  { key: 'PORTAL_USERNAME', name: 'Portal Username' },
  { key: 'PORTAL_PASSWORD', name: 'Portal Password' },
  { key: 'OUTLOOK_URL', name: 'Outlook URL', default: 'https://outlook.office.com/mail/' },
  { key: 'MAX_EMAILS_TO_PROCESS', name: 'Max Emails', default: '10' },
  { key: 'HEADLESS', name: 'Headless Mode', default: 'false' },
];

let hasErrors = false;

console.log('📋 Required Fields:');
for (const field of required) {
  const value = process.env[field.key];
  if (!value || value === 'your-email@company.com' || value === 'your-password') {
    console.log(`  ❌ ${field.name}: Not configured`);
    hasErrors = true;
  } else {
    if (field.key.includes('PASSWORD')) {
      console.log(`  ✅ ${field.name}: ${'*'.repeat(Math.min(value.length, 8))}`);
    } else {
      console.log(`  ✅ ${field.name}: ${value}`);
    }
  }
}

console.log('\n📋 Optional Fields:');
for (const field of optional) {
  const value = process.env[field.key];
  if (!value) {
    console.log(`  ⚠️  ${field.name}: Using default (${field.default})`);
  } else {
    if (field.key.includes('PASSWORD')) {
      console.log(`  ✅ ${field.name}: ${'*'.repeat(Math.min(value.length, 8))}`);
    } else {
      console.log(`  ✅ ${field.name}: ${value}`);
    }
  }
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ Validation FAILED');
  console.log('Please run: .\\setup-credentials.ps1');
  process.exit(1);
} else {
  console.log('\n✅ All required credentials are set!');
  console.log('\nYou can now run the automation:');
  console.log('  npm run dev      # Full automation');
  console.log('  npm run demo     # Demo mode (no credentials needed)');
  console.log('\n🎉 Ready to go!');
}
