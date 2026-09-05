import { z } from 'zod';

export const ProvenanceSourceEnum = z.enum([
  'USER_PROVIDED',
  'DOCUMENT_EXTRACTED',
  'AI_GENERATED',
  'USER_EDITED',
]);

export const VerificationStatusEnum = z.enum([
  'UNVERIFIED',
  'VERIFIED',
  'REJECTED',
  'EDITED',
]);

export const ReferenceInterpretationEnum = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL_LOW',
  'CRITICAL_HIGH',
  'REFERENCE_UNAVAILABLE',
]);

export const DocumentTypeEnum = z.enum([
  'LAB_REPORT',
  'DISCHARGE_SUMMARY',
  'PRESCRIPTION',
  'IMAGING_REPORT',
  'OTHER',
]);

export const ConflictTypeEnum = z.enum([
  'DEMOGRAPHIC_MISMATCH',
  'MEDICATION_INCONSISTENCY',
  'ALLERGY_DISCREPANCY',
  'LAB_VALUE_DIVERGENCE',
  'DATE_ANOMALY',
]);

// Patient Schemas
export const PatientCreateSchema = z.object({
  identifier: z.string().min(1, 'Patient Identifier / MRN is required'),
  fullName: z.string().min(1, 'Full Name is required'),
  dateOfBirth: z.string().optional().nullable(),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).default('UNKNOWN'),
  contactNumber: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const PatientUpdateSchema = PatientCreateSchema.partial();

// Lab Result Schemas
export const LabResultSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  documentId: z.string().optional().nullable(),
  testName: z.string().min(1, 'Test name is required'),
  testCategory: z.string().optional().nullable(),
  measuredValue: z.string().min(1, 'Measured value is required'),
  numericValue: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  referenceRangeText: z.string().optional().nullable(),
  refRangeLow: z.number().optional().nullable(),
  refRangeHigh: z.number().optional().nullable(),
  interpretation: ReferenceInterpretationEnum.default('REFERENCE_UNAVAILABLE'),
  testDate: z.string().optional().nullable(),
  provenanceSource: ProvenanceSourceEnum.default('DOCUMENT_EXTRACTED'),
  sourcePageNumber: z.number().optional().nullable(),
  sourceOriginalSnippet: z.string().optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().default(1.0),
  verificationStatus: VerificationStatusEnum.default('UNVERIFIED'),
  verifiedBy: z.string().optional().nullable(),
  verificationNotes: z.string().optional().nullable(),
});

// Medication Schemas
export const MedicationSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  documentId: z.string().optional().nullable(),
  drugName: z.string().min(1, 'Drug name is required'),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DISCONTINUED', 'HISTORICAL']).default('ACTIVE'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  prescribingDoctor: z.string().optional().nullable(),
  provenanceSource: ProvenanceSourceEnum.default('DOCUMENT_EXTRACTED'),
  sourcePageNumber: z.number().optional().nullable(),
  sourceOriginalSnippet: z.string().optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().default(1.0),
  verificationStatus: VerificationStatusEnum.default('UNVERIFIED'),
});

// Allergy Schemas
export const AllergySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  documentId: z.string().optional().nullable(),
  allergen: z.string().min(1, 'Allergen name is required'),
  reaction: z.string().optional().nullable(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING', 'UNKNOWN']).default('UNKNOWN'),
  provenanceSource: ProvenanceSourceEnum.default('DOCUMENT_EXTRACTED'),
  sourcePageNumber: z.number().optional().nullable(),
  sourceOriginalSnippet: z.string().optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().default(1.0),
  verificationStatus: VerificationStatusEnum.default('UNVERIFIED'),
});

// Condition Schemas
export const ConditionSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  documentId: z.string().optional().nullable(),
  conditionName: z.string().min(1, 'Condition name is required'),
  icd10Code: z.string().optional().nullable(),
  clinicalStatus: z.enum(['ACTIVE', 'RESOLVED', 'INACTIVE', 'RECURRENT']).default('ACTIVE'),
  diagnosedDate: z.string().optional().nullable(),
  provenanceSource: ProvenanceSourceEnum.default('DOCUMENT_EXTRACTED'),
  sourcePageNumber: z.number().optional().nullable(),
  sourceOriginalSnippet: z.string().optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().default(1.0),
  verificationStatus: VerificationStatusEnum.default('UNVERIFIED'),
});

// Observation Schemas
export const ClinicalObservationSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  documentId: z.string().optional().nullable(),
  category: z.string().default('CLINICIAN_NOTE'),
  content: z.string().min(1, 'Content is required'),
  observationDate: z.string().optional().nullable(),
  provenanceSource: ProvenanceSourceEnum.default('DOCUMENT_EXTRACTED'),
  sourcePageNumber: z.number().optional().nullable(),
  sourceOriginalSnippet: z.string().optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().default(1.0),
  verificationStatus: VerificationStatusEnum.default('UNVERIFIED'),
});

// AI Extraction Raw Schema (from Multimodal Document Parsing)
export const ExtractedEntityResultSchema = z.object({
  patientMetadata: z.object({
    extractedName: z.string().optional().nullable(),
    extractedIdentifier: z.string().optional().nullable(),
    extractedDob: z.string().optional().nullable(),
    extractedSex: z.string().optional().nullable(),
    reportDate: z.string().optional().nullable(),
    documentType: DocumentTypeEnum.default('LAB_REPORT'),
  }).optional(),
  labResults: z.array(
    z.object({
      testName: z.string(),
      testCategory: z.string().optional().nullable(),
      measuredValue: z.string(),
      unit: z.string().optional().nullable(),
      referenceRangeText: z.string().optional().nullable(),
      sourcePageNumber: z.number().optional().nullable(),
      sourceOriginalSnippet: z.string().optional().nullable(),
      confidenceScore: z.number().optional().default(0.95),
    })
  ).default([]),
  medications: z.array(
    z.object({
      drugName: z.string(),
      dosage: z.string().optional().nullable(),
      frequency: z.string().optional().nullable(),
      route: z.string().optional().nullable(),
      status: z.string().optional().default('ACTIVE'),
      sourcePageNumber: z.number().optional().nullable(),
      sourceOriginalSnippet: z.string().optional().nullable(),
      confidenceScore: z.number().optional().default(0.95),
    })
  ).default([]),
  allergies: z.array(
    z.object({
      allergen: z.string(),
      reaction: z.string().optional().nullable(),
      severity: z.string().optional().default('UNKNOWN'),
      sourcePageNumber: z.number().optional().nullable(),
      sourceOriginalSnippet: z.string().optional().nullable(),
      confidenceScore: z.number().optional().default(0.95),
    })
  ).default([]),
  conditions: z.array(
    z.object({
      conditionName: z.string(),
      icd10Code: z.string().optional().nullable(),
      clinicalStatus: z.string().optional().default('ACTIVE'),
      diagnosedDate: z.string().optional().nullable(),
      sourcePageNumber: z.number().optional().nullable(),
      sourceOriginalSnippet: z.string().optional().nullable(),
      confidenceScore: z.number().optional().default(0.95),
    })
  ).default([]),
  observations: z.array(
    z.object({
      category: z.string().optional().default('CLINICIAN_NOTE'),
      content: z.string(),
      observationDate: z.string().optional().nullable(),
      sourcePageNumber: z.number().optional().nullable(),
      sourceOriginalSnippet: z.string().optional().nullable(),
      confidenceScore: z.number().optional().default(0.95),
    })
  ).default([]),
});

// Human Verification Action Schema
export const VerificationActionSchema = z.object({
  patientId: z.string(),
  entityType: z.enum(['LAB_RESULT', 'MEDICATION', 'ALLERGY', 'CONDITION', 'CLINICAL_OBSERVATION']),
  entityId: z.string(),
  action: z.enum(['ACCEPT', 'EDIT', 'REJECT']),
  editedValues: z.record(z.string(), z.any()).optional(),
  reason: z.string().optional(),
});

// Conflict Resolution Schema
export const ConflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolutionStatus: z.enum(['RESOLVED', 'DISMISSED']),
  chosenRecordId: z.string().optional().nullable(),
  resolutionNotes: z.string().min(1, 'Resolution explanation is required for clinical audit'),
});
