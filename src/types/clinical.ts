// Core Clinical Domain Types & Enums for MedLens

export type ProvenanceSource = 
  | 'USER_PROVIDED'
  | 'DOCUMENT_EXTRACTED'
  | 'OCR_EXTRACTED'
  | 'AI_EXTRACTED'
  | 'AI_GENERATED'
  | 'HUMAN_VERIFIED'
  | 'USER_EDITED';

export type VerificationStatus = 
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EDITED';

export type ReferenceInterpretation = 
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'CRITICAL_LOW'
  | 'CRITICAL_HIGH'
  | 'REFERENCE_UNAVAILABLE';

export type ConflictType = 
  | 'DEMOGRAPHIC_MISMATCH'
  | 'MEDICATION_INCONSISTENCY'
  | 'ALLERGY_DISCREPANCY'
  | 'LAB_VALUE_DIVERGENCE'
  | 'DATE_ANOMALY'
  | 'DUPLICATE_DISCREPANCY';

export type ConflictResolutionStatus = 
  | 'DETECTED'
  | 'REVIEWED'
  | 'RESOLVED'
  | 'DISMISSED';

export type DocumentType = 
  | 'LAB_REPORT'
  | 'DISCHARGE_SUMMARY'
  | 'PRESCRIPTION'
  | 'IMAGING_REPORT'
  | 'OTHER';

export interface ProvenanceMetadata {
  source: ProvenanceSource;
  documentId?: string | null;
  documentName?: string | null;
  pageNumber?: number | null;
  originalSnippet?: string | null;
  confidenceScore?: number | null;
  timestamp?: string | Date;
}

export interface VerificationMetadata {
  status: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  notes?: string | null;
}

export interface PatientRecord {
  id: string;
  identifier: string;
  fullName: string;
  dateOfBirth?: string | Date | null;
  sex: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' | string;
  contactNumber?: string | null;
  bloodType?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Relations
  documents?: DocumentRecord[];
  labResults?: LabResultRecord[];
  medications?: MedicationRecord[];
  allergies?: AllergyRecord[];
  conditions?: ConditionRecord[];
  observations?: ClinicalObservationRecord[];
  summaries?: ClinicalSummaryRecord[];
  conflicts?: ConflictRecord[];
  auditLogs?: AuditLogRecord[];
}

export interface DocumentRecord {
  id: string;
  patientId: string;
  originalFileName: string;
  fileType: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  storagePath?: string | null;
  documentType: DocumentType | string;
  reportDate?: string | Date | null;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  rawExtractedText?: string | null;
  uploadedAt: string | Date;
  labResultsCount?: number;
  medicationsCount?: number;
}

export interface LabResultRecord {
  id: string;
  patientId: string;
  documentId?: string | null;
  document?: DocumentRecord | null;
  testName: string;
  testCategory?: string | null;
  measuredValue: string;
  numericValue?: number | null;
  unit?: string | null;
  referenceRangeText?: string | null;
  refRangeLow?: number | null;
  refRangeHigh?: number | null;
  interpretation: ReferenceInterpretation;
  testDate?: string | Date | null;
  
  // Provenance & Verification
  provenanceSource: ProvenanceSource;
  sourcePageNumber?: number | null;
  sourceOriginalSnippet?: string | null;
  confidenceScore?: number | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  verificationNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MedicationRecord {
  id: string;
  patientId: string;
  documentId?: string | null;
  document?: DocumentRecord | null;
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  status: 'ACTIVE' | 'DISCONTINUED' | 'HISTORICAL' | string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  prescribingDoctor?: string | null;
  
  provenanceSource: ProvenanceSource;
  sourcePageNumber?: number | null;
  sourceOriginalSnippet?: string | null;
  confidenceScore?: number | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  verificationNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AllergyRecord {
  id: string;
  patientId: string;
  documentId?: string | null;
  document?: DocumentRecord | null;
  allergen: string;
  reaction?: string | null;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING' | 'UNKNOWN' | string;
  
  provenanceSource: ProvenanceSource;
  sourcePageNumber?: number | null;
  sourceOriginalSnippet?: string | null;
  confidenceScore?: number | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  verificationNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ConditionRecord {
  id: string;
  patientId: string;
  documentId?: string | null;
  document?: DocumentRecord | null;
  conditionName: string;
  icd10Code?: string | null;
  clinicalStatus: 'ACTIVE' | 'RESOLVED' | 'INACTIVE' | 'RECURRENT' | string;
  diagnosedDate?: string | Date | null;
  
  provenanceSource: ProvenanceSource;
  sourcePageNumber?: number | null;
  sourceOriginalSnippet?: string | null;
  confidenceScore?: number | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  verificationNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ClinicalObservationRecord {
  id: string;
  patientId: string;
  documentId?: string | null;
  document?: DocumentRecord | null;
  category: 'PHYSICAL_EXAM' | 'SYMPTOM' | 'RADIOLOGY_NOTE' | 'CLINICIAN_NOTE' | 'HISTORY' | string;
  content: string;
  observationDate?: string | Date | null;
  
  provenanceSource: ProvenanceSource;
  sourcePageNumber?: number | null;
  sourceOriginalSnippet?: string | null;
  confidenceScore?: number | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  verificationNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ClinicalSummaryRecord {
  id: string;
  patientId: string;
  summaryText: string;
  keyFindingsJson?: string | null;
  notableChangesJson?: string | null;
  missingInformationJson?: string | null;
  guardrailValidation: string;
  generatedAt: string | Date;
}

export interface ConflictRecord {
  id: string;
  patientId: string;
  conflictType: ConflictType;
  entityType: 'PATIENT' | 'MEDICATION' | 'ALLERGY' | 'LAB_RESULT' | 'CONDITION' | string;
  description: string;
  conflictingRecordsJson: string; // JSON parsed into Array
  resolutionStatus: ConflictResolutionStatus;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  detectedAt: string | Date;
  resolvedAt?: string | Date | null;
}

export interface AuditLogRecord {
  id: string;
  patientId: string;
  entityType: string;
  entityId: string;
  action: 'CREATED' | 'AI_EXTRACTED' | 'VERIFIED' | 'EDITED' | 'REJECTED' | 'CONFLICT_RESOLVED' | string;
  previousValuesJson?: string | null;
  newValuesJson?: string | null;
  performedBy: string;
  reason?: string | null;
  timestamp: string | Date;
}
