// Conflict & Inconsistency Detection Engine for MedLens
// Core Mandate: Never automatically overwrite or decide which record is correct.
// Flag potential discrepancies clearly for human clinical verification.

import { ConflictType } from '@/types/clinical';

export interface DetectedConflict {
  conflictType: ConflictType;
  entityType: 'PATIENT' | 'MEDICATION' | 'ALLERGY' | 'LAB_RESULT' | 'CONDITION';
  description: string;
  conflictingRecords: Array<{
    id?: string;
    source: string;
    label: string;
    value: string;
    date?: string | Date | null;
  }>;
}

export function detectClinicalConflicts(patientData: {
  fullName: string;
  identifier: string;
  dateOfBirth?: string | Date | null;
  documents?: any[];
  labResults?: any[];
  medications?: any[];
  allergies?: any[];
  conditions?: any[];
}): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  // 1. Medication Inconsistencies (e.g. diverging dosages for the same medication)
  const meds = patientData.medications || [];
  const medMap = new Map<string, any[]>();
  for (const m of meds) {
    const key = m.drugName.trim().toLowerCase();
    if (!medMap.has(key)) {
      medMap.set(key, []);
    }
    medMap.get(key)!.push(m);
  }

  for (const [drugKey, records] of medMap.entries()) {
    if (records.length > 1) {
      // Check if dosages or frequencies diverge
      const dosages = new Set(records.map(r => (r.dosage || '').trim().toLowerCase()));
      if (dosages.size > 1) {
        conflicts.push({
          conflictType: 'MEDICATION_INCONSISTENCY',
          entityType: 'MEDICATION',
          description: `Potential dosage discrepancy detected for ${records[0].drugName}. Human verification required.`,
          conflictingRecords: records.map(r => ({
            id: r.id,
            source: r.provenanceSource || (r.document ? r.document.originalFileName : 'Intake Record'),
            label: r.drugName,
            value: `Dosage: ${r.dosage || 'Not specified'}, Freq: ${r.frequency || 'Not specified'} (Status: ${r.status || 'ACTIVE'})`,
            date: r.createdAt || r.startDate,
          })),
        });
      }
    }
  }

  // 2. Allergy Discrepancies (e.g., NKDA in intake notes vs documented allergen in lab/report)
  const allergies = patientData.allergies || [];
  const hasNkda = allergies.some(a => /nkda|no known|none/i.test(a.allergen));
  const activeAllergens = allergies.filter(a => !/nkda|no known|none/i.test(a.allergen));

  if (hasNkda && activeAllergens.length > 0) {
    conflicts.push({
      conflictType: 'ALLERGY_DISCREPANCY',
      entityType: 'ALLERGY',
      description: 'Conflict detected: Patient profile contains "No Known Drug Allergies (NKDA)" but active allergen entries exist in records.',
      conflictingRecords: [
        {
          source: 'Intake / Profile',
          label: 'Allergy Status',
          value: 'NKDA (No Known Drug Allergies)',
        },
        ...activeAllergens.map(a => ({
          id: a.id,
          source: a.provenanceSource || 'Uploaded Document',
          label: a.allergen,
          value: `Reaction: ${a.reaction || 'Unspecified'} (Severity: ${a.severity || 'Unknown'})`,
        })),
      ],
    });
  }

  // 3. Lab Value Divergences (Duplicate test on same date with conflicting measured values)
  const labs = patientData.labResults || [];
  const labMap = new Map<string, any[]>();
  for (const l of labs) {
    const dateStr = l.testDate ? new Date(l.testDate).toISOString().split('T')[0] : 'undated';
    const key = `${l.testName.trim().toLowerCase()}_${dateStr}`;
    if (!labMap.has(key)) {
      labMap.set(key, []);
    }
    labMap.get(key)!.push(l);
  }

  for (const [key, records] of labMap.entries()) {
    if (records.length > 1) {
      const values = new Set(records.map(r => r.measuredValue.trim()));
      if (values.size > 1) {
        conflicts.push({
          conflictType: 'LAB_VALUE_DIVERGENCE',
          entityType: 'LAB_RESULT',
          description: `Conflicting lab values recorded for "${records[0].testName}" on the same date (${records[0].testDate ? new Date(records[0].testDate).toLocaleDateString() : 'undated'}). Human verification required.`,
          conflictingRecords: records.map(r => ({
            id: r.id,
            source: r.provenanceSource || (r.document ? r.document.originalFileName : 'Record Entry'),
            label: r.testName,
            value: `Measured: ${r.measuredValue} ${r.unit || ''} (Ref: ${r.referenceRangeText || 'Unavailable'})`,
            date: r.testDate,
          })),
        });
      }
    }
  }

  // 4. Demographic Mismatch (Documents showing a different patient identifier or name)
  const docs = patientData.documents || [];
  for (const doc of docs) {
    if (doc.rawExtractedText) {
      const idMatch = doc.rawExtractedText.match(/mrn|patient\s*id[:\s]+([a-zA-Z0-9-]+)/i);
      if (idMatch && idMatch[1] && patientData.identifier) {
        const extractedId = idMatch[1].trim().toLowerCase();
        const primaryId = patientData.identifier.trim().toLowerCase();
        if (extractedId !== primaryId && extractedId.length > 3 && primaryId.length > 3) {
          conflicts.push({
            conflictType: 'DEMOGRAPHIC_MISMATCH',
            entityType: 'PATIENT',
            description: `Document identifier "${idMatch[1]}" does not match primary patient MRN "${patientData.identifier}".`,
            conflictingRecords: [
              {
                source: 'Primary Patient Record',
                label: 'MRN / Identifier',
                value: patientData.identifier,
              },
              {
                id: doc.id,
                source: doc.originalFileName,
                label: 'Extracted Document MRN',
                value: idMatch[1],
              },
            ],
          });
        }
      }
    }
  }

  return conflicts;
}
