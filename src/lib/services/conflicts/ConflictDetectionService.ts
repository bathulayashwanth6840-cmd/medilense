import { PatientRecord, ConflictRecord } from '@/types/clinical';
import { ClinicalExtraction } from '../validation/schemas';
import { v4 as uuidv4 } from 'uuid';

export interface DetectedConflict {
  id?: string;
  patientId: string;
  conflictType:
    | 'MEDICATION_INCONSISTENCY'
    | 'ALLERGY_DISCREPANCY'
    | 'LAB_VALUE_DIVERGENCE'
    | 'DEMOGRAPHIC_MISMATCH'
    | 'DATE_ANOMALY'
    | 'DUPLICATE_DISCREPANCY';
  entityType: string;
  description: string;
  status: 'CONFLICT';
  requiresHumanReview: boolean;
  conflictingRecords: any[];
}

export class ConflictDetectionService {
  /**
   * Deterministically scans patient clinical graph and incoming extractions for inconsistencies
   */
  static detectConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    currentDocumentId?: string
  ): DetectedConflict[] {
    const conflicts: DetectedConflict[] = [];

    // Aggregate all medications (existing + new extraction)
    const existingMeds = patient.medications || [];
    const incomingMeds = (newExtraction?.medications || []).map(m => ({
      id: uuidv4(),
      drugName: m.drugName,
      dosage: m.dose,
      frequency: m.frequency,
      status: m.status,
      sourceDocumentId: currentDocumentId || 'incoming_extraction',
      sourceOriginalSnippet: m.sourceText,
      provenanceSource: 'DOCUMENT_EXTRACTED',
    }));
    const allMeds = [...existingMeds, ...incomingMeds];

    // 1. Medication Dosage & Frequency Conflicts
    const medsByName: Record<string, any[]> = {};
    for (const m of allMeds) {
      if (!m.drugName) continue;
      const key = m.drugName.trim().toLowerCase();
      if (!medsByName[key]) medsByName[key] = [];
      medsByName[key].push(m);
    }

    for (const [drugKey, records] of Object.entries(medsByName)) {
      if (records.length > 1) {
        // Compare dosages
        const distinctDoses = Array.from(new Set(records.map(r => r.dosage || r.dose).filter(Boolean)));
        if (distinctDoses.length > 1) {
          conflicts.push({
            patientId: patient.id,
            conflictType: 'MEDICATION_INCONSISTENCY',
            entityType: 'MEDICATION',
            description: `Conflicting dosage documented for ${records[0].drugName}: ${distinctDoses.join(' vs ')}. Clinician verification required.`,
            status: 'CONFLICT',
            requiresHumanReview: true,
            conflictingRecords: records,
          });
        }
      }
    }

    // 2. Allergy vs Active Prescription Conflict
    const allergies = [...(patient.allergies || []), ...(newExtraction?.allergies || [])];
    for (const a of allergies) {
      const allergenName = (a.allergen || '').toLowerCase();
      if (!allergenName) continue;

      for (const m of allMeds) {
        const drugName = (m.drugName || '').toLowerCase();
        if (
          (allergenName.includes('penicillin') && (drugName.includes('penicillin') || drugName.includes('amoxicillin') || drugName.includes('ampicillin'))) ||
          (allergenName.includes('sulfa') && (drugName.includes('sulfa') || drugName.includes('bactrim') || drugName.includes('sulfamethoxazole')))
        ) {
          conflicts.push({
            patientId: patient.id,
            conflictType: 'ALLERGY_DISCREPANCY',
            entityType: 'ALLERGY_MEDICATION_CONTRAINDICATION',
            description: `Potential allergy discrepancy: Patient has documented sensitivity to '${a.allergen}' while '${m.drugName}' is active in records.`,
            status: 'CONFLICT',
            requiresHumanReview: true,
            conflictingRecords: [a, m],
          });
        }
      }
    }

    // 3. Lab Value Divergences
    const existingLabs = patient.labResults || [];
    const incomingLabs = (newExtraction?.laboratoryResults || []).map(l => ({
      id: uuidv4(),
      testName: l.testName,
      measuredValue: l.value,
      numericValue: l.numericValue,
      unit: l.unit,
      referenceRangeText: l.referenceRange,
      interpretation: l.status,
      sourceDocumentId: currentDocumentId || 'incoming_extraction',
      sourceOriginalSnippet: l.sourceText,
    }));
    const allLabs = [...existingLabs, ...incomingLabs];

    const labsByName: Record<string, any[]> = {};
    for (const l of allLabs) {
      const key = (l.testName || '').trim().toLowerCase();
      if (!labsByName[key]) labsByName[key] = [];
      labsByName[key].push(l);
    }

    for (const [testKey, records] of Object.entries(labsByName)) {
      if (records.length > 1) {
        const numericValues = records.map(r => r.numericValue).filter(v => v !== null && v !== undefined) as number[];
        if (numericValues.length > 1) {
          const maxVal = Math.max(...numericValues);
          const minVal = Math.min(...numericValues);
          // If divergence > 25% across proximate records
          if (minVal > 0 && (maxVal - minVal) / minVal > 0.25) {
            conflicts.push({
              patientId: patient.id,
              conflictType: 'LAB_VALUE_DIVERGENCE',
              entityType: 'LAB_RESULT',
              description: `Significant divergence detected for ${records[0].testName}: values range from ${minVal} to ${maxVal} ${records[0].unit || ''}.`,
              status: 'CONFLICT',
              requiresHumanReview: true,
              conflictingRecords: records,
            });
          }
        }
      }
    }

    return conflicts;
  }
}
