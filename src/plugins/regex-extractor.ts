import { logger } from '../logger';
import { DataExtractor, ExtractionResult, ExtractionConfig, ExtractedField } from '../core/types';

/**
 * Default extraction patterns
 */
export const defaultPatterns: Record<string, RegExp> = {
  // Order ID: matches ORD-12345, ORDER-12345, Order #12345, etc.
  orderId: /(?:ORD(?:ER)?[#\s-]*)(\d{4,})/i,

  // Invoice number: matches INV-12345, INVOICE #12345, etc.
  invoiceNumber: /(?:INV(?:OICE)?[#\s-]*)(\d{4,})/i,

  // CAS Number: matches CAS 123-45-6, CAS#123456-78-9, etc.
  casNumber: /(?:CAS\s*#?\s*)(\d{2,7}-\d{2}-\d)/i,

  // Rate Card ID: matches RC-12345, RATECARD-12345, etc.
  rateCardId: /(?:RC|RATE\s*CARD)[#\s-]*(\d{4,})/i,

  // Tracking number: matches various formats
  trackingNumber: /(?:TRACK(?:ING)?[#\s:-]*)([A-Z0-9]{8,})/i,

  // Client name
  clientName: /(?:CLIENT|CUSTOMER)[\s:]*([A-Z][A-Za-z\s&]+?)(?=\n|\r|EMAIL|PHONE|$)/i,

  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Phone numbers
  phones: /\+?\d{1,4}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,

  // Amount/Currency
  amounts: /(?:[$€£]|USD|EUR|GBP)\s*([\d,]+\.?\d*)/g,

  // Dates
  dates: /\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/g,
};

/**
 * Regex-based data extractor plugin
 */
export class RegexExtractor implements DataExtractor {
  readonly id = 'regex-extractor';
  readonly name = 'Regex Pattern Extractor';
  readonly version = '1.0.0';
  readonly type = 'extractor' as const;
  readonly description = 'Extracts data using configurable regex patterns';

  private patterns: Map<string, RegExp> = new Map();

  /**
   * Initialize with default patterns
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(): Promise<void> {
    // Load default patterns
    for (const [key, pattern] of Object.entries(defaultPatterns)) {
      this.patterns.set(key, pattern);
    }
    logger.info('Regex extractor initialized with default patterns');
  }

  /**
   * Add a custom pattern
   */
  addPattern(name: string, pattern: RegExp): void {
    this.patterns.set(name, pattern);
  }

  /**
   * Remove a pattern
   */
  removePattern(name: string): void {
    this.patterns.delete(name);
  }

  /**
   * Extract data from content
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async extract(content: string, config: ExtractionConfig): Promise<ExtractionResult> {
    const startTime = Date.now();
    const fields: ExtractedField[] = [];

    // Merge custom patterns
    if (config.customPatterns) {
      for (const [name, pattern] of Object.entries(config.customPatterns)) {
        this.patterns.set(name, pattern);
      }
    }

    // Extract each configured field
    for (const fieldConfig of config.fields) {
      const pattern = this.patterns.get(fieldConfig.name);
      if (!pattern) {
        logger.warn(`No pattern found for field: ${fieldConfig.name}`);
        continue;
      }

      const matches = this.extractWithPattern(content, pattern, fieldConfig.multiple ?? false);

      if (matches.length > 0) {
        fields.push({
          name: fieldConfig.name,
          value: fieldConfig.multiple ? matches : matches[0],
          confidence: this.calculateConfidence(matches, content.length),
          source: 'regex',
        });
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info('Extraction complete', {
      fieldCount: fields.length,
      durationMs,
    });

    return {
      fields,
      rawText: content,
      extractedAt: new Date(),
      durationMs,
    };
  }

  /**
   * Validate extraction result
   */
  validate(result: ExtractionResult): boolean {
    return result.fields.length > 0 && result.fields.every(f => f.confidence > 0);
  }

  /**
   * Extract matches using a pattern
   */
  private extractWithPattern(content: string, pattern: RegExp, multiple: boolean): string[] {
    const matches: string[] = [];
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    );

    if (multiple) {
      // Extract all matches
      const allMatches = content.match(globalPattern);
      if (allMatches) {
        matches.push(...allMatches);
      }
    } else {
      // Extract first match (capturing group if available)
      const match = content.match(pattern);
      if (match) {
        // Use capturing group if present, otherwise full match
        matches.push(match[1] ?? match[0]);
      }
    }

    return matches;
  }

  /**
   * Calculate confidence score based on match quality
   */
  private calculateConfidence(matches: string[], contentLength: number): number {
    if (matches.length === 0) {
      return 0;
    }

    // Base confidence
    let confidence = 0.8;

    // Boost for exact matches (not just pattern matches)
    const avgLength = matches.reduce((sum, m) => sum + m.length, 0) / matches.length;
    if (avgLength > 3) {
      confidence += 0.1;
    }

    // Penalize very long content (more chance of false positives)
    if (contentLength > 10000) {
      confidence -= 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}

/**
 * Factory function for creating regex extractor
 */
export function createRegexExtractor(): RegexExtractor {
  return new RegexExtractor();
}
