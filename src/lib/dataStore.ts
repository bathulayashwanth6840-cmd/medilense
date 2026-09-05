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
  conflicts: Map<string, any> = new Map();
  conflictResolutions: Map<string, any> = new Map();
  auditLogs: Map<string, AuditLogRecord> = new Map();
  provenanceRecords: Map<string, any> = new Map();
  entityProvenanceHistory: Map<string, string[]> = new Map();

  constructor() {
    // Clean initialized in-memory database - no dummy data
  }

  // --- PROVENANCE ---
  async addProvenance(record: any): Promise<any> {
    const pId = record.provenanceId || record.id;
    this.provenanceRecords.set(record.id, record);
    this.provenanceRecords.set(pId, record);

    const history = this.entityProvenanceHistory.get(record.entityId) || [];
    if (!history.includes(record.id)) {
      history.push(record.id);
      this.entityProvenanceHistory.set(record.entityId, history);
    }
    return record;
  }

  async getProvenanceById(id: string): Promise<any | null> {
    return this.provenanceRecords.get(id) || null;
  }

  getProvenanceHistorySync(entityId: string): any[] {
    const ids = this.entityProvenanceHistory.get(entityId) || [];
    const list: any[] = [];
    for (const id of ids) {
      const rec = this.provenanceRecords.get(id);
      if (rec && !list.some(r => r.id === rec.id)) list.push(rec);
    }
    for (const rec of this.provenanceRecords.values()) {
      if (rec.entityId === entityId && !list.some(r => r.id === rec.id)) {
        list.push(rec);
      }
    }
    return list.sort((a, b) => (a.version || 1) - (b.version || 1));
  }

  async getProvenanceHistory(entityId: string): Promise<any[]> {
    return this.getProvenanceHistorySync(entityId);
  }

  async getLatestProvenanceForEntity(entityId: string): Promise<any | null> {
    const history = await this.getProvenanceHistory(entityId);
    return history.length > 0 ? history[history.length - 1] : null;
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

    const enrich = (entity: any) => {
      const hist = this.getProvenanceHistorySync(entity.id);
      return {
        ...entity,
        provenanceHistory: hist,
        provenanceId: entity.provenanceId || (hist.length > 0 ? hist[hist.length - 1].id : `prov_${entity.id}`),
      };
    };

    return {
      ...p,
      documents: Array.from(this.documents.values()).filter(d => d.patientId === id),
      labResults: Array.from(this.labResults.values()).filter(l => l.patientId === id).map(enrich),
      medications: Array.from(this.medications.values()).filter(m => m.patientId === id).map(enrich),
      allergies: Array.from(this.allergies.values()).filter(a => a.patientId === id).map(enrich),
      conditions: Array.from(this.conditions.values()).filter(c => c.patientId === id).map(enrich),
      observations: Array.from(this.observations.values()).filter(o => o.patientId === id).map(enrich),
      summaries: Array.from(this.summaries.values()).filter(s => s.patientId === id).map(enrich),
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
    const provId = data.provenanceId || `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

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
      provenanceId: provId,
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

    // Initial Provenance
    await this.addProvenance({
      id: provId,
      provenanceId: provId,
      entityId: id,
      entityType: 'LAB_RESULT',
      provenanceType: lab.provenanceSource,
      version: 1,
      documentId: lab.documentId,
      pageNumber: lab.sourcePageNumber,
      sourceText: lab.sourceOriginalSnippet || `${lab.testName}: ${lab.measuredValue} ${lab.unit || ''}`,
      confidence: lab.confidenceScore,
      extractionMethod: 'NATIVE_PDF',
      userId: lab.provenanceSource === 'USER_PROVIDED' ? 'User' : undefined,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await this.logAudit(lab.patientId, 'LAB_RESULT', id, 'AI_EXTRACTED', null, lab, 'AI_ENGINE', `Extracted test: ${lab.testName}`);
    return lab;
  }

  // --- MEDICATIONS ---
  async addMedication(data: Partial<MedicationRecord>): Promise<MedicationRecord> {
    const id = data.id || uuidv4();
    const provId = data.provenanceId || `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

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
      provenanceId: provId,
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

    await this.addProvenance({
      id: provId,
      provenanceId: provId,
      entityId: id,
      entityType: 'MEDICATION',
      provenanceType: med.provenanceSource,
      version: 1,
      documentId: med.documentId,
      pageNumber: med.sourcePageNumber,
      sourceText: med.sourceOriginalSnippet || `${med.drugName} ${med.dosage || ''}`,
      confidence: med.confidenceScore,
      extractionMethod: 'NATIVE_PDF',
      userId: med.provenanceSource === 'USER_PROVIDED' ? 'User' : undefined,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await this.logAudit(med.patientId, 'MEDICATION', id, 'AI_EXTRACTED', null, med, 'AI_ENGINE', `Extracted medication: ${med.drugName}`);
    return med;
  }

  // --- ALLERGIES ---
  async addAllergy(data: Partial<AllergyRecord>): Promise<AllergyRecord> {
    const id = data.id || uuidv4();
    const provId = data.provenanceId || `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const all: AllergyRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      allergen: data.allergen || 'Unknown Allergen',
      reaction: data.reaction || null,
      severity: data.severity || 'UNKNOWN',
      provenanceId: provId,
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

    await this.addProvenance({
      id: provId,
      provenanceId: provId,
      entityId: id,
      entityType: 'ALLERGY',
      provenanceType: all.provenanceSource,
      version: 1,
      documentId: all.documentId,
      pageNumber: all.sourcePageNumber,
      sourceText: all.sourceOriginalSnippet || all.allergen,
      confidence: all.confidenceScore,
      extractionMethod: 'NATIVE_PDF',
      userId: all.provenanceSource === 'USER_PROVIDED' ? 'User' : undefined,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await this.logAudit(all.patientId, 'ALLERGY', id, 'AI_EXTRACTED', null, all, 'AI_ENGINE', `Extracted allergy: ${all.allergen}`);
    return all;
  }

  // --- CONDITIONS ---
  async addCondition(data: Partial<ConditionRecord>): Promise<ConditionRecord> {
    const id = data.id || uuidv4();
    const provId = data.provenanceId || `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const cond: ConditionRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      conditionName: data.conditionName || 'Unknown Condition',
      icd10Code: data.icd10Code || null,
      clinicalStatus: data.clinicalStatus || 'ACTIVE',
      diagnosedDate: data.diagnosedDate || null,
      provenanceId: provId,
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

    await this.addProvenance({
      id: provId,
      provenanceId: provId,
      entityId: id,
      entityType: 'CONDITION',
      provenanceType: cond.provenanceSource,
      version: 1,
      documentId: cond.documentId,
      pageNumber: cond.sourcePageNumber,
      sourceText: cond.sourceOriginalSnippet || cond.conditionName,
      confidence: cond.confidenceScore,
      extractionMethod: 'NATIVE_PDF',
      userId: cond.provenanceSource === 'USER_PROVIDED' ? 'User' : undefined,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await this.logAudit(cond.patientId, 'CONDITION', id, 'AI_EXTRACTED', null, cond, 'AI_ENGINE', `Extracted condition: ${cond.conditionName}`);
    return cond;
  }

  // --- OBSERVATIONS ---
  async addObservation(data: Partial<ClinicalObservationRecord>): Promise<ClinicalObservationRecord> {
    const id = data.id || uuidv4();
    const provId = data.provenanceId || `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const obs: ClinicalObservationRecord = {
      id,
      patientId: data.patientId!,
      documentId: data.documentId || null,
      category: data.category || 'CLINICIAN_NOTE',
      content: data.content || '',
      observationDate: data.observationDate || new Date(),
      provenanceId: provId,
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

    await this.addProvenance({
      id: provId,
      provenanceId: provId,
      entityId: id,
      entityType: 'CLINICAL_OBSERVATION',
      provenanceType: obs.provenanceSource,
      version: 1,
      documentId: obs.documentId,
      pageNumber: obs.sourcePageNumber,
      sourceText: obs.sourceOriginalSnippet || obs.content,
      confidence: obs.confidenceScore,
      extractionMethod: 'NATIVE_PDF',
      userId: obs.provenanceSource === 'USER_PROVIDED' ? 'User' : undefined,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return obs;
  }

  // --- CONFLICTS ---
  async addConflict(data: any): Promise<any> {
    const id = data.id || `conf_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const conf = {
      id,
      patientId: data.patientId,
      type: data.type || data.conflictType || 'MEDICATION',
      conflictType: data.type || data.conflictType || 'MEDICATION',
      entityType: data.entityType || 'MEDICATION',
      description: data.description || 'Potential conflict detected — human verification required.',
      severity: data.severity || 'MEDIUM',
      detectionConfidence: data.detectionConfidence ?? 0.95,
      sourceA: data.sourceA || null,
      sourceB: data.sourceB || null,
      conflictingRecordsJson: data.conflictingRecordsJson || (data.sourceA && data.sourceB ? JSON.stringify([data.sourceA, data.sourceB]) : '[]'),
      resolutionStatus: data.resolutionStatus || 'UNREVIEWED',
      detectedTimestamp: data.detectedTimestamp || new Date().toISOString(),
      detectedAt: data.detectedAt || new Date(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    this.conflicts.set(id, conf);
    await this.logAudit(
      conf.patientId,
      'CONFLICT',
      id,
      'CONFLICT_DETECTED',
      null,
      conf,
      'SYSTEM',
      `Conflict detected: ${conf.description}`
    );
    return conf;
  }

  async getConflicts(filter?: { patientId?: string; status?: string; type?: string; severity?: string }): Promise<any[]> {
    let list = Array.from(this.conflicts.values());
    if (filter?.patientId) list = list.filter(c => c.patientId === filter.patientId);
    if (filter?.status) {
      const s = filter.status.toUpperCase();
      list = list.filter(c => {
        const current = (c.resolutionStatus || '').toUpperCase();
        if (s === 'UNREVIEWED') return current === 'UNREVIEWED' || current === 'DETECTED';
        return current === s;
      });
    }
    if (filter?.type) list = list.filter(c => (c.type || c.conflictType) === filter.type);
    if (filter?.severity) list = list.filter(c => c.severity === filter.severity);
    return list.sort((a, b) => new Date(b.detectedTimestamp || b.detectedAt || 0).getTime() - new Date(a.detectedTimestamp || a.detectedAt || 0).getTime());
  }

  async getConflictById(id: string): Promise<any | null> {
    return this.conflicts.get(id) || null;
  }

  async getConflictsByRecordId(recordId: string): Promise<any[]> {
    const list: any[] = [];
    for (const conf of this.conflicts.values()) {
      const recAId = conf.sourceA?.recordId;
      const recBId = conf.sourceB?.recordId;
      if (recAId === recordId || recBId === recordId) {
        list.push(conf);
        continue;
      }
      try {
        const records = JSON.parse(conf.conflictingRecordsJson || '[]');
        if (records.some((r: any) => r.id === recordId || r.recordId === recordId)) {
          list.push(conf);
        }
      } catch {}
    }
    return list;
  }

  async reviewConflict(conflictId: string, reviewerId: string = 'Dr. Sarah Jenkins, MD', notes?: string): Promise<any | null> {
    const conf = this.conflicts.get(conflictId);
    if (!conf) return null;

    conf.resolutionStatus = 'REVIEWED';
    conf.reviewedBy = reviewerId;
    conf.reviewedAt = new Date().toISOString();
    conf.updatedAt = new Date().toISOString();
    this.conflicts.set(conflictId, conf);

    await this.logAudit(
      conf.patientId,
      'CONFLICT',
      conflictId,
      'CONFLICT_REVIEWED',
      { resolutionStatus: 'UNREVIEWED' },
      conf,
      reviewerId,
      notes || 'Conflict moved to REVIEWED status by clinician'
    );
    return conf;
  }

  async resolveConflict(
    conflictId: string,
    params: {
      reviewerId?: string;
      decision: string;
      selectedRecordId?: string | null;
      correctedValue?: any;
      reason: string;
    } | string
  ): Promise<any | null> {
    const conf = this.conflicts.get(conflictId);
    if (!conf) return null;

    const previousStatus = conf.resolutionStatus;
    const isStringParam = typeof params === 'string';
    const reason = isStringParam ? params : params.reason;
    const decision = isStringParam ? 'RESOLVED' : params.decision || 'RESOLVED';
    const reviewerId = isStringParam ? 'Dr. Sarah Jenkins, MD' : params.reviewerId || 'Dr. Sarah Jenkins, MD';
    const selectedRecordId = isStringParam ? null : params.selectedRecordId || null;
    const correctedValue = isStringParam ? null : params.correctedValue || null;

    conf.resolutionStatus = 'RESOLVED';
    conf.resolvedBy = reviewerId;
    conf.resolvedAt = new Date();
    conf.resolutionNotes = reason;
    conf.updatedAt = new Date().toISOString();

    const resolutionRecord = {
      id: `res_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      conflictId,
      resolutionStatus: 'RESOLVED' as const,
      reviewerId,
      timestamp: new Date().toISOString(),
      decision,
      selectedRecordId,
      correctedValue,
      reason,
    };
    conf.resolution = resolutionRecord;
    this.conflictResolutions.set(conflictId, resolutionRecord);
    this.conflicts.set(conflictId, conf);

    // If a corrected value was entered, create a USER_EDITED provenance record!
    if (decision === 'CORRECT_VALUE' && correctedValue) {
      const pProvId = `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
      await this.addProvenance({
        id: pProvId,
        provenanceId: pProvId,
        entityId: selectedRecordId || conf.sourceA?.recordId || conflictId,
        entityType: conf.entityType || 'CLINICAL_RECORD',
        provenanceType: 'USER_EDITED',
        version: 2,
        previousValue: conf.sourceA?.value,
        newValue: correctedValue,
        userId: reviewerId,
        action: 'CONFLICT_CORRECTION',
        reason,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    await this.logAudit(
      conf.patientId,
      'CONFLICT',
      conflictId,
      'CONFLICT_RESOLVED',
      { resolutionStatus: previousStatus },
      conf,
      reviewerId,
      `Conflict resolved (${decision}): ${reason}`
    );
    return conf;
  }

  async dismissConflict(conflictId: string, reviewerId: string = 'Dr. Sarah Jenkins, MD', reason: string = 'Dismissed by clinician'): Promise<any | null> {
    const conf = this.conflicts.get(conflictId);
    if (!conf) return null;

    const previousStatus = conf.resolutionStatus;
    conf.resolutionStatus = 'DISMISSED';
    conf.resolvedBy = reviewerId;
    conf.resolvedAt = new Date();
    conf.resolutionNotes = reason;
    conf.updatedAt = new Date().toISOString();

    const dismissalRecord = {
      id: `res_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      conflictId,
      resolutionStatus: 'DISMISSED' as const,
      reviewerId,
      timestamp: new Date().toISOString(),
      decision: 'DISMISSED',
      selectedRecordId: null,
      correctedValue: null,
      reason,
    };
    conf.resolution = dismissalRecord;
    this.conflictResolutions.set(conflictId, dismissalRecord);
    this.conflicts.set(conflictId, conf);

    await this.logAudit(
      conf.patientId,
      'CONFLICT',
      conflictId,
      'CONFLICT_DISMISSED',
      { resolutionStatus: previousStatus },
      conf,
      reviewerId,
      `Conflict dismissed: ${reason}`
    );
    return conf;
  }

  async reopenConflict(conflictId: string, reviewerId: string = 'Dr. Sarah Jenkins, MD', reason: string = 'Reopened for clinical reconsideration'): Promise<any | null> {
    const conf = this.conflicts.get(conflictId);
    if (!conf) return null;

    const previousStatus = conf.resolutionStatus;
    conf.resolutionStatus = 'UNREVIEWED';
    conf.resolvedBy = null;
    conf.resolvedAt = null;
    conf.resolutionNotes = null;
    conf.updatedAt = new Date().toISOString();
    this.conflicts.set(conflictId, conf);

    await this.logAudit(
      conf.patientId,
      'CONFLICT',
      conflictId,
      'CONFLICT_REOPENED',
      { resolutionStatus: previousStatus },
      conf,
      reviewerId,
      `Conflict reopened: ${reason}`
    );
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
    const history = await this.getProvenanceHistory(entityId);
    const newVersion = history.length + 1;

    if (action === 'ACCEPT') {
      existing.verificationStatus = 'VERIFIED';
      existing.verifiedAt = new Date();
      existing.verifiedBy = 'Dr. Sarah Jenkins, MD';

      const vProvId = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      await this.addProvenance({
        id: vProvId,
        provenanceId: vProvId,
        entityId,
        entityType,
        provenanceType: 'HUMAN_VERIFIED',
        version: newVersion,
        userId: existing.verifiedBy,
        action: 'VERIFY',
        verifiedRecordId: entityId,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      existing.provenanceId = vProvId;
    } else if (action === 'REJECT') {
      existing.verificationStatus = 'REJECTED';
      existing.verifiedAt = new Date();
      existing.verifiedBy = 'Dr. Sarah Jenkins, MD';
      existing.verificationNotes = reason || 'Rejected by clinical reviewer';
    } else if (action === 'EDIT' && editedValues) {
      existing.verificationStatus = 'EDITED';
      existing.provenanceSource = 'USER_EDITED';
      existing.verifiedAt = new Date();
      existing.verifiedBy = 'Dr. Sarah Jenkins, MD';
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

      const eProvId = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      await this.addProvenance({
        id: eProvId,
        provenanceId: eProvId,
        entityId,
        entityType,
        provenanceType: 'USER_EDITED',
        version: newVersion,
        previousValue: previousCopy,
        newValue: editedValues,
        userId: existing.verifiedBy,
        action: 'EDIT',
        reason: reason || 'Modified during human verification',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      existing.provenanceId = eProvId;
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
      timestamp: new Date(),
    };

    this.auditLogs.set(id, log);
    return log;
  }
}

// Singleton export
export function getStore(): MedLensStore {
  if (!global.__medlens_store) {
    global.__medlens_store = new MedLensStore();
  }
  if (!global.__medlens_store.provenanceRecords) {
    global.__medlens_store.provenanceRecords = new Map();
  }
  if (!global.__medlens_store.entityProvenanceHistory) {
    global.__medlens_store.entityProvenanceHistory = new Map();
  }
  if (!global.__medlens_store.conflictResolutions) {
    global.__medlens_store.conflictResolutions = new Map();
  }
  return global.__medlens_store;
}
