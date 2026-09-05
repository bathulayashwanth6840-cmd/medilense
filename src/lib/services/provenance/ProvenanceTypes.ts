import { z } from 'zod';

/**
 * Supported First-Class Provenance Types
 */
export type ProvenanceType =
  | 'USER_PROVIDED'
  | 'DOCUMENT_EXTRACTED'
  | 'AI_GENERATED'
  | 'USER_EDITED'
  | 'HUMAN_VERIFIED';

/**
 * Bounding Box Schema
 */
export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/**
 * 1. Document-Extracted Provenance Schema
 */
export const DocumentProvenanceSchema = z.object({
  provenanceType: z.literal('DOCUMENT_EXTRACTED'),
  documentId: z.string().min(1, 'Document ID is required'),
  documentName: z.string().optional(),
  pageNumber: z.number().int().positive('Page number must be positive'),
  sourceText: z.string().min(1, 'Source text evidence is required'),
  extractionTimestamp: z.string(),
  confidence: z.number().min(0).max(1),
  extractionMethod: z.enum(['NATIVE_PDF', 'OCR', 'HYBRID']),
  boundingBox: BoundingBoxSchema.nullable().optional(),
  blockId: z.string().optional(),
  lineId: z.string().optional(),
  paragraphId: z.string().optional(),
});

export type DocumentProvenance = z.infer<typeof DocumentProvenanceSchema>;

/**
 * 2. User-Provided Provenance Schema
 */
export const UserProvenanceSchema = z.object({
  provenanceType: z.literal('USER_PROVIDED'),
  userId: z.string().min(1, 'User ID is required'),
  timestamp: z.string(),
  field: z.string().min(1, 'Field name is required'),
  source: z.literal('USER').default('USER'),
  notes: z.string().optional(),
});

export type UserProvenance = z.infer<typeof UserProvenanceSchema>;

/**
 * 3. AI-Generated Provenance Schema
 */
export const AIProvenanceSchema = z.object({
  provenanceType: z.literal('AI_GENERATED'),
  model: z.string().min(1, 'Model name is required'),
  provider: z.string().min(1, 'Provider is required'),
  generationTimestamp: z.string(),
  inputRecordIds: z.array(z.string()).min(1, 'At least one input record ID is required'),
  generatedStatus: z.enum(['GENERATED', 'FAILED', 'REGENERATED']).default('GENERATED'),
  disclaimer: z
    .string()
    .default('AI-generated summary. Verify against source records.'),
});

export type AIProvenance = z.infer<typeof AIProvenanceSchema>;

/**
 * 4. User Edit Provenance Schema
 */
export const UserEditProvenanceSchema = z.object({
  provenanceType: z.literal('USER_EDITED'),
  previousValue: z.any(),
  newValue: z.any(),
  userId: z.string().min(1, 'User ID is required'),
  action: z.string().default('EDIT'),
  timestamp: z.string(),
  reason: z.string().nullable().optional(),
  field: z.string().optional(),
});

export type UserEditProvenance = z.infer<typeof UserEditProvenanceSchema>;

/**
 * 5. Human Verification Provenance Schema
 */
export const HumanVerificationProvenanceSchema = z.object({
  provenanceType: z.literal('HUMAN_VERIFIED'),
  userId: z.string().min(1, 'User ID is required'),
  timestamp: z.string(),
  action: z.literal('VERIFY').default('VERIFY'),
  verifiedRecordId: z.string().min(1, 'Verified record ID is required'),
  notes: z.string().optional(),
});

export type HumanVerificationProvenance = z.infer<typeof HumanVerificationProvenanceSchema>;

/**
 * Universal Provenance Schema
 */
export const UniversalProvenanceSchema = z.discriminatedUnion('provenanceType', [
  DocumentProvenanceSchema,
  UserProvenanceSchema,
  AIProvenanceSchema,
  UserEditProvenanceSchema,
  HumanVerificationProvenanceSchema,
]);

/**
 * Full Immutable Provenance Record (Database Entity)
 */
export interface ProvenanceRecord {
  id: string;
  provenanceId: string;
  entityId: string;
  entityType: string;
  provenanceType: ProvenanceType;
  version: number;
  
  // Document Extracted fields
  documentId?: string | null;
  documentName?: string | null;
  pageNumber?: number | null;
  sourceText?: string | null;
  confidence?: number | null;
  extractionMethod?: 'NATIVE_PDF' | 'OCR' | 'HYBRID' | null;
  boundingBox?: BoundingBox | null;
  blockId?: string | null;
  lineId?: string | null;
  paragraphId?: string | null;

  // User Provided fields
  userId?: string | null;
  field?: string | null;
  source?: string | null;

  // AI Generated fields
  model?: string | null;
  provider?: string | null;
  inputRecordIds?: string[] | null;
  generatedStatus?: 'GENERATED' | 'FAILED' | 'REGENERATED' | null;
  disclaimer?: string | null;

  // User Edit fields
  previousValue?: any;
  newValue?: any;
  action?: string | null;
  reason?: string | null;

  // Verification fields
  verifiedRecordId?: string | null;

  // Metadata
  timestamp: string;
  createdAt: string;
}

/**
 * Inputs for Creating Provenance Records
 */
export interface DocumentProvenanceInput {
  entityId: string;
  entityType: string;
  documentId: string;
  documentName?: string;
  pageNumber: number;
  sourceText: string;
  confidence: number;
  extractionMethod: 'NATIVE_PDF' | 'OCR' | 'HYBRID';
  boundingBox?: BoundingBox | null;
  blockId?: string;
  lineId?: string;
  paragraphId?: string;
  timestamp?: string;
}

export interface UserProvenanceInput {
  entityId: string;
  entityType: string;
  userId: string;
  field: string;
  notes?: string;
  timestamp?: string;
}

export interface AIProvenanceInput {
  entityId: string;
  entityType: string;
  model: string;
  provider: string;
  inputRecordIds: string[];
  generatedStatus?: 'GENERATED' | 'FAILED' | 'REGENERATED';
  disclaimer?: string;
  timestamp?: string;
}

export interface UserEditProvenanceInput {
  entityId: string;
  entityType: string;
  previousValue: any;
  newValue: any;
  userId: string;
  action?: string;
  reason?: string | null;
  field?: string;
  timestamp?: string;
}

export interface VerificationProvenanceInput {
  entityId: string;
  entityType: string;
  userId: string;
  verifiedRecordId: string;
  action?: 'VERIFY';
  notes?: string;
  timestamp?: string;
}
