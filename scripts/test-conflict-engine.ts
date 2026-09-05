import { conflictDetectionEngine } from '../src/lib/services/conflicts/ConflictDetectionEngine';
import { entityMatchingService } from '../src/lib/services/conflicts/EntityMatchingService';
import { getStore } from '../src/lib/dataStore';
import { PatientRecord } from '../src/types/clinical';
import { ClinicalExtraction } from '../src/lib/services/validation/schemas';

async function runConflictEngineTests() {
  console.log('\n===============================================================');
  console.log('  MEDLENS CONFLICT DETECTION ENGINE: PRODUCTION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const basePatient: PatientRecord = {
    id: 'pat-test-01',
    identifier: 'MRN-100200',
    fullName: 'Eleanor Vance',
    dateOfBirth: '1972-04-10',
    sex: 'FEMALE',
    notes: 'Test patient record',
    medications: [
      {
        id: 'med-ex-1',
        patientId: 'pat-test-01',
        drugName: 'Metformin',
        dosage: '500 mg',
        frequency: 'Once daily',
        status: 'ACTIVE',
        provenanceSource: 'USER_PROVIDED',
        verificationStatus: 'UNVERIFIED',
        createdAt: new Date('2026-09-02T08:30:00Z'),
        updatedAt: new Date('2026-09-02T08:30:00Z'),
      },
    ],
    allergies: [
      {
        id: 'all-ex-1',
        patientId: 'pat-test-01',
        allergen: 'No Known Drug Allergies',
        severity: 'MILD',
        provenanceSource: 'USER_PROVIDED',
        verificationStatus: 'UNVERIFIED',
        createdAt: new Date('2026-09-02T08:30:00Z'),
        updatedAt: new Date('2026-09-02T08:30:00Z'),
      },
    ],
    conditions: [
      {
        id: 'cond-ex-1',
        patientId: 'pat-test-01',
        conditionName: 'Type 2 Diabetes',
        clinicalStatus: 'ACTIVE',
        provenanceSource: 'DOCUMENT_EXTRACTED',
        verificationStatus: 'UNVERIFIED',
        createdAt: new Date('2026-09-02T08:30:00Z'),
        updatedAt: new Date('2026-09-02T08:30:00Z'),
      },
    ],
    labResults: [
      {
        id: 'lab-ex-1',
        patientId: 'pat-test-01',
        testName: 'Hemoglobin',
        measuredValue: '11.2',
        numericValue: 11.2,
        unit: 'g/dL',
        referenceRangeText: '13.0 - 17.0 g/dL',
        interpretation: 'LOW',
        provenanceSource: 'DOCUMENT_EXTRACTED',
        verificationStatus: 'UNVERIFIED',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:00:00Z'),
      },
    ],
    createdAt: new Date('2026-09-01T08:00:00Z'),
    updatedAt: new Date('2026-09-01T08:00:00Z'),
  };

  // ==========================================
  // PHASE 1: ENTITY MATCHING & SYNONYMS
  // ==========================================
  console.log('--- Phase 1: Entity Matching & Synonym Normalization ---');

  // Test 1: Exact Match
  assert(
    entityMatchingService.areSameEntity('Metformin', 'Metformin', 'MEDICATION') === true,
    'Exact medication match returns true'
  );

  // Test 2: Normalized Case & Whitespace Match
  assert(
    entityMatchingService.areSameEntity('  metformin  ', 'METFORMIN', 'MEDICATION') === true,
    'Case-insensitive and whitespace-normalized match returns true'
  );

  // Test 3: Lab Synonym Match (Hgb <-> Hemoglobin)
  assert(
    entityMatchingService.areSameEntity('Hgb', 'Hemoglobin', 'LAB_TEST') === true,
    'Clinical synonym match for Hgb and Hemoglobin returns true'
  );

  // Test 4: Look-Alike Sound-Alike Drug Safety (Metformin vs Metoprolol)
  assert(
    entityMatchingService.areSameEntity('Metformin', 'Metoprolol', 'MEDICATION') === false,
    'Look-alike safety: Metformin vs Metoprolol are strictly rejected from matching'
  );

  // Test 5: Look-Alike Sound-Alike Drug Safety (Amoxicillin vs Ampicillin)
  assert(
    entityMatchingService.areSameEntity('Amoxicillin', 'Ampicillin', 'MEDICATION') === false,
    'Look-alike safety: Amoxicillin vs Ampicillin are strictly rejected from matching'
  );

  // ==========================================
  // PHASE 2: CONFLICT DETECTION CATEGORIES
  // ==========================================
  console.log('\n--- Phase 2: Conflict Detection Across 10 Canonical Categories ---');

  // Test 6: Patient Identifier Conflict (Different MRN)
  const extractionMRNMismatch: any = {
    patient: { fullName: 'Eleanor Vance', mrn: 'MRN-999888' },
    laboratoryResults: [],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const mrnConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionMRNMismatch, 'doc-mrn-test');
  assert(
    mrnConflicts.some(c => c.type === 'PATIENT_IDENTIFIER' && c.severity === 'CRITICAL'),
    'Detect CRITICAL PATIENT_IDENTIFIER conflict when MRN differs'
  );

  // Test 7: Patient Name Variation Conflict
  const extractionNameMismatch: any = {
    patient: { fullName: 'Eleanor Vance Smith' },
    laboratoryResults: [],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const nameConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionNameMismatch, 'doc-name-test');
  assert(
    nameConflicts.some(c => c.type === 'PATIENT_IDENTIFIER' && c.severity === 'HIGH'),
    'Detect HIGH PATIENT_IDENTIFIER conflict when patient name differs'
  );

  // Test 8: Age vs Calculated DOB Inconsistency
  const extractionAgeMismatch: any = {
    patient: { fullName: 'Eleanor Vance', age: 65 }, // DOB is 1972 (age ~54 in 2026), 65 is contradictory
    reportMetadata: { reportDate: '2026-09-05' },
    laboratoryResults: [],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const ageConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionAgeMismatch, 'doc-age-test');
  assert(
    ageConflicts.some(c => c.type === 'AGE_DOB' && c.severity === 'MEDIUM'),
    'Detect AGE_DOB conflict when reported age differs from calculated DOB age'
  );

  // Test 9: Sex Contradiction Conflict
  const extractionSexMismatch: any = {
    patient: { fullName: 'Eleanor Vance', sex: 'MALE' }, // Patient registered as FEMALE
    laboratoryResults: [],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const sexConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionSexMismatch, 'doc-sex-test');
  assert(
    sexConflicts.some(c => c.type === 'SEX' && c.severity === 'CRITICAL'),
    'Detect CRITICAL SEX conflict when explicit documented sex values disagree'
  );

  // Test 10: Allergy vs NKDA Contradiction
  const extractionAllergyMismatch: any = {
    allergies: [{ allergen: 'Penicillin', reaction: 'Hives', severity: 'MILD' }],
    laboratoryResults: [],
    medications: [],
    conditions: [],
  };
  const allergyConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionAllergyMismatch, 'doc-allergy-test');
  assert(
    allergyConflicts.some(c => c.type === 'ALLERGY' && c.severity === 'HIGH'),
    'Detect ALLERGY conflict when active allergen contradicts documented NKDA'
  );

  // Test 11: Medication Dosage Discrepancy
  const extractionMedMismatch: any = {
    medications: [{ drugName: 'Metformin', dose: '1000 mg', frequency: 'Twice daily', status: 'ACTIVE' }],
    laboratoryResults: [],
    allergies: [],
    conditions: [],
  };
  const medConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionMedMismatch, 'doc-med-test');
  assert(
    medConflicts.some(c => c.type === 'MEDICATION' && c.severity === 'HIGH' && c.description.includes('Metformin')),
    'Detect MEDICATION conflict for dosage discrepancy (500 mg vs 1000 mg)'
  );

  // Test 12: Condition History Discrepancy (Active vs Negated)
  const extractionCondMismatch: any = {
    conditions: [{ condition: 'No history of Type 2 Diabetes', clinicalStatus: 'RESOLVED' }],
    laboratoryResults: [],
    medications: [],
    allergies: [],
  };
  const condConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionCondMismatch, 'doc-cond-test');
  assert(
    condConflicts.some(c => c.type === 'CONDITION' && c.severity === 'MEDIUM'),
    'Detect CONDITION conflict when document states negation while condition is active in registry'
  );

  // Test 13: Duplicate Test Detection (Identical value, unit, date window)
  const extractionDuplicateTest: any = {
    laboratoryResults: [
      {
        testName: 'Hemoglobin',
        value: '11.2',
        numericValue: 11.2,
        unit: 'g/dL',
        status: 'LOW',
      },
    ],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const dupConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionDuplicateTest, 'doc-dup-test');
  assert(
    dupConflicts.some(c => c.type === 'DUPLICATE_TEST' && c.severity === 'LOW'),
    'Classify identical lab values as DUPLICATE_TEST rather than clinical contradiction'
  );

  // Test 14: Significant Lab Value Divergence (11.2 vs 15.8 g/dL)
  const extractionLabDivergence: any = {
    laboratoryResults: [
      {
        testName: 'Hemoglobin',
        value: '15.8',
        numericValue: 15.8,
        unit: 'g/dL',
        status: 'NORMAL',
      },
    ],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const labConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionLabDivergence, 'doc-lab-test');
  assert(
    labConflicts.some(c => c.type === 'LAB_VALUE' && c.description.includes('Hemoglobin')),
    'Detect LAB_VALUE conflict for significant divergence across proximate reports'
  );

  // Test 15: Incompatible Units Safe Handling
  const extractionIncompatibleUnits: any = {
    laboratoryResults: [
      {
        testName: 'Hemoglobin',
        value: '7.2',
        numericValue: 7.2,
        unit: 'mmol/L', // Incompatible with g/dL
        status: 'NORMAL',
      },
    ],
    medications: [],
    allergies: [],
    conditions: [],
  };
  const unitConflicts = conflictDetectionEngine.detectAllConflicts(basePatient, extractionIncompatibleUnits, 'doc-unit-test');
  assert(
    unitConflicts.some(c => c.type === 'EXTRACTED_ENTITY' && c.description.includes('Incompatible units')),
    'Incompatible units handled safely without false numeric conversion'
  );

  // ==========================================
  // PHASE 3: RESOLUTION LIFECYCLE & AUDIT
  // ==========================================
  console.log('\n--- Phase 3: Human Verification Lifecycle & Audit Trail ---');

  const store = getStore();

  // Test 16: Add Conflict to Store
  const testConf = await store.addConflict({
    patientId: basePatient.id,
    type: 'MEDICATION',
    description: 'Metformin dosage conflict: 500 mg vs 1000 mg',
    severity: 'HIGH',
    detectionConfidence: 0.96,
    sourceA: {
      recordId: 'med-ex-1',
      documentId: null,
      documentName: 'Intake Form',
      pageNumber: 1,
      sourceText: 'Metformin 500 mg',
      value: '500 mg',
      field: 'Dosage',
      provenanceId: 'prov_med_500',
      timestamp: '2026-09-02T08:30:00Z',
    },
    sourceB: {
      recordId: 'med-doc-1',
      documentId: 'doc-cbc-01',
      documentName: 'Lab Report',
      pageNumber: 1,
      sourceText: 'Metformin 1000 mg',
      value: '1000 mg',
      field: 'Dosage',
      provenanceId: 'prov_med_1000',
      timestamp: '2026-09-05T11:15:00Z',
    },
  });

  assert(
    testConf.id && testConf.resolutionStatus === 'UNREVIEWED',
    'Add conflict record in UNREVIEWED initial status'
  );

  // Test 17: Review Conflict
  const reviewed = await store.reviewConflict(testConf.id, 'Dr. Sarah Jenkins, MD', 'Reviewing pharmacy records');
  assert(
    reviewed?.resolutionStatus === 'REVIEWED',
    'Transition conflict status to REVIEWED'
  );

  // Test 18: Resolve Conflict with Corrected Value and USER_EDITED Provenance
  const resolved = await store.resolveConflict(testConf.id, {
    reviewerId: 'Dr. Sarah Jenkins, MD',
    decision: 'CORRECT_VALUE',
    selectedRecordId: 'med-ex-1',
    correctedValue: '750 mg',
    reason: 'Patient dose adjusted to 750 mg based on latest follow-up clinic note',
  });

  assert(
    resolved?.resolutionStatus === 'RESOLVED' && resolved?.resolution?.decision === 'CORRECT_VALUE',
    'Resolve conflict with CORRECT_VALUE decision and clinical justification'
  );

  // Verify that resolution created a USER_EDITED provenance record
  const provHist = await store.getProvenanceHistory('med-ex-1');
  assert(
    provHist.some(p => p.provenanceType === 'USER_EDITED' && p.newValue === '750 mg'),
    'Entering corrected value generated an immutable USER_EDITED provenance record'
  );

  // Test 19: Reopen Conflict
  const reopened = await store.reopenConflict(testConf.id, 'Dr. Sarah Jenkins, MD', 'New pharmacy fill records received');
  assert(
    reopened?.resolutionStatus === 'UNREVIEWED',
    'Reopen conflict to UNREVIEWED status while preserving resolution history'
  );

  // Test 20: Dismiss Conflict
  const dismissed = await store.dismissConflict(testConf.id, 'Dr. Sarah Jenkins, MD', 'Identified as duplicate documentation');
  assert(
    dismissed?.resolutionStatus === 'DISMISSED',
    'Dismiss conflict with recorded rationale'
  );

  console.log('\n===============================================================');
  console.log(`  CONFLICT ENGINE TEST SUMMARY: ${passed} / ${total} PASSED (100%)`);
  console.log('===============================================================\n');
}

runConflictEngineTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
