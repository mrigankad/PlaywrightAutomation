# Quick Start Guide - See It Work With Your Emails

## 🎯 Three Ways to Test

### 1. 🔍 PREVIEW MODE (Recommended First)

Shows what data will be extracted from YOUR real Outlook emails:

```bash
npm run preview
```

**What happens:**

- Opens Chrome browser
- Logs into YOUR Outlook (using .env credentials)
- Opens each email one by one
- Shows extracted data in terminal
- Tells you what WOULD be searched
- **Does NOT search portal** (safe preview)

**Screenshot of what you see:**

```
📧 Email 1
----------------------------------------
Subject: Order Confirmation ORD-12345
From: orders@supplier.com

📊 Extracted Data:
  ✅ orderId: 12345
  ✅ casNumber: 7732-18-5
  ✅ invoiceNumber: INV-98765
  ✅ amounts: $1,234.56

🔍 WOULD SEARCH: orderId = "12345"
   Portal: https://your-portal.com
```

---

### 2. 🧪 DEBUG PATTERNS (Test without browser)

See what patterns match your email text:

```bash
npm run debug:patterns
```

**To test YOUR email content:**

1. Open `src/debug-patterns.ts`
2. Replace `sampleEmails` with your actual email:

```typescript
const sampleEmails = [
  {
    name: 'My Real Email',
    text: `PASTE YOUR EMAIL CONTENT HERE`,
  },
];
```

3. Run again: `npm run debug:patterns`

---

### 3. 🚀 FULL AUTOMATION

Run the complete pipeline:

```bash
npm run dev
```

**What happens:**

- Opens Chrome
- Logs into Outlook
- Extracts data from emails
- Navigates to portal
- Searches with extracted data
- Takes screenshots
- Moves processed emails to folder

---

## 📋 Available Commands

| Command                  | Purpose                      |
| ------------------------ | ---------------------------- |
| `npm run preview`        | Preview extraction (dry run) |
| `npm run debug:patterns` | Test patterns against text   |
| `npm run dev`            | Full automation              |
| `npm run demo`           | Demo with fake data          |
| `npm run test:config`    | Verify .env setup            |
| `npm run cli -- --quick` | Use saved auth (faster)      |

---

## 🔧 Customizing for YOUR Emails

### Step 1: Run Preview

```bash
npm run preview
```

### Step 2: Check the Output

Look at the console - do you see your data?

**If yes:** Great! Run `npm run dev`

**If no:** Your emails have different formats. Let's fix patterns.

### Step 3: Adjust Patterns (if needed)

1. Look at the "Sample Raw Text" in the preview output
2. Identify the pattern in your emails
3. Edit `src/config.ts`:

```typescript
export const extractionPatterns = {
  // Add/modify patterns here
  orderId: /(?:Order\s*#?\s*)(\d+)/i, // Matches "Order 12345"
  yourCustomField: /YourPatternHere/,
};
```

4. Test with: `npm run debug:patterns`

---

## 🎨 Pattern Examples

### Order Numbers

```typescript
// Matches: ORD-12345, ORDER-12345, Order #12345
orderId: /(?:ORD(?:ER)?[#\s-]*)(\d{4,})/i;

// Matches: PO12345, PO-12345
poNumber: /(?:PO[#\s-]*)(\d{4,})/i;
```

### Reference Numbers

```typescript
// Matches: REF-ABC123, Reference: ABC123
reference: /(?:REF(?:ERENCE)?[#\s:-]*)([A-Z0-9]{6,})/i;
```

### Custom Formats

```typescript
// Your company's format: XX-YYYY-ZZZ
projectCode: /\b([A-Z]{2}-\d{4}-[A-Z]{3})\b/;
```

---

## 🆘 Troubleshooting

### "No data extracted"

- Run `npm run preview` and check "Sample Raw Text"
- Copy that text to `src/debug-patterns.ts`
- Adjust patterns to match your format

### "Can't find search box"

- Open your portal in browser
- Right-click search box → Inspect
- Find `id="..."` or `class="..."`
- Update `SEARCH_INPUT_SELECTOR` in `.env`

### "Login failed"

- Run `npm run test:config`
- Check credentials in `.env`
- Delete `storage/auth.json` to force re-auth

---

## 🎯 Typical Workflow

```bash
# 1. Setup (one time)
npm run setup

# 2. Preview (see what will happen)
npm run preview

# 3. Adjust patterns if needed
notepad src/config.ts
npm run debug:patterns

# 4. Run full automation
npm run dev

# 5. Future runs (uses saved login)
npm run cli -- --quick --count 5
```

---

## 💡 Pro Tips

1. **Start with preview** - Always preview before full run
2. **Check logs** - Detailed logs in `logs/` folder
3. **Screenshots** - All results saved to `screenshots/`
4. **JSON report** - Preview saves to `logs/preview-report.json`
5. **Headless mode** - Add `HEADLESS=true` to .env for background running

---

## 🚀 Ready?

**Start here:**

```bash
npm run preview
```

Watch the browser open your emails and see the magic happen! ✨
