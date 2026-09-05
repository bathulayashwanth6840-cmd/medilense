import { LaboratoryResult } from '../validation/schemas';
import { referenceRangeEngine } from '../reference-range/ReferenceRangeEngine';
import { ReferenceStatus } from '../reference-range/ReferenceRangeTypes';

export interface EvaluatedReferenceRange {
  numericValue: number | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  status: ReferenceStatus;
  referenceSource: 'DOCUMENT' | 'NONE';
  rawRangeText: string | null;
}

export class ReferenceRangeClassifier {
  /**
   * Deterministic Non-Negotiable Classification of Laboratory Results.
   * Evaluates the measured value against ONLY source-provided bounds.
   * NEVER infers ranges from external knowledge, medical databases, or LLM assumptions.
   */
  static classifyLabResult(lab: Partial<LaboratoryResult>): EvaluatedReferenceRange {
    const rawRange = lab.sourceReferenceRange ?? lab.referenceRange ?? null;
    const evaluated = referenceRangeEngine.evaluateLab({
      value: lab.value,
      numericValue: lab.numericValue,
      unit: lab.unit,
      sourceReferenceRange: rawRange,
      sourceText: lab.sourceText || '',
    });

    return {
      numericValue: evaluated.numericValue,
      referenceLow: evaluated.parsedRange.lower,
      referenceHigh: evaluated.parsedRange.upper,
      status: evaluated.status,
      referenceSource: evaluated.referenceSource,
      rawRangeText: rawRange,
    };
  }
}
