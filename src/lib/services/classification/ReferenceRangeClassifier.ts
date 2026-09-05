import { LaboratoryResult } from '../validation/schemas';

export interface EvaluatedReferenceRange {
  numericValue: number | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'REFERENCE_UNAVAILABLE';
  referenceSource: 'DOCUMENT' | 'NONE';
  rawRangeText: string | null;
}

export class ReferenceRangeClassifier {
  /**
   * Deterministic Non-Negotiable Classification of Laboratory Results.
   * Strictly evaluates the measured value against ONLY source-provided bounds.
   * NEVER infers ranges from external knowledge, medical databases, or LLM assumptions.
   */
  static classifyLabResult(lab: Partial<LaboratoryResult>): EvaluatedReferenceRange {
    const rawVal = lab.value || '';
    const rawRange = lab.referenceRange || null;

    // 1. Parse numeric value from measured string
    let numericValue: number | null = null;
    if (lab.numericValue !== undefined && lab.numericValue !== null && !isNaN(lab.numericValue)) {
      numericValue = lab.numericValue;
    } else {
      const matchNum = rawVal.match(/[-+]?[0-9]*\.?[0-9]+/);
      if (matchNum) {
        const parsed = parseFloat(matchNum[0]);
        if (!isNaN(parsed)) numericValue = parsed;
      }
    }

    // 2. Parse reference bounds strictly from source range text
    let refLow: number | null = lab.referenceLow ?? null;
    let refHigh: number | null = lab.referenceHigh ?? null;

    if (rawRange && (refLow === null || refHigh === null)) {
      const parsedBounds = this.parseRangeBounds(rawRange);
      if (refLow === null) refLow = parsedBounds.low;
      if (refHigh === null) refHigh = parsedBounds.high;
    }

    // If no reference range was provided in the source document
    if (!rawRange || (refLow === null && refHigh === null)) {
      return {
        numericValue,
        referenceLow: null,
        referenceHigh: null,
        status: 'REFERENCE_UNAVAILABLE',
        referenceSource: 'NONE',
        rawRangeText: rawRange,
      };
    }

    // If measured value cannot be numerically evaluated
    if (numericValue === null) {
      return {
        numericValue: null,
        referenceLow: refLow,
        referenceHigh: refHigh,
        status: 'REFERENCE_UNAVAILABLE',
        referenceSource: 'DOCUMENT',
        rawRangeText: rawRange,
      };
    }

    // 3. Deterministic Evaluation against source document bounds
    let status: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL';

    // Both Low and High bounds present (e.g. 13.0 - 17.0)
    if (refLow !== null && refHigh !== null) {
      if (numericValue < refLow) {
        status = 'LOW';
      } else if (numericValue > refHigh) {
        status = 'HIGH';
      } else {
        status = 'NORMAL';
      }
    }
    // Only High bound present (e.g. < 200 mg/dL or <= 150)
    else if (refHigh !== null && refLow === null) {
      if (numericValue > refHigh) {
        status = 'HIGH';
      } else {
        status = 'NORMAL';
      }
    }
    // Only Low bound present (e.g. > 40 mg/dL or >= 30)
    else if (refLow !== null && refHigh === null) {
      if (numericValue < refLow) {
        status = 'LOW';
      } else {
        status = 'NORMAL';
      }
    }

    return {
      numericValue,
      referenceLow: refLow,
      referenceHigh: refHigh,
      status,
      referenceSource: 'DOCUMENT',
      rawRangeText: rawRange,
    };
  }

  /**
   * Helper to parse low/high numeric bounds from raw source reference range strings
   */
  private static parseRangeBounds(rangeText: string): { low: number | null; high: number | null } {
    if (!rangeText || typeof rangeText !== 'string') {
      return { low: null, high: null };
    }

    const clean = rangeText.trim();

    // Less-than format: e.g., "< 200", "<= 150", "<200 mg/dL"
    const lessMatch = clean.match(/^[<≤]\s*([0-9]+(?:\.[0-9]+)?)/);
    if (lessMatch) {
      return { low: null, high: parseFloat(lessMatch[1]) };
    }

    // Greater-than format: e.g., "> 40", ">= 30"
    const greaterMatch = clean.match(/^[>≥]\s*([0-9]+(?:\.[0-9]+)?)/);
    if (greaterMatch) {
      return { low: parseFloat(greaterMatch[1]), high: null };
    }

    // Two bounds: e.g., "13.0 - 17.0", "70 – 99", "150-450", "3.5 to 5.0"
    const dualMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|to)\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (dualMatch) {
      const low = parseFloat(dualMatch[1]);
      const high = parseFloat(dualMatch[2]);
      return {
        low: isNaN(low) ? null : low,
        high: isNaN(high) ? null : high,
      };
    }

    return { low: null, high: null };
  }
}
