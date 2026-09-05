export type ReferenceRangeType =
  | 'BETWEEN'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'TEXTUAL'
  | 'INVALID'
  | 'UNAVAILABLE';

export type ReferenceStatus =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'REFERENCE_UNAVAILABLE'
  | 'UNDETERMINED';

export interface ParsedReferenceRange {
  type: ReferenceRangeType;
  lower: number | null;
  upper: number | null;
  textualTarget: string | null;
  unit: string | null;
  rawSource: string | null;
  isUnparseable: boolean;
  sourceReferenceRange: string | null;
}

export interface EvaluatedLabStatus {
  numericValue: number | null;
  parsedRange: ParsedReferenceRange;
  status: ReferenceStatus;
  referenceSource: 'DOCUMENT' | 'NONE';
  unitMismatch: boolean;
  reason?: string;
}
