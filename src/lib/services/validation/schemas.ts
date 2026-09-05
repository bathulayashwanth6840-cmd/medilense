import { z } from 'zod';

/**
 * 1. Provenance Schema
 * Required for every extracted entity and clinical field.
 */
export const ProvenanceSchema = z.object({
  sourceType: z.enum([
    'DOCUMENT_EXTRACTED',
    'OCR_EXTRACTED',
    'AI_EXTRACTED',
    'HUMAN_VERIFIED',
    'USER_PROVIDED',
  ]),
  sourceDocumentId: z.string(),
  pageNumber: z.number().int().positive(),
  sourceText: z.string(),
  confidence: z.number().min(0).max(1),
  extractionTimestamp: z.string(),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable()
    .optional(),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * 2. Patient Identifiers Schema
 */
export const PatientIdentifiersSchema = z.object({
  fullName: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).nullable().optional(),
  mrn: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  patientId: z.string().nullable().optional(),
  sourceText: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  provenance: ProvenanceSchema.optional(),
});

export type PatientIdentifiers = z.infer<typeof PatientIdentifiersSchema>;

/**
 * 3. Laboratory Result Schema
 */
export const LaboratoryResultSchema = z.object({
  testName: z.string().min(1, 'Test name is required'),
  value: z.string().min(1, 'Value is required'),
  numericValue: z.number().nullable(),
  textualValue: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  sourceReferenceRange: z.string().nullable().optional(),
  referenceRange: z.string().nullable().optional(),
  referenceLow: z.number().nullable().optional(),
  referenceHigh: z.number().nullable().optional(),
  reportDate: z.string().nullable().optional(),
  observation: z.string().nullable().optional(),
  status: z.enum(['LOW', 'NORMAL', 'HIGH', 'REFERENCE_UNAVAILABLE', 'UNDETERMINED']).default('REFERENCE_UNAVAILABLE'),
  referenceSource: z.enum(['DOCUMENT', 'NONE']).default('NONE'),
  sourceText: z.string().min(1, 'Source text evidence is required'),
  pageNumber: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.95),
  provenance: ProvenanceSchema.optional(),
});

export type LaboratoryResult = z.infer<typeof LaboratoryResultSchema>;

/**
 * 4. Medication Schema
 */
export const MedicationSchema = z.object({
  drugName: z.string().min(1, 'Drug name is required'),
  dose: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  route: z.string().nullable().optional().default('Oral'),
  status: z.enum(['ACTIVE', 'DISCONTINUED', 'HISTORICAL', 'SUSPENDED']).default('ACTIVE'),
  sourceText: z.string().min(1, 'Source text is required'),
  pageNumber: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.95),
  provenance: ProvenanceSchema.optional(),
});

export type Medication = z.infer<typeof MedicationSchema>;

/**
 * 5. Allergy Schema
 */
export const AllergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required'),
  reaction: z.string().nullable().optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING', 'UNKNOWN']).default('UNKNOWN'),
  sourceText: z.string().min(1, 'Source text is required'),
  pageNumber: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.95),
  provenance: ProvenanceSchema.optional(),
});

export type Allergy = z.infer<typeof AllergySchema>;

/**
 * 6. Condition Schema
 */
export const ConditionSchema = z.object({
  condition: z.string().min(1, 'Condition name is required'),
  clinicalStatus: z.enum(['ACTIVE', 'RESOLVED', 'INACTIVE', 'RECURRENT', 'HISTORICAL']).default('ACTIVE'),
  diagnosedDate: z.string().nullable().optional(),
  sourceText: z.string().min(1, 'Source text is required'),
  pageNumber: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.95),
  provenance: ProvenanceSchema.optional(),
});

export type Condition = z.infer<typeof ConditionSchema>;

/**
 * 7. Symptom Schema
 */
export const SymptomSchema = z.object({
  symptom: z.string().min(1, 'Symptom is required'),
  description: z.string().nullable().optional(),
  onset: z.string().nullable().optional(),
  sourceText: z.string().min(1, 'Source text is required'),
  pageNumber: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.95),
  provenance: ProvenanceSchema.optional(),
});

export type Symptom = z.infer<typeof SymptomSchema>;

/**
 * 8. Observation Schema
 */
export const ObservationSchema = z.object({
  category: z.string().default('CLINICIAN_NOTE'),
  content: z.string().min(1, 'Observation content is required'),
  sourceText: z.string().min(1, 'Source text is required'),
  pageNumber: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.95),
  provenance: ProvenanceSchema.optional(),
});

export type Observation = z.infer<typeof ObservationSchema>;

/**
 * 9. Report Metadata Schema
 */
export const ReportMetadataSchema = z.object({
  documentType: z.enum([
    'LAB_REPORT',
    'DISCHARGE_SUMMARY',
    'PRESCRIPTION',
    'IMAGING_REPORT',
    'CLINICIAN_NOTE',
    'PATIENT_INTAKE_FORM',
    'OTHER',
  ]).default('LAB_REPORT'),
  reportDate: z.string().nullable().optional(),
  facilityName: z.string().nullable().optional(),
  orderingPhysician: z.string().nullable().optional(),
  sourceText: z.string().optional(),
});

export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;

/**
 * 10. Complete Clinical Extraction Schema (Strict LLM output contract)
 */
export const ClinicalExtractionSchema = z.object({
  patient: PatientIdentifiersSchema.optional(),
  laboratoryResults: z.array(LaboratoryResultSchema).default([]),
  symptoms: z.array(SymptomSchema).default([]),
  conditions: z.array(ConditionSchema).default([]),
  allergies: z.array(AllergySchema).default([]),
  medications: z.array(MedicationSchema).default([]),
  observations: z.array(ObservationSchema).default([]),
  reportMetadata: ReportMetadataSchema.optional(),
});

export type ClinicalExtraction = z.infer<typeof ClinicalExtractionSchema>;
