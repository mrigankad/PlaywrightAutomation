import { RegexExtractor, defaultPatterns } from '../../src/plugins/regex-extractor';
import { ExtractionConfig } from '../../src/core/types';

describe('RegexExtractor', () => {
  let extractor: RegexExtractor;

  beforeEach(async () => {
    extractor = new RegexExtractor();
    await extractor.initialize();
  });

  describe('initialize', () => {
    it('should load default patterns', async () => {
      const newExtractor = new RegexExtractor();
      await newExtractor.initialize();

      const config: ExtractionConfig = {
        fields: [{ name: 'orderId', label: 'Order ID' }],
      };

      const result = await newExtractor.extract('Order ORD-12345', config);
      expect(result.fields).toHaveLength(1);
    });
  });

  describe('addPattern', () => {
    it('should add custom pattern', async () => {
      extractor.addPattern('customField', /CUSTOM-(\d+)/i);

      const config: ExtractionConfig = {
        fields: [{ name: 'customField', label: 'Custom' }],
      };

      const result = await extractor.extract('CUSTOM-999', config);
      expect(result.fields[0].value).toBe('999');
    });
  });

  describe('removePattern', () => {
    it('should remove pattern', async () => {
      extractor.removePattern('orderId');

      const config: ExtractionConfig = {
        fields: [{ name: 'orderId', label: 'Order ID' }],
      };

      const result = await extractor.extract('Order ORD-12345', config);
      expect(result.fields).toHaveLength(0);
    });
  });

  describe('extract', () => {
    const createConfig = (fieldNames: string[]): ExtractionConfig => ({
      fields: fieldNames.map(name => ({ name, label: name })),
    });

    it('should extract order ID', async () => {
      const result = await extractor.extract(
        'Order ORD-12345 confirmed',
        createConfig(['orderId'])
      );

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toBe('orderId');
      expect(result.fields[0].value).toBe('12345');
      expect(result.fields[0].source).toBe('regex');
    });

    it('should extract invoice number', async () => {
      const result = await extractor.extract('Invoice INV-98765', createConfig(['invoiceNumber']));

      expect(result.fields[0].value).toBe('98765');
    });

    it('should extract CAS number', async () => {
      const result = await extractor.extract('CAS 7732-18-5', createConfig(['casNumber']));

      expect(result.fields[0].value).toBe('7732-18-5');
    });

    it('should extract multiple emails', async () => {
      const result = await extractor.extract('Contact john@test.com or jane@example.com', {
        fields: [{ name: 'emails', label: 'Emails', multiple: true }],
      });

      expect(Array.isArray(result.fields[0].value)).toBe(true);
      expect(result.fields[0].value).toEqual(['john@test.com', 'jane@example.com']);
    });

    it('should extract multiple phone numbers', async () => {
      const result = await extractor.extract('Call +1 (555) 123-4567 or (555) 987-6543', {
        fields: [{ name: 'phones', label: 'Phones', multiple: true }],
      });

      expect(Array.isArray(result.fields[0].value)).toBe(true);
      expect(result.fields[0].value.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract amounts', async () => {
      const result = await extractor.extract('Total: $1,234.56', createConfig(['amounts']));

      expect(result.fields[0].value).toBeDefined();
    });

    it('should handle missing patterns gracefully', async () => {
      const result = await extractor.extract('Some text', {
        fields: [{ name: 'nonexistent', label: 'Nonexistent' }],
      });

      expect(result.fields).toHaveLength(0);
    });

    it('should include raw text in result', async () => {
      const text = 'Order ORD-12345';
      const result = await extractor.extract(text, createConfig(['orderId']));

      expect(result.rawText).toBe(text);
    });

    it('should include extraction timestamp', async () => {
      const before = new Date();
      const result = await extractor.extract('Order ORD-12345', createConfig(['orderId']));
      const after = new Date();

      expect(result.extractedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.extractedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include duration', async () => {
      const result = await extractor.extract('Order ORD-12345', createConfig(['orderId']));
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should use custom patterns from config', async () => {
      const config: ExtractionConfig = {
        fields: [{ name: 'projectCode', label: 'Project Code' }],
        customPatterns: {
          projectCode: /PROJ-(\d{4})/i,
        },
      };

      const result = await extractor.extract('Project PROJ-2024 started', config);
      expect(result.fields[0].value).toBe('2024');
    });

    it('should calculate confidence scores', async () => {
      const result = await extractor.extract('Order ORD-12345', createConfig(['orderId']));

      expect(result.fields[0].confidence).toBeGreaterThan(0);
      expect(result.fields[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('validate', () => {
    it('should return true for valid extraction', async () => {
      const extraction = await extractor.extract('Order ORD-12345', {
        fields: [{ name: 'orderId', label: 'Order ID' }],
      });

      expect(extractor.validate(extraction)).toBe(true);
    });

    it('should return false for empty extraction', async () => {
      const extraction = await extractor.extract('No matching content', {
        fields: [{ name: 'orderId', label: 'Order ID' }],
      });

      expect(extractor.validate(extraction)).toBe(false);
    });
  });
});

describe('defaultPatterns', () => {
  it('should contain all expected patterns', () => {
    expect(defaultPatterns).toHaveProperty('orderId');
    expect(defaultPatterns).toHaveProperty('invoiceNumber');
    expect(defaultPatterns).toHaveProperty('casNumber');
    expect(defaultPatterns).toHaveProperty('trackingNumber');
    expect(defaultPatterns).toHaveProperty('clientName');
    expect(defaultPatterns).toHaveProperty('emails');
    expect(defaultPatterns).toHaveProperty('phones');
    expect(defaultPatterns).toHaveProperty('amounts');
    expect(defaultPatterns).toHaveProperty('dates');
  });
});
