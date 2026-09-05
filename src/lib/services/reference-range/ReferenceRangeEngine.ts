import { ReferenceRangeParser } from './ReferenceRangeParser';
import { ReferenceRangeClassifier } from './ReferenceRangeClassifier';
import {
  ParsedReferenceRange,
  ReferenceStatus,
  EvaluatedLabStatus,
} from './ReferenceRangeTypes';

export interface IReferenceRangeEngine {
  parse(sourceReferenceRange: string | null): ParsedReferenceRange;
  classify(
    numericValue: number | null,
    parsedRange: ParsedReferenceRange,
    measuredUnit?: string | null
  ): ReferenceStatus;
}

export class ReferenceRangeEngine implements IReferenceRangeEngine {
  /**
   * Deterministic Parsing: extracts bounds and formats from source reference range text
   */
  parse(sourceReferenceRange: string | null | undefined): ParsedReferenceRange {
    return ReferenceRangeParser.parse(sourceReferenceRange);
  }

  /**
   * Deterministic Classification: classifies numeric value against parsed bounds
   */
  classify(
    numericValue: number | null,
    parsedRange: ParsedReferenceRange,
    measuredUnit?: string | null
  ): ReferenceStatus {
    const result = ReferenceRangeClassifier.classify(numericValue, parsedRange, measuredUnit);
    return result.status;
  }

  /**
   * Evaluates a full lab result candidate with strict anti-hallucination source verification.
   */
  evaluateLab(lab: {
    value?: string;
    numericValue?: number | null;
    unit?: string | null;
    sourceReferenceRange?: string | null;
    referenceRange?: string | null;
    sourceText?: string;
    referenceLow?: number | null;
    referenceHigh?: number | null;
    fullDocumentText?: string;
  }): EvaluatedLabStatus {
    const rawRange = lab.sourceReferenceRange ?? lab.referenceRange ?? null;
    const sourceText = lab.sourceText || '';

    // 1. Anti-hallucination check: Verify that if a reference range is claimed, it is backed by sourceText
    if (rawRange && sourceText) {
      const isSupported = this.verifySourceEvidence(rawRange, sourceText, lab.fullDocumentText);
      if (!isSupported) {
        // Hallucinated range detected! Reject range and set to REFERENCE_UNAVAILABLE
        const unavailableRange = ReferenceRangeParser.parse(null);
        return {
          numericValue: lab.numericValue ?? null,
          parsedRange: unavailableRange,
          status: 'REFERENCE_UNAVAILABLE',
          referenceSource: 'NONE',
          unitMismatch: false,
          reason: `Rejected hallucinated reference range '${rawRange}': not found in source text evidence.`,
        };
      }
    }

    // 2. Parse range
    const parsedRange = this.parse(rawRange);

    // 3. Classify
    return ReferenceRangeClassifier.classify(
      lab.numericValue ?? null,
      parsedRange,
      lab.unit,
      lab.value
    );
  }

  /**
   * Anti-Hallucination Guardrail:
   * Checks whether the claimed reference range or its numeric values actually appear in the source snippet or document.
   */
  verifySourceEvidence(
    rangeText: string | null,
    sourceText: string,
    fullDocumentText?: string
  ): boolean {
    if (!rangeText) return true;
    const cleanRange = rangeText.trim().toLowerCase();
    const cleanSource = sourceText.toLowerCase();
    const cleanDoc = fullDocumentText ? fullDocumentText.toLowerCase() : '';

    // Check direct substring
    if (cleanSource.includes(cleanRange) || (cleanDoc && cleanDoc.includes(cleanRange))) {
      return true;
    }

    // Check if numeric bounds in the range appear in sourceText
    const numbersInRange = cleanRange.match(/[0-9]+(?:\.[0-9]+)?/g);
    if (numbersInRange && numbersInRange.length > 0) {
      const allNumbersFound = numbersInRange.every(
        num => cleanSource.includes(num) || (cleanDoc && cleanDoc.includes(num))
      );
      if (allNumbersFound) return true;
    }

    return false;
  }
}

// Export singleton instance for app-wide use
export const referenceRangeEngine = new ReferenceRangeEngine();
