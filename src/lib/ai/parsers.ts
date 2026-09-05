// Strict Clinical Reference Range Parser for MedLens
// Critical Rule: Never extrapolate, assume, or invent medical reference ranges.
// If a range is missing from the source report, status is strictly REFERENCE_RANGE_UNAVAILABLE.

import { ReferenceInterpretation } from '@/types/clinical';

export interface ParsedRangeResult {
  numericValue: number | null;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  interpretation: ReferenceInterpretation;
  rawRangeText: string | null;
}

/**
 * Extracts numeric value from a string (e.g., "11.2", ">150", "11.2 g/dL", "< 0.05")
 */
export function parseNumericValue(valueStr: string | null | undefined): number | null {
  if (!valueStr) return null;
  const clean = valueStr.replace(/,/g, '').trim();
  const match = clean.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Evaluates a measured laboratory value against the explicitly provided source reference range.
 */
export function evaluateReferenceRange(
  measuredValueStr: string,
  referenceRangeText?: string | null
): ParsedRangeResult {
  const numericVal = parseNumericValue(measuredValueStr);
  const trimmedRange = referenceRangeText?.trim() || null;

  // 1. If reference range is completely missing, empty, or unspecified:
  if (!trimmedRange || /^(n\/?a|none|not specified|unspecified|unknown|-)$/i.test(trimmedRange)) {
    return {
      numericValue: numericVal,
      refRangeLow: null,
      refRangeHigh: null,
      interpretation: 'REFERENCE_UNAVAILABLE',
      rawRangeText: trimmedRange,
    };
  }

  // 2. Qualitative / Text-based reference ranges (e.g. "Negative", "Non-reactive", "Normal")
  const qualitativeNormalPatterns = /^(negative|non[- ]reactive|normal|absent|none seen|clear)$/i;
  if (qualitativeNormalPatterns.test(trimmedRange)) {
    const isQualitativeMatch = qualitativeNormalPatterns.test(measuredValueStr.trim());
    return {
      numericValue: numericVal,
      refRangeLow: null,
      refRangeHigh: null,
      interpretation: isQualitativeMatch ? 'NORMAL' : 'HIGH',
      rawRangeText: trimmedRange,
    };
  }

  // 3. Less than / Greater than format (e.g., "< 200", "<= 140", "> 60", ">= 90")
  const lessThanMatch = trimmedRange.match(/^(?:<|<=|less than)\s*([0-9.]+)/i);
  if (lessThanMatch && numericVal !== null) {
    const maxVal = parseFloat(lessThanMatch[1]);
    return {
      numericValue: numericVal,
      refRangeLow: null,
      refRangeHigh: maxVal,
      interpretation: numericVal <= maxVal ? 'NORMAL' : 'HIGH',
      rawRangeText: trimmedRange,
    };
  }

  const greaterThanMatch = trimmedRange.match(/^(?:>|>=|greater than)\s*([0-9.]+)/i);
  if (greaterThanMatch && numericVal !== null) {
    const minVal = parseFloat(greaterThanMatch[1]);
    return {
      numericValue: numericVal,
      refRangeLow: minVal,
      refRangeHigh: null,
      interpretation: numericVal >= minVal ? 'NORMAL' : 'LOW',
      rawRangeText: trimmedRange,
    };
  }

  // 4. Standard Two-sided numeric range (e.g., "13.0 - 17.0", "13.0-17.0", "13 to 17", "70 - 99 mg/dL")
  const rangeMatch = trimmedRange.match(/([0-9.]+)\s*(?:-|–|—|to)\s*([0-9.]+)/i);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);

    if (!isNaN(low) && !isNaN(high)) {
      if (numericVal === null) {
        return {
          numericValue: null,
          refRangeLow: low,
          refRangeHigh: high,
          interpretation: 'NORMAL',
          rawRangeText: trimmedRange,
        };
      }

      let interpretation: ReferenceInterpretation = 'NORMAL';
      if (numericVal < low) {
        interpretation = 'LOW';
      } else if (numericVal > high) {
        interpretation = 'HIGH';
      } else {
        interpretation = 'NORMAL';
      }

      return {
        numericValue: numericVal,
        refRangeLow: low,
        refRangeHigh: high,
        interpretation,
        rawRangeText: trimmedRange,
      };
    }
  }

  // Fallback if range format was irregular/unparseable:
  return {
    numericValue: numericVal,
    refRangeLow: null,
    refRangeHigh: null,
    interpretation: 'REFERENCE_UNAVAILABLE',
    rawRangeText: trimmedRange,
  };
}
