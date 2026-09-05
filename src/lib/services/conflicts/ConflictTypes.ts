import { z } from 'zod';

export type ConflictType =
  | 'PATIENT_IDENTIFIER'
  | 'AGE_DOB'
  | 'SEX'
  | 'ALLERGY'
  | 'MEDICATION'
  | 'CONDITION'
  | 'REPORT_DATE'
  | 'DUPLICATE_TEST'
  | 'LAB_VALUE'
  | 'EXTRACTED_ENTITY';

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConflictResolutionStatus = 'UNREVIEWED' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export const ConflictTypeSchema = z.enum([
  'PATIENT_IDENTIFIER',
  'AGE_DOB',
  'SEX',
  'ALLERGY',
  'MEDICATION',
  'CONDITION',
  'REPORT_DATE',
  'DUPLICATE_TEST',
  'LAB_VALUE',
  'EXTRACTED_ENTITY',
]);

export const ConflictSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ConflictResolutionStatusSchema = z.enum([
  'UNREVIEWED',
  'REVIEWED',
  'RESOLVED',
  'DISMISSED',
]);

export interface ConflictSource {
  recordId: string;
  documentId: string | null;
  documentName?: string | null;
  pageNumber: number | null;
  sourceText: string | null;
  value: unknown;
  field: string;
  provenanceId: string;
  timestamp: string | null;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  unit?: string | null;
  referenceRange?: string | null;
  status?: string | null;
}

export const ConflictSourceSchema = z.object({
  recordId: z.string(),
  documentId: z.string().nullable(),
  documentName: z.string().optional().nullable(),
  pageNumber: z.number().int().positive().nullable(),
  sourceText: z.string().nullable(),
  value: z.unknown(),
  field: z.string(),
  provenanceId: z.string(),
  timestamp: z.string().nullable(),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable()
    .optional(),
  unit: z.string().optional().nullable(),
  referenceRange: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});

export interface Conflict {
  id: string;
  patientId: string;
  type: ConflictType;
  description: string;
  severity: ConflictSeverity;
  detectionConfidence: number; // 0.0 - 1.0
  sourceA: ConflictSource;
  sourceB: ConflictSource;
  detectedTimestamp: string;
  resolutionStatus: ConflictResolutionStatus;
  resolution?: ConflictResolution | null;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export const ConflictSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  type: ConflictTypeSchema,
  description: z.string().min(1),
  severity: ConflictSeveritySchema,
  detectionConfidence: z.number().min(0).max(1),
  sourceA: ConflictSourceSchema,
  sourceB: ConflictSourceSchema,
  detectedTimestamp: z.string(),
  resolutionStatus: ConflictResolutionStatusSchema,
  resolution: z.any().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export interface ConflictResolution {
  id?: string;
  conflictId: string;
  resolutionStatus: 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  reviewerId: string;
  timestamp: string;
  decision: 'ACCEPT_SOURCE_A' | 'ACCEPT_SOURCE_B' | 'KEEP_BOTH' | 'CORRECT_VALUE' | 'DISMISSED' | string;
  selectedRecordId: string | null;
  correctedValue: unknown | null;
  reason: string | null;
}

export const ConflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolutionStatus: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  reviewerId: z.string(),
  timestamp: z.string(),
  decision: z.string(),
  selectedRecordId: z.string().nullable(),
  correctedValue: z.unknown().nullable(),
  reason: z.string().nullable(),
});

export interface LabComparisonRule {
  testIdentifier: string;
  absoluteDifference?: number;
  relativeDifferencePercent?: number;
  unit?: string;
}

export interface ConflictReviewInput {
  reviewerId: string;
  notes?: string;
}

export interface ConflictResolveInput {
  reviewerId: string;
  decision: 'ACCEPT_SOURCE_A' | 'ACCEPT_SOURCE_B' | 'KEEP_BOTH' | 'CORRECT_VALUE';
  selectedRecordId?: string | null;
  correctedValue?: unknown | null;
  reason: string;
}

export interface ConflictDismissInput {
  reviewerId: string;
  reason: string;
}

export interface ConflictReopenInput {
  reviewerId: string;
  reason: string;
}
