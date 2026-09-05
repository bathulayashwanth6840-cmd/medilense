import { ParsedReferenceRange, ReferenceRangeType } from './ReferenceRangeTypes';

export class ReferenceRangeParser {
  /**
   * Deterministically parses raw reference range string from source document.
   * Strictly preserves original source string representation.
   */
  static parse(sourceReferenceRange: string | null | undefined): ParsedReferenceRange {
    if (!sourceReferenceRange || typeof sourceReferenceRange !== 'string') {
      return {
        type: 'UNAVAILABLE',
        lower: null,
        upper: null,
        textualTarget: null,
        unit: null,
        rawSource: null,
        isUnparseable: false,
        sourceReferenceRange: null,
      };
    }

    const trimmed = sourceReferenceRange.trim();
    if (!trimmed) {
      return {
        type: 'UNAVAILABLE',
        lower: null,
        upper: null,
        textualTarget: null,
        unit: null,
        rawSource: trimmed,
        isUnparseable: false,
        sourceReferenceRange: trimmed,
      };
    }

    // Check for multiple demographic ranges (e.g. "Male: 13-17 g/dL Female: 12-15 g/dL", "Male: 13-17; Female: 12-15")
    const demographicCount = (trimmed.match(/\b(male|female|child|pediatric|adult|newborn|infant|men|women)\b/gi) || []).length;
    if (demographicCount >= 2) {
      return {
        type: 'INVALID',
        lower: null,
        upper: null,
        textualTarget: null,
        unit: null,
        rawSource: trimmed,
        isUnparseable: true,
        sourceReferenceRange: trimmed,
      };
    }

    // Strip common prefixes like "Reference Range:", "Reference interval:", "Ref Range:", "Ref:", "Normal:"
    const cleanPrefix = trimmed.replace(/^(?:reference\s*interval|reference\s*range|ref\s*range|ref|normal\s*range|normal)[:\s]*/i, '').trim();

    // Extract unit if present (must start with whitespace and letter/symbol, not standalone digits)
    const unitMatch = cleanPrefix.match(/\s+([a-zA-Z%μ][a-zA-Z0-9/%μuLdLmg\^23°·\-]*(?:\/[a-zA-Z0-9\^·\-]+)?)$/);
    let extractedUnit: string | null = null;
    let rangeBody = cleanPrefix;

    if (unitMatch && !/^(?:negative|positive|normal|reactive|non-reactive|detected|not detected)$/i.test(unitMatch[1])) {
      extractedUnit = unitMatch[1].trim();
      rangeBody = cleanPrefix.substring(0, cleanPrefix.length - unitMatch[0].length).trim();
    }

    // 1. Textual Reference Ranges (e.g., "Negative", "Positive", "Normal", "Non-reactive", "Reactive", "Not detected")
    const textualMatch = rangeBody.match(/^(negative|positive|normal|non-reactive|non reactive|reactive|not detected|detected)$/i);
    if (textualMatch) {
      return {
        type: 'TEXTUAL',
        lower: null,
        upper: null,
        textualTarget: textualMatch[1],
        unit: extractedUnit,
        rawSource: trimmed,
        isUnparseable: false,
        sourceReferenceRange: trimmed,
      };
    }

    // 2. Check for malformed patterns such as "13-17-20", "13-", "-17", "13 to", "13 seventeen", "abc"
    // Triple bounds: e.g. "13-17-20"
    if (/[0-9]+\s*[-–—]\s*[0-9]+\s*[-–—]\s*[0-9]+/.test(rangeBody)) {
      return {
        type: 'INVALID',
        lower: null,
        upper: null,
        textualTarget: null,
        unit: extractedUnit,
        rawSource: trimmed,
        isUnparseable: true,
        sourceReferenceRange: trimmed,
      };
    }

    // Trailing/Leading hyphens or incomplete words: "13-", "-17", "13 to"
    if (/^[0-9]+(?:\.[0-9]+)?\s*[-–—to]$/i.test(rangeBody) || /^[-–—]\s*[0-9]+(?:\.[0-9]+)?$/.test(rangeBody) || /^[0-9]+(?:\.[0-9]+)?\s+to$/i.test(rangeBody)) {
      return {
        type: 'INVALID',
        lower: null,
        upper: null,
        textualTarget: null,
        unit: extractedUnit,
        rawSource: trimmed,
        isUnparseable: true,
        sourceReferenceRange: trimmed,
      };
    }

    // Word numbers: "13 seventeen", "abc"
    if (/[0-9]+\s+[a-zA-Z]+/.test(rangeBody) && !/^[0-9]+(?:\.[0-9]+)?\s*(?:-|–|—|to)\s*[0-9]+(?:\.[0-9]+)?$/i.test(rangeBody)) {
      return {
        type: 'INVALID',
        lower: null,
        upper: null,
        textualTarget: null,
        unit: extractedUnit,
        rawSource: trimmed,
        isUnparseable: true,
        sourceReferenceRange: trimmed,
      };
    }

    // 3. Inequality: Less than or equal: "<= 13", "≤ 13", "≤13.0"
    const lteMatch = rangeBody.match(/^(?:<=|≤)\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (lteMatch) {
      const val = parseFloat(lteMatch[1]);
      if (!isNaN(val)) {
        return {
          type: 'LESS_THAN_OR_EQUAL',
          lower: null,
          upper: val,
          textualTarget: null,
          unit: extractedUnit,
          rawSource: trimmed,
          isUnparseable: false,
          sourceReferenceRange: trimmed,
        };
      }
    }

    // 4. Inequality: Strictly less than: "< 13", "<13.0", "< 200"
    const ltMatch = rangeBody.match(/^<\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (ltMatch) {
      const val = parseFloat(ltMatch[1]);
      if (!isNaN(val)) {
        return {
          type: 'LESS_THAN',
          lower: null,
          upper: val,
          textualTarget: null,
          unit: extractedUnit,
          rawSource: trimmed,
          isUnparseable: false,
          sourceReferenceRange: trimmed,
        };
      }
    }

    // 5. Inequality: Greater than or equal: ">= 17", "≥ 17", "≥17.0"
    const gteMatch = rangeBody.match(/^(?:>=|≥)\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (gteMatch) {
      const val = parseFloat(gteMatch[1]);
      if (!isNaN(val)) {
        return {
          type: 'GREATER_THAN_OR_EQUAL',
          lower: val,
          upper: null,
          textualTarget: null,
          unit: extractedUnit,
          rawSource: trimmed,
          isUnparseable: false,
          sourceReferenceRange: trimmed,
        };
      }
    }

    // 6. Inequality: Strictly greater than: "> 17", ">17.0", "> 40"
    const gtMatch = rangeBody.match(/^>\s*([0-9]+(?:\.[0-9]+)?)$/);
    if (gtMatch) {
      const val = parseFloat(gtMatch[1]);
      if (!isNaN(val)) {
        return {
          type: 'GREATER_THAN',
          lower: val,
          upper: null,
          textualTarget: null,
          unit: extractedUnit,
          rawSource: trimmed,
          isUnparseable: false,
          sourceReferenceRange: trimmed,
        };
      }
    }

    // 7. Between / Inclusive Range: "13-17", "13 - 17", "13 – 17", "13 to 17", "13.0 - 17.0", "13.0–17.0"
    const betweenMatch = rangeBody.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|to)\s*([0-9]+(?:\.[0-9]+)?)$/i);
    if (betweenMatch) {
      const low = parseFloat(betweenMatch[1]);
      const high = parseFloat(betweenMatch[2]);
      if (!isNaN(low) && !isNaN(high) && low <= high) {
        return {
          type: 'BETWEEN',
          lower: low,
          upper: high,
          textualTarget: null,
          unit: extractedUnit,
          rawSource: trimmed,
          isUnparseable: false,
          sourceReferenceRange: trimmed,
        };
      } else {
        return {
          type: 'INVALID',
          lower: null,
          upper: null,
          textualTarget: null,
          unit: extractedUnit,
          rawSource: trimmed,
          isUnparseable: true,
          sourceReferenceRange: trimmed,
        };
      }
    }

    // Fallback: unparseable or unrecognized format
    return {
      type: 'INVALID',
      lower: null,
      upper: null,
      textualTarget: null,
      unit: extractedUnit,
      rawSource: trimmed,
      isUnparseable: true,
      sourceReferenceRange: trimmed,
    };
  }
}
