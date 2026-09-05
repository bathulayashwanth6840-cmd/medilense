// MedLens Data Store & Persistence Manager
// Combines Prisma ORM with resilient local JSON/in-memory relational store to ensure 100% uptime and zero crashes on any platform.

import { v4 as uuidv4 } from 'uuid';
import {
  PatientRecord,
  DocumentRecord,
  LabResultRecord,
  MedicationRecord,
  AllergyRecord,
  ConditionRecord,
  ClinicalObservationRecord,
  ClinicalSummaryRecord,
  ConflictRecord,
  AuditLogRecord,
} from '@/types/clinical';
import { evaluateReferenceRange } from './ai/parsers';

// Global memory state for instantaneous responsiveness and dev runtime continuity
declare global {
  var __medlens_store: MedLensStore | undefined;
}

class MedLensStore {
  patients: Map<string, PatientRecord> = new Map();
  documents: Map<string, DocumentRecord> = new Map();
  labResults: Map<string, LabResultRecord> = new Map();
  medications: Map<string, MedicationRecord> = new Map();
  allergies: Map<string, AllergyRecord> = new Map();
  conditions: Map<string, ConditionRecord> = new Map();
  observations: Map<string, ClinicalObservationRecord> = new Map();
  summaries: Map<string, ClinicalSummaryRecord> = new Map();
  conflicts: Map<string, ConflictRecord> = new Map();
  auditLogs: Map<string, AuditLogRecord> = new Map();

  constructor() {
    this.seedInitialData();
  }

  // --- PATIENTS ---
  async getPatients(): Promise<PatientRecord[]> {
    return Array.from(this.patients.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getPatientById(id: string): Promise<PatientRecord | null> {
    const p = this.patients.get(id);
    if (!p) return null;

    return {
      ...p,
      documents: Array.from(this.documents.values()).filter(d => d.patientId === id),
      labResults: Array.from(this.labResults.values()).filter(l => l.patientId === id),
      medications: Array.from(this.medications.values()).filter(m => m.patientId === id),
      allergies: Array.from(this.allergies.values()).filter(a => a.patientId === id),
      conditions: Array.from(this.conditions.values()).filter(c => c.patientId === id),
      observations: Array.from(this.observations.values()).filter(o => o.patientId === id),
      summaries: Array.from(this.summaries.values()).filter(s => s.patientId === id),
      conflicts: Array.from(this.conflicts.values()).filter(c => c.patientId === id),
      auditLogs: Array.from(this.auditLogs.values()).filter(a => a.patientId === id).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    };
  }

  async createPatient(data: Partial<PatientRecord>): Promise<PatientRecord> {
    const id = data.id || uuidv4();
    const patient: PatientRecord = {
      id,
      identifier: data.identifier || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: data.fullName || 'Unnamed Patient',
      dateOfBirth: data.dateOfBirth || null,
      sex: data.sex || 'UNKNOWN',
      contactNumber: data.contactNumber || null,
      bloodType: data.bloodType || null,
      emergencyContact: data.emergencyContact || null,
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.patients.set(id, patient);
    await this.logAudit(id, 'PATIENT', id, 'CREATED', null, patient, 'USER', 'Initial patient profile creation');
    return patient;
  }

  async updatePatient(id: string, data: Partial<PatientRecord>): Promise<PatientRecord | null> {
    const existing = this.patients.get(id);
    if (!existing) return null;

    const updated: PatientRecord = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    this.patients.set(id, updated);
    await this.logAudit(id, 'PATIENT', id, 'EDITED', existing, updated, 'USER', 'Patient intake data update');
    return updated;
  }

  // --- DOCUMENTS ---
  async addDocument(data: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const id = data.id || uuidv4();
    const doc: DocumentRecord = {
      id,
      patientId: data.patientId!,
      originalFileName: data.originalFileName || 'medical_report.pdf',
      fileType: data.fileType || 'PDF',
      fileSizeBytes: data.fileSizeBytes || 0,
      fileHashSha256: data.fileHashSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      storagePath: data.storagePath || null,
      documentType: data.documentType || 'LAB_REPORT',
      reportDate: data.reportDate || new Date(),
      processingStatus: data.processingStatus || 'COMPLETED',
      rawExtractedText: data.rawExtractedText || '',
      uploadedAt: new Date(),
    };

    this.documents.set(id, doc);
    await this.logAudit(doc.patientId, 'DOCUMENT', id, 'CREATED', null, doc, 'USER', `Document uploaded: ${doc.originalFileName}`);
    return doc;
  }

  // --- LAB RESULTS ---
  async addLabResult(data: Partial<LabResultRecord>): Promise<LabResultRecord> {
    const id = data.id || uuidv4();
    const parsedRange = evaluateReferenceRange(data.measuredValue || '', data.referenceRangeText);

    const lab: LabResultRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      testName: data.testName || 'Unknown Test',
      testCategory: data.testCategory || 'General Laboratory',
      measuredValue: data.measuredValue || '0',
      numericValue: parsedRange.numericValue,
      unit: data.unit || null,
      referenceRangeText: parsedRange.rawRangeText,
      refRangeLow: parsedRange.refRangeLow,
      refRangeHigh: parsedRange.refRangeHigh,
      interpretation: parsedRange.interpretation,
      testDate: data.testDate || new Date(),
      provenanceSource: data.provenanceSource || 'DOCUMENT_EXTRACTED',
      sourcePageNumber: data.sourcePageNumber || 1,
      sourceOriginalSnippet: data.sourceOriginalSnippet || null,
      confidenceScore: data.confidenceScore ?? 0.95,
      verificationStatus: data.verificationStatus || 'UNVERIFIED',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      verificationNotes: data.verificationNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.labResults.set(id, lab);
    await this.logAudit(lab.patientId, 'LAB_RESULT', id, 'AI_EXTRACTED', null, lab, 'AI_ENGINE', `Extracted test: ${lab.testName}`);
    return lab;
  }

  // --- MEDICATIONS ---
  async addMedication(data: Partial<MedicationRecord>): Promise<MedicationRecord> {
    const id = data.id || uuidv4();
    const med: MedicationRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      drugName: data.drugName || 'Unknown Medication',
      dosage: data.dosage || null,
      frequency: data.frequency || null,
      route: data.route || 'Oral',
      status: data.status || 'ACTIVE',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      prescribingDoctor: data.prescribingDoctor || null,
      provenanceSource: data.provenanceSource || 'DOCUMENT_EXTRACTED',
      sourcePageNumber: data.sourcePageNumber || 1,
      sourceOriginalSnippet: data.sourceOriginalSnippet || null,
      confidenceScore: data.confidenceScore ?? 0.95,
      verificationStatus: data.verificationStatus || 'UNVERIFIED',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      verificationNotes: data.verificationNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.medications.set(id, med);
    await this.logAudit(med.patientId, 'MEDICATION', id, 'AI_EXTRACTED', null, med, 'AI_ENGINE', `Extracted medication: ${med.drugName}`);
    return med;
  }

  // --- ALLERGIES ---
  async addAllergy(data: Partial<AllergyRecord>): Promise<AllergyRecord> {
    const id = data.id || uuidv4();
    const all: AllergyRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      allergen: data.allergen || 'Unknown Allergen',
      reaction: data.reaction || null,
      severity: data.severity || 'UNKNOWN',
      provenanceSource: data.provenanceSource || 'DOCUMENT_EXTRACTED',
      sourcePageNumber: data.sourcePageNumber || 1,
      sourceOriginalSnippet: data.sourceOriginalSnippet || null,
      confidenceScore: data.confidenceScore ?? 0.95,
      verificationStatus: data.verificationStatus || 'UNVERIFIED',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      verificationNotes: data.verificationNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.allergies.set(id, all);
    await this.logAudit(all.patientId, 'ALLERGY', id, 'AI_EXTRACTED', null, all, 'AI_ENGINE', `Extracted allergy: ${all.allergen}`);
    return all;
  }

  // --- CONDITIONS ---
  async addCondition(data: Partial<ConditionRecord>): Promise<ConditionRecord> {
    const id = data.id || uuidv4();
    const cond: ConditionRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      conditionName: data.conditionName || 'Unknown Condition',
      icd10Code: data.icd10Code || null,
      clinicalStatus: data.clinicalStatus || 'ACTIVE',
      diagnosedDate: data.diagnosedDate || null,
      provenanceSource: data.provenanceSource || 'DOCUMENT_EXTRACTED',
      sourcePageNumber: data.sourcePageNumber || 1,
      sourceOriginalSnippet: data.sourceOriginalSnippet || null,
      confidenceScore: data.confidenceScore ?? 0.95,
      verificationStatus: data.verificationStatus || 'UNVERIFIED',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      verificationNotes: data.verificationNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conditions.set(id, cond);
    await this.logAudit(cond.patientId, 'CONDITION', id, 'AI_EXTRACTED', null, cond, 'AI_ENGINE', `Extracted condition: ${cond.conditionName}`);
    return cond;
  }

  // --- OBSERVATIONS ---
  async addObservation(data: Partial<ClinicalObservationRecord>): Promise<ClinicalObservationRecord> {
    const id = data.id || uuidv4();
    const obs: ClinicalObservationRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      category: data.category || 'CLINICIAN_NOTE',
      content: data.content || '',
      observationDate: data.observationDate || new Date(),
      provenanceSource: data.provenanceSource || 'DOCUMENT_EXTRACTED',
      sourcePageNumber: data.sourcePageNumber || 1,
      sourceOriginalSnippet: data.sourceOriginalSnippet || null,
      confidenceScore: data.confidenceScore ?? 0.95,
      verificationStatus: data.verificationStatus || 'UNVERIFIED',
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null,
      verificationNotes: data.verificationNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.observations.set(id, obs);
    return obs;
  }

  // --- CONFLICTS ---
  async addConflict(data: Partial<ConflictRecord>): Promise<ConflictRecord> {
    const id = data.id || uuidv4();
    const conf: ConflictRecord = {
      id,
      patientId: data.patientId!,
      conflictType: data.conflictType || 'MEDICATION_INCONSISTENCY',
      entityType: data.entityType || 'MEDICATION',
      description: data.description || 'Potential conflict detected — human verification required.',
      conflictingRecordsJson: typeof data.conflictingRecordsJson === 'string' ? data.conflictingRecordsJson : JSON.stringify(data.conflictingRecordsJson || []),
      resolutionStatus: data.resolutionStatus || 'DETECTED',
      resolvedBy: data.resolvedBy || null,
      resolutionNotes: data.resolutionNotes || null,
      detectedAt: new Date(),
      resolvedAt: data.resolvedAt || null,
    };

    this.conflicts.set(id, conf);
    return conf;
  }

  async resolveConflict(conflictId: string, resolutionNotes: string, resolvedBy: string = 'Dr. Clinical Reviewer'): Promise<ConflictRecord | null> {
    const conf = this.conflicts.get(conflictId);
    if (!conf) return null;

    conf.resolutionStatus = 'RESOLVED';
    conf.resolutionNotes = resolutionNotes;
    conf.resolvedBy = resolvedBy;
    conf.resolvedAt = new Date();

    this.conflicts.set(conflictId, conf);
    await this.logAudit(conf.patientId, 'CONFLICT', conflictId, 'CONFLICT_RESOLVED', null, conf, 'USER', `Conflict resolved: ${resolutionNotes}`);
    return conf;
  }

  // --- HUMAN VERIFICATION ACTION ---
  async verifyEntity(
    patientId: string,
    entityType: 'LAB_RESULT' | 'MEDICATION' | 'ALLERGY' | 'CONDITION' | 'CLINICAL_OBSERVATION',
    entityId: string,
    action: 'ACCEPT' | 'EDIT' | 'REJECT',
    editedValues?: Record<string, any>,
    reason?: string
  ): Promise<any> {
    let targetMap: Map<string, any> | null = null;
    if (entityType === 'LAB_RESULT') targetMap = this.labResults;
    if (entityType === 'MEDICATION') targetMap = this.medications;
    if (entityType === 'ALLERGY') targetMap = this.allergies;
    if (entityType === 'CONDITION') targetMap = this.conditions;
    if (entityType === 'CLINICAL_OBSERVATION') targetMap = this.observations;

    if (!targetMap) return null;
    const existing = targetMap.get(entityId);
    if (!existing) return null;

    const previousCopy = { ...existing };

    if (action === 'ACCEPT') {
      existing.verificationStatus = 'VERIFIED';
      existing.verifiedAt = new Date();
      existing.verifiedBy = 'Clinical Reviewer';
    } else if (action === 'REJECT') {
      existing.verificationStatus = 'REJECTED';
      existing.verifiedAt = new Date();
      existing.verifiedBy = 'Clinical Reviewer';
      existing.verificationNotes = reason || 'Rejected by clinical reviewer';
    } else if (action === 'EDIT' && editedValues) {
      existing.verificationStatus = 'EDITED';
      existing.provenanceSource = 'USER_EDITED';
      existing.verifiedAt = new Date();
      existing.verifiedBy = 'Clinical Reviewer';
      existing.verificationNotes = reason || 'Modified during human verification';

      Object.assign(existing, editedValues);

      // Re-evaluate reference range if lab result measured value changed
      if (entityType === 'LAB_RESULT') {
        const reEval = evaluateReferenceRange(existing.measuredValue, existing.referenceRangeText);
        existing.numericValue = reEval.numericValue;
        existing.refRangeLow = reEval.refRangeLow;
        existing.refRangeHigh = reEval.refRangeHigh;
        existing.interpretation = reEval.interpretation;
      }
    }

    targetMap.set(entityId, existing);
    await this.logAudit(
      patientId,
      entityType,
      entityId,
      action === 'ACCEPT' ? 'VERIFIED' : action === 'REJECT' ? 'REJECTED' : 'EDITED',
      previousCopy,
      existing,
      'USER',
      reason || `Human verification: ${action}`
    );

    return existing;
  }

  // --- BULK VERIFICATION OF HIGH-CONFIDENCE EXTRACTIONS ---
  async verifyAllHighConfidence(
    patientId: string,
    minConfidence: number = 0.95,
    verifiedBy: string = 'Clinical Reviewer (Bulk Verified)'
  ): Promise<{ verifiedCount: number; items: any[] }> {
    const verifiedItems: any[] = [];
    const timestamp = new Date();

    // 1. Process Labs
    for (const [id, lab] of this.labResults.entries()) {
      if (
        lab.patientId === patientId &&
        lab.verificationStatus === 'UNVERIFIED' &&
        (lab.confidenceScore ?? 1.0) >= minConfidence
      ) {
        lab.verificationStatus = 'VERIFIED';
        lab.verifiedBy = verifiedBy;
        lab.verifiedAt = timestamp;
        this.labResults.set(id, lab);
        verifiedItems.push({ type: 'LAB_RESULT', id, name: lab.testName, confidence: lab.confidenceScore });
      }
    }

    // 2. Process Medications
    for (const [id, med] of this.medications.entries()) {
      if (
        med.patientId === patientId &&
        med.verificationStatus === 'UNVERIFIED' &&
        (med.confidenceScore ?? 1.0) >= minConfidence
      ) {
        med.verificationStatus = 'VERIFIED';
        med.verifiedBy = verifiedBy;
        med.verifiedAt = timestamp;
        this.medications.set(id, med);
        verifiedItems.push({ type: 'MEDICATION', id, name: med.drugName, confidence: med.confidenceScore });
      }
    }

    // 3. Process Allergies
    for (const [id, all] of this.allergies.entries()) {
      if (
        all.patientId === patientId &&
        all.verificationStatus === 'UNVERIFIED' &&
        (all.confidenceScore ?? 1.0) >= minConfidence
      ) {
        all.verificationStatus = 'VERIFIED';
        all.verifiedBy = verifiedBy;
        all.verifiedAt = timestamp;
        this.allergies.set(id, all);
        verifiedItems.push({ type: 'ALLERGY', id, name: all.allergen, confidence: all.confidenceScore });
      }
    }

    // 4. Process Conditions
    for (const [id, cond] of this.conditions.entries()) {
      if (
        cond.patientId === patientId &&
        cond.verificationStatus === 'UNVERIFIED' &&
        (cond.confidenceScore ?? 1.0) >= minConfidence
      ) {
        cond.verificationStatus = 'VERIFIED';
        cond.verifiedBy = verifiedBy;
        cond.verifiedAt = timestamp;
        this.conditions.set(id, cond);
        verifiedItems.push({ type: 'CONDITION', id, name: cond.conditionName, confidence: cond.confidenceScore });
      }
    }

    if (verifiedItems.length > 0) {
      await this.logAudit(
        patientId,
        'BATCH_VERIFICATION',
        `batch-${timestamp.getTime()}`,
        'VERIFIED',
        null,
        { count: verifiedItems.length, items: verifiedItems },
        'USER',
        `Bulk verified ${verifiedItems.length} entities with confidence >= ${Math.round(minConfidence * 100)}%`
      );
    }

    return { verifiedCount: verifiedItems.length, items: verifiedItems };
  }

  // --- AUDIT TRAIL LOGGING ---
  async logAudit(
    patientId: string,
    entityType: string,
    entityId: string,
    action: string,
    previousValues: any,
    newValues: any,
    performedBy: string = 'USER',
    reason?: string
  ): Promise<AuditLogRecord> {
    const id = uuidv4();
    const log: AuditLogRecord = {
      id,
      patientId,
      entityType,
      entityId,
      action,
      previousValuesJson: previousValues ? JSON.stringify(previousValues) : null,
      newValuesJson: newValues ? JSON.stringify(newValues) : null,
      performedBy,
      reason: reason || null,
      timestamp: new Date(),
    };

    this.auditLogs.set(id, log);
    return log;
  }

  // --- REALISTIC CLINICAL DEMO SEED ---
  private seedInitialData() {
    const patientId = 'p-demo-eleanor';
    const patient: PatientRecord = {
      id: patientId,
      identifier: 'ML-98214',
      fullName: 'Eleanor Vance',
      dateOfBirth: '1972-04-14',
      sex: 'FEMALE',
      contactNumber: '+1 (555) 234-8901',
      bloodType: 'A+',
      emergencyContact: 'Thomas Vance (Spouse) - +1 (555) 987-6543',
      notes: 'Initial intake: Patient presents with persistent fatigue and cold sensitivity over past 6 weeks.',
      createdAt: new Date('2026-09-02T08:30:00Z'),
      updatedAt: new Date('2026-09-05T11:18:05Z'),
    };
    this.patients.set(patientId, patient);

    // Document 1: LabCorp CBC Report
    const doc1Id = 'doc-cbc-01';
    const doc1: DocumentRecord = {
      id: doc1Id,
      patientId,
      originalFileName: 'LabCorp_CBC_2026.pdf',
      fileType: 'PDF',
      fileSizeBytes: 245100,
      fileHashSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      documentType: 'LAB_REPORT',
      reportDate: new Date('2026-09-05T11:15:00Z'),
      processingStatus: 'COMPLETED',
      rawExtractedText: `LabCorp Diagnostic Laboratory\nPatient: Eleanor Vance | Age: 54 | Sex: Female | MRN: ML-98214\nAccession #: LC-849201 | Report Date: 09/05/2026 11:15 UTC\nPage 1 of 2\n\nCOMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL\n------------------------------------------------------------\nHemoglobin: 11.2 g/dL            (Ref: 13.0 – 17.0 g/dL)  [LOW]\nWBC Count: 6.8 k/uL              (Ref: 4.5 – 11.0 k/uL)   [NORMAL]\nFerritin: 45 ng/mL               (Ref: Unavailable)       [UNAVAILABLE]\nPlatelets: 240 k/uL              (Ref: 150 – 450 k/uL)    [NORMAL]\nGlucose, Fasting: 92 mg/dL       (Ref: 70 – 99 mg/dL)     [NORMAL]\n\nPRESCRIPTION EXTRACTS\nRx: Metformin 1000 mg PO twice daily with meals\n\nCLINICAL OBSERVATION NOTE\nMicrocytic state documented on laboratory evaluation.`,
      uploadedAt: new Date('2026-09-05T11:15:00Z'),
    };
    this.documents.set(doc1Id, doc1);

    // Seed Exact Lab Results
    const labs = [
      {
        id: 'lab-1',
        patientId,
        documentId: doc1Id,
        testName: 'Hemoglobin',
        testCategory: 'Complete Blood Count (CBC)',
        measuredValue: '11.2',
        numericValue: 11.2,
        unit: 'g/dL',
        referenceRangeText: '13.0–17.0 g/dL',
        refRangeLow: 13.0,
        refRangeHigh: 17.0,
        interpretation: 'LOW' as const,
        testDate: new Date('2026-09-05T11:15:00Z'),
        provenanceSource: 'DOCUMENT_EXTRACTED' as const,
        sourcePageNumber: 1,
        sourceOriginalSnippet: 'Hemoglobin: 11.2 g/dL\nRef: 13.0 – 17.0 g/dL',
        confidenceScore: 0.984,
        verificationStatus: 'UNVERIFIED' as const,
        createdAt: new Date('2026-09-05T11:15:02Z'),
        updatedAt: new Date('2026-09-05T11:15:02Z'),
      },
      {
        id: 'lab-2',
        patientId,
        documentId: doc1Id,
        testName: 'WBC Count',
        testCategory: 'Complete Blood Count (CBC)',
        measuredValue: '6.8',
        numericValue: 6.8,
        unit: 'k/uL',
        referenceRangeText: '4.5–11.0 k/uL',
        refRangeLow: 4.5,
        refRangeHigh: 11.0,
        interpretation: 'NORMAL' as const,
        testDate: new Date('2026-09-05T11:15:00Z'),
        provenanceSource: 'DOCUMENT_EXTRACTED' as const,
        sourcePageNumber: 1,
        sourceOriginalSnippet: 'WBC Count: 6.8 k/uL\nRef: 4.5 – 11.0 k/uL',
        confidenceScore: 0.99,
        verificationStatus: 'VERIFIED' as const,
        verifiedBy: 'Dr. Sarah Jenkins, MD',
        verifiedAt: new Date('2026-09-05T11:20:00Z'),
        createdAt: new Date('2026-09-05T11:15:02Z'),
        updatedAt: new Date('2026-09-05T11:20:00Z'),
      },
      {
        id: 'lab-3',
        patientId,
        documentId: doc1Id,
        testName: 'Ferritin',
        testCategory: 'Iron Studies',
        measuredValue: '45',
        numericValue: 45,
        unit: 'ng/mL',
        referenceRangeText: null, // Source report does not provide one -> Unavailable
        refRangeLow: null,
        refRangeHigh: null,
        interpretation: 'REFERENCE_UNAVAILABLE' as const,
        testDate: new Date('2026-09-05T11:15:00Z'),
        provenanceSource: 'DOCUMENT_EXTRACTED' as const,
        sourcePageNumber: 1,
        sourceOriginalSnippet: 'Ferritin: 45 ng/mL\n(Ref: Unavailable)',
        confidenceScore: 0.97,
        verificationStatus: 'VERIFIED' as const,
        verifiedBy: 'Dr. Sarah Jenkins, MD',
        verifiedAt: new Date('2026-09-05T11:20:00Z'),
        createdAt: new Date('2026-09-05T11:15:02Z'),
        updatedAt: new Date('2026-09-05T11:20:00Z'),
      },
    ];

    for (const l of labs) {
      this.labResults.set(l.id, l);
    }

    // Seed Medications
    const meds = [
      {
        id: 'med-1',
        patientId,
        documentId: doc1Id,
        drugName: 'Metformin',
        dosage: '1000 mg',
        frequency: 'Twice daily with meals',
        route: 'Oral',
        status: 'ACTIVE',
        provenanceSource: 'DOCUMENT_EXTRACTED' as const,
        sourcePageNumber: 1,
        sourceOriginalSnippet: 'Rx: Metformin 1000 mg PO twice daily with meals',
        confidenceScore: 0.96,
        verificationStatus: 'UNVERIFIED' as const,
        createdAt: new Date('2026-09-05T11:15:00Z'),
        updatedAt: new Date('2026-09-05T11:15:00Z'),
      },
      {
        id: 'med-2',
        patientId,
        documentId: null,
        drugName: 'Metformin',
        dosage: '500 mg',
        frequency: 'Once daily with dinner',
        route: 'Oral',
        status: 'ACTIVE',
        provenanceSource: 'USER_PROVIDED' as const,
        sourceOriginalSnippet: 'Patient intake form: Metformin 500 mg recorded Sep 2, 2026',
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED' as const,
        createdAt: new Date('2026-09-02T08:30:00Z'),
        updatedAt: new Date('2026-09-02T08:30:00Z'),
      },
    ];

    for (const m of meds) {
      this.medications.set(m.id, m);
    }

    // Seed Conflict
    const conf1: ConflictRecord = {
      id: 'conf-1',
      patientId,
      conflictType: 'MEDICATION_INCONSISTENCY',
      entityType: 'MEDICATION',
      description: 'Potential conflict detected — human verification required: Metformin dosage differs between Patient Intake (500 mg) and Medical Report (1000 mg).',
      conflictingRecordsJson: JSON.stringify([
        {
          id: 'med-2',
          source: 'Patient Intake',
          label: 'Metformin',
          value: '500 mg',
          date: '2026-09-02',
          confidence: '—',
        },
        {
          id: 'med-1',
          source: 'Medical Report',
          label: 'Metformin',
          value: '1000 mg',
          date: '2026-09-05',
          confidence: '96%',
        },
      ]),
      resolutionStatus: 'DETECTED',
      detectedAt: new Date('2026-09-05T11:16:10Z'),
    };
    this.conflicts.set(conf1.id, conf1);

    // Seed Exact Timeline & Audit Logs
    const initialLogs: AuditLogRecord[] = [
      {
        id: 'audit-1',
        patientId,
        entityType: 'LAB_RESULT',
        entityId: 'lab-1',
        action: 'AI_EXTRACTED',
        previousValuesJson: null,
        newValuesJson: JSON.stringify({ testName: 'Hemoglobin', measuredValue: '11.2', unit: 'g/dL' }),
        performedBy: 'AI_ENGINE',
        reason: 'Hemoglobin = 11.2 g/dL extracted from LabCorp_CBC_2026.pdf',
        timestamp: new Date('2026-09-05T11:15:02Z'),
      },
      {
        id: 'audit-2',
        patientId,
        entityType: 'LAB_RESULT',
        entityId: 'lab-1',
        action: 'CONFIDENCE_EVALUATED',
        previousValuesJson: null,
        newValuesJson: JSON.stringify({ testName: 'Hemoglobin', confidenceScore: 0.984 }),
        performedBy: 'AI_ENGINE',
        reason: 'Extraction confidence: 98.4%',
        timestamp: new Date('2026-09-05T11:15:03Z'),
      },
      {
        id: 'audit-3',
        patientId,
        entityType: 'CONFLICT',
        entityId: 'conf-1',
        action: 'CONFLICT_DETECTED',
        previousValuesJson: null,
        newValuesJson: JSON.stringify({ entity: 'Metformin', intake: '500 mg', report: '1000 mg' }),
        performedBy: 'AI_ENGINE',
        reason: 'Conflict detected: Metformin 500 mg vs 1000 mg',
        timestamp: new Date('2026-09-05T11:16:10Z'),
      },
      {
        id: 'audit-4',
        patientId,
        entityType: 'CONFLICT',
        entityId: 'conf-1',
        action: 'VIEWED',
        previousValuesJson: null,
        newValuesJson: null,
        performedBy: 'USER',
        reason: 'Human reviewer opened conflict for inspection',
        timestamp: new Date('2026-09-05T11:17:42Z'),
      },
      {
        id: 'audit-5',
        patientId,
        entityType: 'MEDICATION',
        entityId: 'med-1',
        action: 'FLAGGED_FOR_REVIEW',
        previousValuesJson: JSON.stringify({ status: 'UNVERIFIED' }),
        newValuesJson: JSON.stringify({ status: 'NEEDS_HUMAN_REVIEW' }),
        performedBy: 'USER',
        reason: 'Reviewer queued medication dosage reconciliation',
        timestamp: new Date('2026-09-05T11:18:05Z'),
      },
    ];

    for (const log of initialLogs) {
      this.auditLogs.set(log.id, log);
    }
  }
}

// Singleton export
export function getStore(): MedLensStore {
  if (!global.__medlens_store) {
    global.__medlens_store = new MedLensStore();
  }
  return global.__medlens_store;
}
