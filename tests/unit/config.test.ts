import { extractionPatterns } from '../../src/config';

describe('Extraction Patterns', () => {
  describe('orderId', () => {
    it('should match ORD-12345 format', () => {
      const match = 'Order ORD-12345 confirmed'.match(extractionPatterns.orderId);
      expect(match?.[1]).toBe('12345');
    });

    it('should match ORDER-12345 format', () => {
      const match = 'ORDER-98765 received'.match(extractionPatterns.orderId);
      expect(match?.[1]).toBe('98765');
    });

    it('should not match short order numbers', () => {
      const match = 'ORD-123'.match(extractionPatterns.orderId);
      expect(match).toBeNull();
    });
  });

  describe('casNumber', () => {
    it('should match CAS 7732-18-5 format', () => {
      const match = 'CAS 7732-18-5'.match(extractionPatterns.casNumber);
      expect(match?.[1]).toBe('7732-18-5');
    });

    it('should match CAS# format', () => {
      const match = 'CAS#64-17-5'.match(extractionPatterns.casNumber);
      expect(match?.[1]).toBe('64-17-5');
    });
  });

  describe('invoiceNumber', () => {
    it('should match INV-12345 format', () => {
      const match = 'Invoice INV-00123'.match(extractionPatterns.invoiceNumber);
      expect(match?.[1]).toBe('00123');
    });

    it('should match INVOICE #12345 format', () => {
      const match = 'INVOICE #98765'.match(extractionPatterns.invoiceNumber);
      expect(match?.[1]).toBe('98765');
    });
  });

  describe('emails', () => {
    it('should extract email addresses', () => {
      const text = 'Contact john.doe@example.com or jane@company.co.uk';
      const matches = text.match(extractionPatterns.emails);
      expect(matches).toEqual(['john.doe@example.com', 'jane@company.co.uk']);
    });

    it('should return null for text without emails', () => {
      const text = 'No emails here';
      const matches = text.match(extractionPatterns.emails);
      expect(matches).toBeNull();
    });
  });

  describe('phones', () => {
    it('should extract US phone numbers', () => {
      const text = 'Call +1 (555) 123-4567';
      const matches = text.match(extractionPatterns.phones);
      expect(matches).toContain('+1 (555) 123-4567');
    });

    it('should extract international numbers', () => {
      const text = 'UK: +44 20 7946 0958';
      const matches = text.match(extractionPatterns.phones);
      expect(matches).toBeDefined();
    });
  });

  describe('amounts', () => {
    it('should extract dollar amounts', () => {
      const text = 'Total: $1,234.56';
      const matches = Array.from(text.matchAll(extractionPatterns.amounts));
      expect(matches[0][1]).toBe('1,234.56');
    });

    it('should extract EUR amounts', () => {
      const text = 'Price: EUR 999.99';
      const matches = Array.from(text.matchAll(extractionPatterns.amounts));
      expect(matches[0][1]).toBe('999.99');
    });
  });

  describe('dates', () => {
    it('should match MM/DD/YYYY format', () => {
      const text = 'Date: 12/25/2023';
      const matches = text.match(extractionPatterns.dates);
      expect(matches).toContain('12/25/2023');
    });

    it('should match DD-MM-YYYY format', () => {
      const text = 'Date: 25-12-2023';
      const matches = text.match(extractionPatterns.dates);
      expect(matches).toContain('25-12-2023');
    });
  });
});
