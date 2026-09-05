// MedLens Conflict Detection Engine
// Detects inconsistencies across patient demographics, medications, allergies, conditions, and lab results without ever guessing or automatically choosing a source.

import { v4 as uuidv4 } from 'uuid';
import {
  Conflict,
  ConflictSource,
  ConflictType,
  ConflictSeverity,
  LabComparisonRule,
} from './ConflictTypes';
import { PatientRecord, DocumentRecord } from '@/types/clinical';
import { ClinicalExtraction } from '../validation/schemas';
import { entityMatchingService } from './EntityMatchingService';

export interface IConflictDetectionEngine {
  detectAllConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    currentDocumentId?: string,
    allDocuments?: DocumentRecord[]
  ): Conflict[];
}

// Configurable Lab Comparison Thresholds
const DEFAULT_LAB_RULES: Record<string, LabComparisonRule> = {
  hemoglobin: { testIdentifier: 'hemoglobin', relativeDifferencePercent: 20, absoluteDifference: 2.5 },
  'wbc count': { testIdentifier: 'wbc count', relativeDifferencePercent: 40, absoluteDifference: 4.0 },
  platelets: { testIdentifier: 'platelets', relativeDifferencePercent: 35, absoluteDifference: 80 },
  'glucose, fasting': { testIdentifier: 'glucose, fasting', relativeDifferencePercent: 25, absoluteDifference: 30 },
  'total cholesterol': { testIdentifier: 'total cholesterol', relativeDifferencePercent: 25, absoluteDifference: 40 },
  ferritin: { testIdentifier: 'ferritin', relativeDifferencePercent: 50, absoluteDifference: 30 },
  tsh: { testIdentifier: 'tsh', relativeDifferencePercent: 50, absoluteDifference: 2.0 },
};

export class ConflictDetectionEngine implements IConflictDetectionEngine {
  private static instance: ConflictDetectionEngine;

  public static getInstance(): ConflictDetectionEngine {
    if (!ConflictDetectionEngine.instance) {
      ConflictDetectionEngine.instance = new ConflictDetectionEngine();
    }
    return ConflictDetectionEngine.instance;
  }

  detectAllConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    currentDocumentId?: string,
    allDocuments: DocumentRecord[] = []
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // 1. Patient Identifier & Demographic Conflicts
    conflicts.push(...this.detectPatientIdentifierConflicts(patient, newExtraction, currentDocumentId));
    conflicts.push(...this.detectAgeDobConflicts(patient, newExtraction, currentDocumentId));
    conflicts.push(...this.detectSexConflicts(patient, newExtraction, currentDocumentId));

    // 2. Medication Conflicts & Temporal Changes
    conflicts.push(...this.detectMedicationConflicts(patient, newExtraction, currentDocumentId));

    // 3. Allergy Conflicts
    conflicts.push(...this.detectAllergyConflicts(patient, newExtraction, currentDocumentId));

    // 4. Condition Conflicts
    conflicts.push(...this.detectConditionConflicts(patient, newExtraction, currentDocumentId));

    // 5. Lab Value & Duplicate Test Conflicts
    conflicts.push(...this.detectLabAndDuplicateConflicts(patient, newExtraction, currentDocumentId));

    // 6. Report Date Inconsistency
    conflicts.push(...this.detectReportDateConflicts(patient, newExtraction, currentDocumentId, allDocuments));

    return conflicts;
  }

  // --- 1. PATIENT IDENTIFIER CONFLICTS ---
  private detectPatientIdentifierConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const docPatient = newExtraction?.patient;
    if (!docPatient) return conflicts;

    // Check MRN / Identifier
    if (docPatient.mrn && patient.identifier) {
      const normA = docPatient.mrn.trim().toUpperCase();
      const normB = patient.identifier.trim().toUpperCase();
      if (normA !== normB && !normA.includes(normB) && !normB.includes(normA)) {
        conflicts.push(
          this.createConflict({
            patientId: patient.id,
            type: 'PATIENT_IDENTIFIER',
            description: `MRN discrepancy detected: Document cites '${docPatient.mrn}' while patient registry records '${patient.identifier}'. Potential patient mismatch.`,
            severity: 'CRITICAL',
            confidence: 0.98,
            sourceA: {
              recordId: docPatient.mrn,
              documentId: documentId || null,
              pageNumber: 1,
              sourceText: `MRN: ${docPatient.mrn}`,
              value: docPatient.mrn,
              field: 'Medical Record Number (MRN)',
              provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
              timestamp: new Date().toISOString(),
            },
            sourceB: {
              recordId: patient.id,
              documentId: null,
              pageNumber: null,
              sourceText: `Patient Identifier: ${patient.identifier}`,
              value: patient.identifier,
              field: 'Patient Identifier',
              provenanceId: `prov_patient_${patient.id}`,
              timestamp: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
            },
          })
        );
      }
    }

    // Check Full Name
    const patientName = (docPatient as any).name || docPatient.fullName;
    if (patientName && patient.fullName) {
      const match = entityMatchingService.matchEntities(patientName, patient.fullName, 'PATIENT');
      if (!match.isMatch) {
        conflicts.push(
          this.createConflict({
            patientId: patient.id,
            type: 'PATIENT_IDENTIFIER',
            description: `Patient name variation: Document identifies patient as '${patientName}' while patient profile records '${patient.fullName}'.`,
            severity: 'HIGH',
            confidence: 0.92,
            sourceA: {
              recordId: `name_${patientName}`,
              documentId: documentId || null,
              pageNumber: 1,
              sourceText: `Patient Name: ${patientName}`,
              value: patientName,
              field: 'Patient Name',
              provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
              timestamp: new Date().toISOString(),
            },
            sourceB: {
              recordId: patient.id,
              documentId: null,
              pageNumber: null,
              sourceText: `Registered Name: ${patient.fullName}`,
              value: patient.fullName,
              field: 'Registered Full Name',
              provenanceId: `prov_patient_${patient.id}`,
              timestamp: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
            },
          })
        );
      }
    }

    return conflicts;
  }

  // --- 2. AGE & DATE-OF-BIRTH CONFLICTS ---
  private detectAgeDobConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const docPatient = newExtraction?.patient;
    const docReportDate = newExtraction?.reportMetadata?.reportDate || (newExtraction as any)?.metadata?.reportDate;
    const patientDob = (docPatient as any)?.dob || docPatient?.dateOfBirth;

    // Check DOB discrepancy
    if (patientDob && patient.dateOfBirth) {
      const dobA = new Date(patientDob).toISOString().split('T')[0];
      const dobB = new Date(patient.dateOfBirth).toISOString().split('T')[0];
      if (dobA !== dobB) {
        conflicts.push(
          this.createConflict({
            patientId: patient.id,
            type: 'AGE_DOB',
            description: `Conflicting Date of Birth documented: '${dobA}' in report vs '${dobB}' in patient profile.`,
            severity: 'HIGH',
            confidence: 0.95,
            sourceA: {
              recordId: `dob_${patientDob}`,
              documentId: documentId || null,
              pageNumber: 1,
              sourceText: `DOB: ${patientDob}`,
              value: dobA,
              field: 'Date of Birth',
              provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
              timestamp: new Date().toISOString(),
            },
            sourceB: {
              recordId: patient.id,
              documentId: null,
              pageNumber: null,
              sourceText: `Registered DOB: ${dobB}`,
              value: dobB,
              field: 'Registered Date of Birth',
              provenanceId: `prov_patient_${patient.id}`,
              timestamp: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
            },
          })
        );
      }
    }

    // Check Reported Age vs DOB & Report Date Calculation
    if (docPatient?.age && (patient.dateOfBirth || patientDob)) {
      const baseDob = new Date(patient.dateOfBirth || patientDob!);
      const refDate = docReportDate ? new Date(docReportDate) : new Date();

      if (!isNaN(baseDob.getTime()) && !isNaN(refDate.getTime())) {
        let expectedAge = refDate.getFullYear() - baseDob.getFullYear();
        const m = refDate.getMonth() - baseDob.getMonth();
        if (m < 0 || (m === 0 && refDate.getDate() < baseDob.getDate())) {
          expectedAge--;
        }

        if (Math.abs(docPatient.age - expectedAge) > 1) {
          conflicts.push(
            this.createConflict({
              patientId: patient.id,
              type: 'AGE_DOB',
              description: `Reported age (${docPatient.age}) differs from calculated age (${expectedAge}) based on DOB (${baseDob.toISOString().split('T')[0]}) and report date (${refDate.toISOString().split('T')[0]}).`,
              severity: 'MEDIUM',
              confidence: 0.88,
              sourceA: {
                recordId: `age_${docPatient.age}`,
                documentId: documentId || null,
                pageNumber: 1,
                sourceText: `Reported Age: ${docPatient.age}`,
                value: docPatient.age,
                field: 'Reported Age',
                provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                timestamp: new Date().toISOString(),
              },
              sourceB: {
                recordId: patient.id,
                documentId: null,
                pageNumber: null,
                sourceText: `DOB: ${baseDob.toISOString().split('T')[0]}, Calculated: ${expectedAge}`,
                value: expectedAge,
                field: 'Calculated Age from DOB',
                provenanceId: `prov_patient_${patient.id}`,
                timestamp: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
              },
            })
          );
        }
      }
    }

    return conflicts;
  }

  // --- 3. EXPLICIT DOCUMENTED SEX CONFLICTS ---
  private detectSexConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const docSex = newExtraction?.patient?.sex;
    if (!docSex || !patient.sex) return conflicts;

    const normA = docSex.trim().toUpperCase();
    const normB = patient.sex.trim().toUpperCase();

    if (
      (normA === 'MALE' && normB === 'FEMALE') ||
      (normA === 'FEMALE' && normB === 'MALE') ||
      (normA === 'M' && normB === 'F') ||
      (normA === 'F' && normB === 'M')
    ) {
      conflicts.push(
        this.createConflict({
          patientId: patient.id,
          type: 'SEX',
          description: `Explicit biological sex contradiction: Document records '${docSex}' while patient registry records '${patient.sex}'.`,
          severity: 'CRITICAL',
          confidence: 0.99,
          sourceA: {
            recordId: `sex_${docSex}`,
            documentId: documentId || null,
            pageNumber: 1,
            sourceText: `Sex: ${docSex}`,
            value: docSex,
            field: 'Documented Sex',
            provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
            timestamp: new Date().toISOString(),
          },
          sourceB: {
            recordId: patient.id,
            documentId: null,
            pageNumber: null,
            sourceText: `Registered Sex: ${patient.sex}`,
            value: patient.sex,
            field: 'Registered Sex',
            provenanceId: `prov_patient_${patient.id}`,
            timestamp: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
          },
        })
      );
    }

    return conflicts;
  }

  // --- 4. ALLERGY CONFLICTS ---
  private detectAllergyConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingAllergies = patient.allergies || [];
    const incomingAllergies = newExtraction?.allergies || [];

    // Check for "No Known Allergies" vs documented allergy list
    const hasExistingNKDA = existingAllergies.some(a =>
      /no known|nkda|none|no allergies|denies/i.test(a.allergen)
    );
    const hasIncomingNKDA = incomingAllergies.some(a =>
      /no known|nkda|none|no allergies|denies/i.test(a.allergen)
    );

    if (hasExistingNKDA && incomingAllergies.some(a => !/no known|nkda|none/i.test(a.allergen))) {
      const activeAllergen = incomingAllergies.find(a => !/no known|nkda|none/i.test(a.allergen))!;
      conflicts.push(
        this.createConflict({
          patientId: patient.id,
          type: 'ALLERGY',
          description: `Allergy status contradiction: Document reports active allergy to '${activeAllergen.allergen}' while past records document 'No Known Drug Allergies'.`,
          severity: 'HIGH',
          confidence: 0.94,
          sourceA: {
            recordId: `allergy_${activeAllergen.allergen}`,
            documentId: documentId || null,
            pageNumber: 1,
            sourceText: activeAllergen.sourceText || `Allergy: ${activeAllergen.allergen}`,
            value: activeAllergen.allergen,
            field: 'Allergy Status',
            provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
            timestamp: new Date().toISOString(),
          },
          sourceB: {
            recordId: existingAllergies[0].id,
            documentId: existingAllergies[0].documentId || null,
            pageNumber: existingAllergies[0].sourcePageNumber || 1,
            sourceText: existingAllergies[0].sourceOriginalSnippet || 'No Known Allergies (NKDA)',
            value: 'No Known Drug Allergies',
            field: 'Allergy Status',
            provenanceId: existingAllergies[0].provenanceId || `prov_${existingAllergies[0].id}`,
            timestamp: existingAllergies[0].createdAt ? new Date(existingAllergies[0].createdAt).toISOString() : null,
          },
        })
      );
    } else if (hasIncomingNKDA && existingAllergies.some(a => !/no known|nkda|none/i.test(a.allergen))) {
      const existingActive = existingAllergies.find(a => !/no known|nkda|none/i.test(a.allergen))!;
      conflicts.push(
        this.createConflict({
          patientId: patient.id,
          type: 'ALLERGY',
          description: `Allergy status contradiction: Incoming document states 'No Known Allergies' while patient registry has active documented allergy to '${existingActive.allergen}'.`,
          severity: 'HIGH',
          confidence: 0.94,
          sourceA: {
            recordId: `allergy_nkda_incoming`,
            documentId: documentId || null,
            pageNumber: 1,
            sourceText: 'No Known Drug Allergies (NKDA)',
            value: 'No Known Drug Allergies',
            field: 'Allergy Status',
            provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
            timestamp: new Date().toISOString(),
          },
          sourceB: {
            recordId: existingActive.id,
            documentId: existingActive.documentId || null,
            pageNumber: existingActive.sourcePageNumber || 1,
            sourceText: existingActive.sourceOriginalSnippet || `Allergy: ${existingActive.allergen}`,
            value: existingActive.allergen,
            field: 'Documented Allergen',
            provenanceId: existingActive.provenanceId || `prov_${existingActive.id}`,
            timestamp: existingActive.createdAt ? new Date(existingActive.createdAt).toISOString() : null,
          },
        })
      );
    }

    return conflicts;
  }

  // --- 5. MEDICATION CONFLICTS & TEMPORAL CHANGES ---
  private detectMedicationConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingMeds = patient.medications || [];
    const incomingMeds = newExtraction?.medications || [];

    // Compare each incoming medication against existing medications
    for (const inMed of incomingMeds) {
      if (!inMed.drugName) continue;

      for (const exMed of existingMeds) {
        if (!exMed.drugName) continue;

        const isSame = entityMatchingService.areSameEntity(inMed.drugName, exMed.drugName, 'MEDICATION');
        if (isSame) {
          // Check Dosage / Strength Discrepancy
          const inDose = (inMed.dose || '').trim().toLowerCase();
          const exDose = (exMed.dosage || '').trim().toLowerCase();

          if (inDose && exDose && inDose !== exDose) {
            conflicts.push(
              this.createConflict({
                patientId: patient.id,
                type: 'MEDICATION',
                description: `Potential medication dosage discrepancy for ${exMed.drugName}: Document cites '${inMed.dose}' while existing record lists '${exMed.dosage}'.`,
                severity: 'HIGH',
                confidence: 0.96,
                sourceA: {
                  recordId: `in_med_${inMed.drugName}`,
                  documentId: documentId || null,
                  pageNumber: 1,
                  sourceText: inMed.sourceText || `${inMed.drugName} ${inMed.dose}`,
                  value: inMed.dose,
                  field: 'Medication Dosage',
                  provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                  timestamp: new Date().toISOString(),
                },
                sourceB: {
                  recordId: exMed.id,
                  documentId: exMed.documentId || null,
                  pageNumber: exMed.sourcePageNumber || 1,
                  sourceText: exMed.sourceOriginalSnippet || `${exMed.drugName} ${exMed.dosage}`,
                  value: exMed.dosage,
                  field: 'Medication Dosage',
                  provenanceId: exMed.provenanceId || `prov_${exMed.id}`,
                  timestamp: exMed.createdAt ? new Date(exMed.createdAt).toISOString() : null,
                },
              })
            );
          }

          // Check Frequency Discrepancy (if dosage is same)
          const inFreq = (inMed.frequency || '').trim().toLowerCase();
          const exFreq = (exMed.frequency || '').trim().toLowerCase();
          if (inFreq && exFreq && inFreq !== exFreq && inDose === exDose) {
            conflicts.push(
              this.createConflict({
                patientId: patient.id,
                type: 'MEDICATION',
                description: `Frequency discrepancy for ${exMed.drugName}: Document notes '${inMed.frequency}' vs existing record '${exMed.frequency}'.`,
                severity: 'MEDIUM',
                confidence: 0.89,
                sourceA: {
                  recordId: `in_freq_${inMed.drugName}`,
                  documentId: documentId || null,
                  pageNumber: 1,
                  sourceText: inMed.sourceText || `${inMed.drugName} ${inMed.frequency}`,
                  value: inMed.frequency,
                  field: 'Administration Frequency',
                  provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                  timestamp: new Date().toISOString(),
                },
                sourceB: {
                  recordId: exMed.id,
                  documentId: exMed.documentId || null,
                  pageNumber: exMed.sourcePageNumber || 1,
                  sourceText: exMed.sourceOriginalSnippet || `${exMed.drugName} ${exMed.frequency}`,
                  value: exMed.frequency,
                  field: 'Administration Frequency',
                  provenanceId: exMed.provenanceId || `prov_${exMed.id}`,
                  timestamp: exMed.createdAt ? new Date(exMed.createdAt).toISOString() : null,
                },
              })
            );
          }
        }
      }
    }

    // Intra-document medication conflicts (e.g. if extraction returned multiple different dosages for same drug)
    for (let i = 0; i < incomingMeds.length; i++) {
      for (let j = i + 1; j < incomingMeds.length; j++) {
        const med1 = incomingMeds[i];
        const med2 = incomingMeds[j];
        if (entityMatchingService.areSameEntity(med1.drugName, med2.drugName, 'MEDICATION')) {
          if (med1.dose && med2.dose && med1.dose.trim().toLowerCase() !== med2.dose.trim().toLowerCase()) {
            conflicts.push(
              this.createConflict({
                patientId: patient.id,
                type: 'MEDICATION',
                description: `Contradictory dosages for ${med1.drugName} found within same document extractions (${med1.dose} vs ${med2.dose}).`,
                severity: 'HIGH',
                confidence: 0.95,
                sourceA: {
                  recordId: `med_${med1.drugName}_1`,
                  documentId: documentId || null,
                  pageNumber: 1,
                  sourceText: med1.sourceText || `${med1.drugName} ${med1.dose}`,
                  value: med1.dose,
                  field: 'Medication Dosage',
                  provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                  timestamp: new Date().toISOString(),
                },
                sourceB: {
                  recordId: `med_${med2.drugName}_2`,
                  documentId: documentId || null,
                  pageNumber: 1,
                  sourceText: med2.sourceText || `${med2.drugName} ${med2.dose}`,
                  value: med2.dose,
                  field: 'Medication Dosage',
                  provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                  timestamp: new Date().toISOString(),
                },
              })
            );
          }
        }
      }
    }

    return conflicts;
  }

  // --- 6. CONDITION CONFLICTS ---
  private detectConditionConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingConditions = patient.conditions || [];
    const incomingConditions = newExtraction?.conditions || [];

    for (const inCond of incomingConditions) {
      const inName = (inCond as any).name || (inCond as any).conditionName || inCond.condition;
      if (!inName) continue;

      const isNegated = /no history of|denies|negative for|no evidence of|resolved/i.test(inName);
      const cleanName = inName.replace(/no history of|denies|negative for|no evidence of|resolved/gi, '').trim();

      for (const exCond of existingConditions) {
        if (!exCond.conditionName) continue;

        if (entityMatchingService.areSameEntity(cleanName, exCond.conditionName, 'CONDITION')) {
          if (isNegated && exCond.clinicalStatus === 'ACTIVE') {
            conflicts.push(
              this.createConflict({
                patientId: patient.id,
                type: 'CONDITION',
                description: `Condition history conflict: Document states '${inName}' while patient has active clinical diagnosis for '${exCond.conditionName}'.`,
                severity: 'MEDIUM',
                confidence: 0.91,
                sourceA: {
                  recordId: `cond_${cleanName}`,
                  documentId: documentId || null,
                  pageNumber: 1,
                  sourceText: inCond.sourceText || inName,
                  value: inName,
                  field: 'Documented Condition History',
                  provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                  timestamp: new Date().toISOString(),
                },
                sourceB: {
                  recordId: exCond.id,
                  documentId: exCond.documentId || null,
                  pageNumber: exCond.sourcePageNumber || 1,
                  sourceText: exCond.sourceOriginalSnippet || `${exCond.conditionName} (${exCond.clinicalStatus})`,
                  value: `${exCond.conditionName} - ${exCond.clinicalStatus}`,
                  field: 'Active Clinical Condition',
                  provenanceId: exCond.provenanceId || `prov_${exCond.id}`,
                  timestamp: exCond.createdAt ? new Date(exCond.createdAt).toISOString() : null,
                },
              })
            );
          }
        }
      }
    }

    return conflicts;
  }

  // --- 7. LAB VALUE DIVERGENCE & DUPLICATE TEST DETECTION ---
  private detectLabAndDuplicateConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const existingLabs = patient.labResults || [];
    const incomingLabs = newExtraction?.laboratoryResults || [];

    for (const inLab of incomingLabs) {
      if (!inLab.testName) continue;

      for (const exLab of existingLabs) {
        if (!exLab.testName) continue;

        const isSame = entityMatchingService.areSameEntity(inLab.testName, exLab.testName, 'LAB_TEST');
        if (isSame) {
          // Check Unit Compatibility
          const unitA = (inLab.unit || '').trim().toLowerCase();
          const unitB = (exLab.unit || '').trim().toLowerCase();

          // If units are incompatible (e.g. mg/dL vs mmol/L), do not guess or compare numbers!
          if (unitA && unitB && unitA !== unitB) {
            conflicts.push(
              this.createConflict({
                patientId: patient.id,
                type: 'EXTRACTED_ENTITY',
                description: `Incompatible units for ${exLab.testName} (${inLab.unit} vs ${exLab.unit}). Values cannot be safely compared automatically.`,
                severity: 'LOW',
                confidence: 0.85,
                sourceA: {
                  recordId: `in_lab_${inLab.testName}`,
                  documentId: documentId || null,
                  pageNumber: 1,
                  sourceText: inLab.sourceText || `${inLab.testName}: ${inLab.value} ${inLab.unit || ''}`,
                  value: `${inLab.value} ${inLab.unit || ''}`,
                  field: 'Laboratory Result',
                  provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                  timestamp: new Date().toISOString(),
                  unit: inLab.unit,
                },
                sourceB: {
                  recordId: exLab.id,
                  documentId: exLab.documentId || null,
                  pageNumber: exLab.sourcePageNumber || 1,
                  sourceText: exLab.sourceOriginalSnippet || `${exLab.testName}: ${exLab.measuredValue} ${exLab.unit || ''}`,
                  value: `${exLab.measuredValue} ${exLab.unit || ''}`,
                  field: 'Laboratory Result',
                  provenanceId: exLab.provenanceId || `prov_${exLab.id}`,
                  timestamp: exLab.createdAt ? new Date(exLab.createdAt).toISOString() : null,
                  unit: exLab.unit,
                },
              })
            );
            continue;
          }

          const valA = typeof inLab.value === 'number' ? inLab.value : parseFloat(String(inLab.value));
          const valB = typeof exLab.measuredValue === 'number' ? exLab.measuredValue : parseFloat(String(exLab.measuredValue));

          if (!isNaN(valA) && !isNaN(valB)) {
            // Check for DUPLICATE TEST (identical value, identical unit, from same date window)
            if (Math.abs(valA - valB) < 0.001 && unitA === unitB) {
              conflicts.push(
                this.createConflict({
                  patientId: patient.id,
                  type: 'DUPLICATE_TEST',
                  description: `Potential duplicate laboratory entry detected for ${exLab.testName}: identical value (${valA} ${inLab.unit || ''}) recorded in multiple reports.`,
                  severity: 'LOW',
                  confidence: 0.95,
                  sourceA: {
                    recordId: `in_dup_${inLab.testName}`,
                    documentId: documentId || null,
                    pageNumber: 1,
                    sourceText: inLab.sourceText || `${inLab.testName}: ${inLab.value} ${inLab.unit || ''}`,
                    value: valA,
                    field: 'Duplicate Laboratory Test',
                    provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                    timestamp: new Date().toISOString(),
                    unit: inLab.unit,
                  },
                  sourceB: {
                    recordId: exLab.id,
                    documentId: exLab.documentId || null,
                    pageNumber: exLab.sourcePageNumber || 1,
                    sourceText: exLab.sourceOriginalSnippet || `${exLab.testName}: ${exLab.measuredValue} ${exLab.unit || ''}`,
                    value: valB,
                    field: 'Duplicate Laboratory Test',
                    provenanceId: exLab.provenanceId || `prov_${exLab.id}`,
                    timestamp: exLab.createdAt ? new Date(exLab.createdAt).toISOString() : null,
                    unit: exLab.unit,
                  },
                })
              );
              continue;
            }

            // Check Significant Divergence using Configurable Rules
            const normKey = entityMatchingService.normalizeEntityName(inLab.testName);
            const rule = DEFAULT_LAB_RULES[normKey];

            let isSignificant = false;
            let diffPercent = 0;
            const minV = Math.min(valA, valB);
            const maxV = Math.max(valA, valB);
            const absDiff = Math.abs(valA - valB);

            if (minV > 0) {
              diffPercent = ((maxV - minV) / minV) * 100;
            }

            if (rule) {
              if (rule.relativeDifferencePercent && diffPercent >= rule.relativeDifferencePercent) {
                isSignificant = true;
              }
              if (rule.absoluteDifference && absDiff >= rule.absoluteDifference) {
                isSignificant = true;
              }
            } else {
              // Default threshold: 30% relative divergence
              if (diffPercent >= 30) isSignificant = true;
            }

            if (isSignificant) {
              conflicts.push(
                this.createConflict({
                  patientId: patient.id,
                  type: 'LAB_VALUE',
                  description: `Significant laboratory value divergence for ${exLab.testName}: Document reports ${valA} ${inLab.unit || ''} while prior record reports ${valB} ${exLab.unit || ''} (${diffPercent.toFixed(1)}% difference).`,
                  severity: diffPercent > 50 ? 'HIGH' : 'MEDIUM',
                  confidence: 0.93,
                  sourceA: {
                    recordId: `in_lab_${inLab.testName}`,
                    documentId: documentId || null,
                    pageNumber: 1,
                    sourceText: inLab.sourceText || `${inLab.testName}: ${inLab.value} ${inLab.unit || ''}`,
                    value: valA,
                    field: 'Laboratory Value',
                    provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
                    timestamp: new Date().toISOString(),
                    unit: inLab.unit,
                    referenceRange: inLab.referenceRange,
                    status: inLab.status,
                  },
                  sourceB: {
                    recordId: exLab.id,
                    documentId: exLab.documentId || null,
                    pageNumber: exLab.sourcePageNumber || 1,
                    sourceText: exLab.sourceOriginalSnippet || `${exLab.testName}: ${exLab.measuredValue} ${exLab.unit || ''}`,
                    value: valB,
                    field: 'Laboratory Value',
                    provenanceId: exLab.provenanceId || `prov_${exLab.id}`,
                    timestamp: exLab.createdAt ? new Date(exLab.createdAt).toISOString() : null,
                    unit: exLab.unit,
                    referenceRange: exLab.referenceRangeText,
                    status: exLab.interpretation,
                  },
                })
              );
            }
          }
        }
      }
    }

    return conflicts;
  }

  // --- 8. REPORT DATE INCONSISTENCY ---
  private detectReportDateConflicts(
    patient: PatientRecord,
    newExtraction?: ClinicalExtraction,
    documentId?: string,
    allDocuments: DocumentRecord[] = []
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const docDateStr = newExtraction?.reportMetadata?.reportDate || (newExtraction as any)?.metadata?.reportDate;
    if (!docDateStr) return conflicts;

    const docDate = new Date(docDateStr);
    const now = new Date();

    // Check future report date
    if (docDate.getTime() > now.getTime() + 24 * 3600 * 1000) {
      conflicts.push(
        this.createConflict({
          patientId: patient.id,
          type: 'REPORT_DATE',
          description: `Anomalous report date in future: Document lists report date as '${docDateStr}'.`,
          severity: 'MEDIUM',
          confidence: 0.95,
          sourceA: {
            recordId: `date_${docDateStr}`,
            documentId: documentId || null,
            pageNumber: 1,
            sourceText: `Report Date: ${docDateStr}`,
            value: docDateStr,
            field: 'Report Date',
            provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
            timestamp: new Date().toISOString(),
          },
          sourceB: {
            recordId: 'system_clock',
            documentId: null,
            pageNumber: null,
            sourceText: `Current System Time: ${now.toISOString().split('T')[0]}`,
            value: now.toISOString().split('T')[0],
            field: 'Current Time Reference',
            provenanceId: 'prov_system_clock',
            timestamp: now.toISOString(),
          },
        })
      );
    }

    // Check report date preceding patient birth
    if (patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth);
      if (docDate.getTime() < dob.getTime()) {
        conflicts.push(
          this.createConflict({
            patientId: patient.id,
            type: 'REPORT_DATE',
            description: `Impossible timeline: Report date '${docDateStr}' precedes patient date of birth '${patient.dateOfBirth}'.`,
            severity: 'HIGH',
            confidence: 0.98,
            sourceA: {
              recordId: `date_${docDateStr}`,
              documentId: documentId || null,
              pageNumber: 1,
              sourceText: `Report Date: ${docDateStr}`,
              value: docDateStr,
              field: 'Report Date',
              provenanceId: `prov_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
              timestamp: new Date().toISOString(),
            },
            sourceB: {
              recordId: patient.id,
              documentId: null,
              pageNumber: null,
              sourceText: `Patient DOB: ${patient.dateOfBirth}`,
              value: patient.dateOfBirth,
              field: 'Patient Date of Birth',
              provenanceId: `prov_patient_${patient.id}`,
              timestamp: patient.createdAt ? new Date(patient.createdAt).toISOString() : null,
            },
          })
        );
      }
    }

    return conflicts;
  }

  // Helper factory
  private createConflict(params: {
    patientId: string;
    type: ConflictType;
    description: string;
    severity: ConflictSeverity;
    confidence: number;
    sourceA: ConflictSource;
    sourceB: ConflictSource;
  }): Conflict {
    const id = `conf_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    return {
      id,
      patientId: params.patientId,
      type: params.type,
      description: params.description,
      severity: params.severity,
      detectionConfidence: params.confidence,
      sourceA: params.sourceA,
      sourceB: params.sourceB,
      detectedTimestamp: new Date().toISOString(),
      resolutionStatus: 'UNREVIEWED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const conflictDetectionEngine = ConflictDetectionEngine.getInstance();
