import { ParsedReferenceRange, ReferenceStatus, EvaluatedLabStatus } from './ReferenceRangeTypes';

export class ReferenceRangeClassifier {
  /**
   * Deterministically classifies measured laboratory values against parsed reference ranges.
   * Strictly enforces:
   * 1. No external knowledge / AI assumptions
   * 2. REFERENCE_UNAVAILABLE vs UNDETERMINED distinction
   * 3. Incompatible unit safety (returns UNDETERMINED on mismatch)
   * 4. Mathematically precise boundary conditions
   */
  static classify(
    numericValue: number | null | undefined,
    parsedRange: ParsedReferenceRange,
    measuredUnit?: string | null,
    textualValue?: string | null
  ): EvaluatedLabStatus {
    // 1. If reference range is unavailable in the source document
    if (parsedRange.type === 'UNAVAILABLE' || !parsedRange.rawSource) {
      return {
        numericValue: numericValue ?? null,
        parsedRange,
        status: 'REFERENCE_UNAVAILABLE',
        referenceSource: 'NONE',
        unitMismatch: false,
        reason: 'No reference range specified in source report.',
      };
    }

    // 2. If reference range was present but unparseable or ambiguous
    if (parsedRange.type === 'INVALID' || parsedRange.isUnparseable) {
      return {
        numericValue: numericValue ?? null,
        parsedRange,
        status: 'UNDETERMINED',
        referenceSource: 'DOCUMENT',
        unitMismatch: false,
        reason: 'Reference range format is unparseable or ambiguous.',
      };
    }

    // 3. Textual reference ranges (e.g. Negative, Positive, Normal, Reactive)
    if (parsedRange.type === 'TEXTUAL') {
      // Do not convert textual reference ranges to numeric LOW/NORMAL/HIGH
      return {
        numericValue: numericValue ?? null,
        parsedRange,
        status: 'UNDETERMINED',
        referenceSource: 'DOCUMENT',
        unitMismatch: false,
        reason: 'Textual reference range cannot be classified numerically without clinical interpretation.',
      };
    }

    // 4. Unit Compatibility Check
    if (measuredUnit && parsedRange.unit) {
      const cleanMeasured = this.normalizeUnitKey(measuredUnit);
      const cleanRange = this.normalizeUnitKey(parsedRange.unit);

      if (cleanMeasured !== cleanRange) {
        return {
          numericValue: numericValue ?? null,
          parsedRange,
          status: 'UNDETERMINED',
          referenceSource: 'DOCUMENT',
          unitMismatch: true,
          reason: `Unit mismatch: measured unit '${measuredUnit}' does not match reference range unit '${parsedRange.unit}'.`,
        };
      }
    }

    // 5. If numeric value is missing / unparseable
    if (numericValue === null || numericValue === undefined || isNaN(numericValue)) {
      return {
        numericValue: null,
        parsedRange,
        status: 'UNDETERMINED',
        referenceSource: 'DOCUMENT',
        unitMismatch: false,
        reason: 'Measured value is non-numeric or missing.',
      };
    }

    // 6. Deterministic Mathematical Classification
    switch (parsedRange.type) {
      case 'BETWEEN': {
        const low = parsedRange.lower!;
        const high = parsedRange.upper!;

        if (numericValue < low) {
          return {
            numericValue,
            parsedRange,
            status: 'LOW',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        } else if (numericValue > high) {
          return {
            numericValue,
            parsedRange,
            status: 'HIGH',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        } else {
          return {
            numericValue,
            parsedRange,
            status: 'NORMAL',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        }
      }

      case 'LESS_THAN': {
        // e.g. < 13: strictly below 13 is normal; 13 or higher is high
        const high = parsedRange.upper!;
        if (numericValue < high) {
          return {
            numericValue,
            parsedRange,
            status: 'NORMAL',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        } else {
          return {
            numericValue,
            parsedRange,
            status: 'HIGH',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        }
      }

      case 'LESS_THAN_OR_EQUAL': {
        // e.g. <= 13: 13 or below is normal; strictly greater than 13 is high
        const high = parsedRange.upper!;
        if (numericValue <= high) {
          return {
            numericValue,
            parsedRange,
            status: 'NORMAL',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        } else {
          return {
            numericValue,
            parsedRange,
            status: 'HIGH',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        }
      }

      case 'GREATER_THAN': {
        // e.g. > 17: strictly above 17 is normal; 17 or lower is low
        const low = parsedRange.lower!;
        if (numericValue > low) {
          return {
            numericValue,
            parsedRange,
            status: 'NORMAL',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        } else {
          return {
            numericValue,
            parsedRange,
            status: 'LOW',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        }
      }

      case 'GREATER_THAN_OR_EQUAL': {
        // e.g. >= 17: 17 or above is normal; strictly below 17 is low
        const low = parsedRange.lower!;
        if (numericValue >= low) {
          return {
            numericValue,
            parsedRange,
            status: 'NORMAL',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        } else {
          return {
            numericValue,
            parsedRange,
            status: 'LOW',
            referenceSource: 'DOCUMENT',
            unitMismatch: false,
          };
        }
      }

      default:
        return {
          numericValue,
          parsedRange,
          status: 'UNDETERMINED',
          referenceSource: 'DOCUMENT',
          unitMismatch: false,
        };
    }
  }

  private static normalizeUnitKey(unit: string): string {
    return unit
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/·/g, '.')
      .replace(/μ/g, 'u')
      .replace(/10\^?3/g, 'k')
      .replace(/10\*3/g, 'k');
  }
}
