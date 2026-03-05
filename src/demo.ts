/**
 * Demo Mode - Shows the automation browser UI without real credentials
 * This opens real browsers so you can see how it works
 */
import { chromium } from 'playwright';
import { logger } from './logger';
import { extractionPatterns } from './config';

const DEMO_EMAILS = [
  {
    subject: 'Order Confirmation - ORD-98765',
    sender: 'orders@example.com',
    body: `Dear Customer,

Your order ORD-98765 has been confirmed.
CAS Number: 7732-18-5
Invoice: INV-54321
Amount: $1,234.56

Contact: support@company.com
Phone: +1 (555) 123-4567

Date: 02/26/2026

Thank you for your business!`,
  },
  {
    subject: 'Shipping Update - TRACK-ABC123XYZ',
    sender: 'shipping@logistics.com',
    body: `Hello,

Your shipment TRACK-ABC123XYZ is on its way.
Rate Card: RC-98765
Order Ref: ORD-11111

Expected delivery: 03/01/2026

Contact logistics@shipper.com for updates.`,
  },
  {
    subject: 'Monthly Invoice - INV-99999',
    sender: 'billing@supplier.com',
    body: `Invoice INV-99999
Total: $5,000.00

Payment due by 03/15/2026
Questions? Email: billing@supplier.com

Thank you!`,
  },
];

async function demo() {
  logger.info('🎬 DEMO MODE - Opening browser to show automation...\n');
  logger.info('This demo will:');
  logger.info('1. Open a browser window');
  logger.info('2. Create a mock Outlook interface');
  logger.info('3. Show extracted data from sample emails');
  logger.info('4. Navigate to a demo portal and search');
  logger.info('5. Take screenshots\n');

  // Launch browser in visible mode
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // ===== STAGE 1: Mock Outlook Interface =====
    logger.info('📧 Stage 1: Creating mock Outlook interface...');

    // Create a local HTML page that mimics Outlook
    const outlookHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
          body { display: flex; height: 100vh; background: #f3f2f1; }
          .sidebar { width: 250px; background: #c43e1c; color: white; padding: 20px; }
          .sidebar h1 { font-size: 24px; margin-bottom: 30px; }
          .folder { padding: 12px; margin: 5px 0; cursor: pointer; border-radius: 4px; }
          .folder:hover { background: rgba(255,255,255,0.1); }
          .folder.active { background: rgba(255,255,255,0.2); }
          .main { flex: 1; display: flex; flex-direction: column; }
          .toolbar { background: white; padding: 15px; border-bottom: 1px solid #e1dfdd; display: flex; gap: 10px; }
          .btn { padding: 8px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .content { flex: 1; display: flex; }
          .email-list { width: 350px; background: white; border-right: 1px solid #e1dfdd; overflow-y: auto; }
          .email-item { padding: 15px; border-bottom: 1px solid #e1dfdd; cursor: pointer; transition: background 0.2s; }
          .email-item:hover { background: #f3f2f1; }
          .email-item.active { background: #deecf9; border-left: 3px solid #0078d4; }
          .email-subject { font-weight: 600; color: #323130; margin-bottom: 4px; }
          .email-sender { font-size: 12px; color: #605e5c; margin-bottom: 4px; }
          .email-preview { font-size: 12px; color: #a19f9d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .email-detail { flex: 1; background: white; padding: 30px; overflow-y: auto; }
          .email-header { border-bottom: 1px solid #e1dfdd; padding-bottom: 20px; margin-bottom: 20px; }
          .email-title { font-size: 20px; font-weight: 600; margin-bottom: 10px; }
          .email-meta { color: #605e5c; font-size: 14px; }
          .email-body { line-height: 1.6; color: #323130; white-space: pre-wrap; }
          .extracted-data { margin-top: 30px; padding: 20px; background: #f0f9ff; border: 1px solid #0078d4; border-radius: 8px; }
          .extracted-data h3 { color: #0078d4; margin-bottom: 15px; }
          .data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e1dfdd; }
          .data-label { font-weight: 600; color: #605e5c; }
          .data-value { color: #0078d4; font-family: monospace; background: #e6f4ff; padding: 2px 8px; border-radius: 4px; }
          .status { position: fixed; bottom: 20px; right: 20px; background: #107c10; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="sidebar">
          <h1>📧 Outlook</h1>
          <div class="folder active">📥 Inbox (3)</div>
          <div class="folder">⭐ Favorites</div>
          <div class="folder">📤 Sent</div>
          <div class="folder">🗑️ Deleted</div>
          <div class="folder">📁 Processed</div>
        </div>
        <div class="main">
          <div class="toolbar">
            <button class="btn">🆕 New</button>
            <button class="btn">🗑️ Delete</button>
            <button class="btn">📁 Archive</button>
            <button class="btn" style="background: #107c10;">▶️ Run Automation</button>
          </div>
          <div class="content">
            <div class="email-list" id="emailList"></div>
            <div class="email-detail" id="emailDetail">
              <div style="text-align: center; color: #a19f9d; margin-top: 100px;">
                <h2>Select an email to view</h2>
                <p>Click on an email from the list to see extraction results</p>
              </div>
            </div>
          </div>
        </div>
        <script>
          const emails = ${JSON.stringify(DEMO_EMAILS)};
          let selectedIndex = 0;

          function renderList() {
            const list = document.getElementById('emailList');
            list.innerHTML = emails.map((email, i) => \`
              <div class="email-item \${i === selectedIndex ? 'active' : ''}" onclick="selectEmail(\${i})">
                <div class="email-subject">\${email.subject}</div>
                <div class="email-sender">\${email.sender}</div>
                <div class="email-preview">\${email.body.substring(0, 60)}...</div>
              </div>
            \`).join('');
          }

          function extractData(body) {
            const patterns = {
              orderId: /(ORD-\\d+)/,
              casNumber: /(CAS\\s*#?\\s*\\d{2,7}-\\d{2}-\\d)/i,
              invoiceNumber: /(INV-\\d+)/,
              trackingNumber: /(TRACK-[A-Z0-9]+)/,
              rateCardId: /(RC-\\d+)/,
              emails: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})/g,
              phones: /(\\+?\\d{1,4}[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{4})/g,
              amounts: /([\\$€£]\\s*[\\d,]+\\.?\\d*)/g,
              dates: /(\\d{1,2}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{2,4})/g,
            };
            
            const data = {};
            for (const [key, pattern] of Object.entries(patterns)) {
              if (key === 'emails' || key === 'phones' || key === 'amounts' || key === 'dates') {
                const matches = body.match(pattern);
                if (matches) data[key] = [...new Set(matches)];
              } else {
                const match = body.match(pattern);
                if (match) data[key] = match[1] || match[0];
              }
            }
            return data;
          }

          function selectEmail(index) {
            selectedIndex = index;
            const email = emails[index];
            const data = extractData(email.body);
            
            renderList();
            
            const detail = document.getElementById('emailDetail');
            detail.innerHTML = \`
              <div class="email-header">
                <div class="email-title">\${email.subject}</div>
                <div class="email-meta">From: \${email.sender}</div>
              </div>
              <div class="email-body">\${email.body}</div>
              <div class="extracted-data">
                <h3>🔍 Extracted Structured Data</h3>
                \${Object.entries(data).map(([k, v]) => \`
                  <div class="data-row">
                    <span class="data-label">\${k}:</span>
                    <span class="data-value">\${Array.isArray(v) ? v.join(', ') : v}</span>
                  </div>
                \`).join('')}
                \${Object.keys(data).length === 0 ? '<p>No data patterns found</p>' : ''}
              </div>
            \`;
          }

          renderList();
          selectEmail(0);
        </script>
      </body>
      </html>
    `;

    await page.setContent(outlookHtml);
    logger.info('✅ Mock Outlook loaded');

    // Show extraction for each email
    for (let i = 0; i < DEMO_EMAILS.length; i++) {
      logger.info(`\n📧 Processing Email ${i + 1}: ${DEMO_EMAILS[i].subject}`);

      // Click on email
      await page.click(`.email-item:nth-child(${i + 1})`);
      await page.waitForTimeout(1000);

      // Extract data using our actual patterns
      const body = DEMO_EMAILS[i].body;
      const extracted: Record<string, string | string[]> = {};

      const patterns = {
        orderId: body.match(extractionPatterns.orderId),
        casNumber: body.match(extractionPatterns.casNumber),
        invoiceNumber: body.match(extractionPatterns.invoiceNumber),
        trackingNumber: body.match(extractionPatterns.trackingNumber),
        rateCardId: body.match(extractionPatterns.rateCardId),
        emails: body.match(extractionPatterns.emails),
        phones: body.match(extractionPatterns.phones),
        amounts: body.match(extractionPatterns.amounts),
        dates: body.match(extractionPatterns.dates),
      };

      for (const [key, match] of Object.entries(patterns)) {
        if (match) {
          extracted[key] = match[1] || match[0];
          logger.info(`  ✅ ${key}: ${extracted[key]}`);
        }
      }

      await page.waitForTimeout(1500);
    }

    // ===== STAGE 2: Demo Portal Search =====
    logger.info('\n🌐 Stage 2: Navigating to demo portal...');

    await page.goto('https://httpbin.org/forms/post');
    logger.info('✅ Demo portal loaded (httpbin.org)');

    // Take screenshot
    await page.screenshot({
      path: 'screenshots/demo-portal-landing.png',
      fullPage: true,
    });
    logger.info('📸 Screenshot saved: demo-portal-landing.png');

    // Fill a search-like form
    logger.info('🔍 Filling search form...');
    await page.fill('input[name="custname"]', 'ORD-98765');
    await page.fill('input[name="custtel"]', '+1-555-123-4567');
    await page.fill('textarea[name="comments"]', 'Order ID: ORD-98765, CAS: 7732-18-5');

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'screenshots/demo-form-filled.png',
      fullPage: true,
    });
    logger.info('📸 Screenshot saved: demo-form-filled.png');

    // ===== STAGE 3: Show automation complete =====
    logger.info('\n✅ DEMO COMPLETE!');
    logger.info('\n📊 Summary:');
    logger.info(`  - Processed ${DEMO_EMAILS.length} emails`);
    logger.info(`  - Extracted Order IDs, CAS numbers, Invoices, etc.`);
    logger.info(`  - Navigated to portal and filled forms`);
    logger.info(`  - Screenshots saved to screenshots/ folder`);

    // Show completion page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Segoe UI', sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container { 
            text-align: center; 
            background: rgba(255,255,255,0.1);
            padding: 60px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 600px;
          }
          h1 { font-size: 48px; margin-bottom: 20px; }
          .check { font-size: 80px; margin-bottom: 30px; }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin: 30px 0;
          }
          .stat { 
            background: rgba(255,255,255,0.2); 
            padding: 20px; 
            border-radius: 10px;
          }
          .stat-value { font-size: 36px; font-weight: bold; }
          .stat-label { font-size: 14px; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="check">✅</div>
          <h1>Automation Complete!</h1>
          <p>The pipeline successfully processed all emails and extracted structured data.</p>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${DEMO_EMAILS.length}</div>
              <div class="stat-label">Emails</div>
            </div>
            <div class="stat">
              <div class="stat-value">8</div>
              <div class="stat-label">Data Fields</div>
            </div>
            <div class="stat">
              <div class="stat-value">2</div>
              <div class="stat-label">Screenshots</div>
            </div>
          </div>
          <p style="margin-top: 30px; opacity: 0.8;">
            Close this window to end the demo.
          </p>
        </div>
      </body>
      </html>
    `);

    logger.info('\n⏳ Browser will stay open for 10 seconds...');
    logger.info('   (Close it manually if you want to end sooner)');

    await page.waitForTimeout(10000);
  } catch (error) {
    logger.error('Demo failed', { error: (error as Error).message });
  } finally {
    await browser.close();
    logger.info('\n👋 Demo ended. Browser closed.');
  }
}

// Run demo
demo().catch(console.error);
