import { getStore } from '../src/lib/dataStore';
import { VerificationService } from '../src/lib/services/verification/VerificationService';
import { ProvenanceEngine } from '../src/lib/services/provenance/ProvenanceEngine';
import {
  VerificationTask,
  VerificationTaskStatus,
  VerificationRequirementReason,
} from '../src/types/clinical';

async function runVerificationEngineTests() {
  console.log('\n===============================================================');
  console.log('  MEDLENS HUMAN VERIFICATION & REVIEW ENGINE: TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  const store = getStore();

  // ==========================================
  // PHASE 1: EMPTY DATABASE & ZERO DUMMY DATA
  // ==========================================
  console.log('--- Phase 1: Zero Dummy Data Verification ---');

  // Verify initially tasks return an array
  const initialTasks = await VerificationService.getTasks();
  assert(
    Array.isArray(initialTasks),
    'VerificationService.getTasks returns an array'
  );

  // Check that no dummy patients or fake names are seeded
  const patients = Array.from(store.patients.values());
  const hasDummyNames = patients.some(
    (p) =>
      p.fullName.includes('Eleanor Vance') ||
      p.identifier === 'ML-98214' ||
      p.fullName.includes('Demo Patient')
  );
  assert(!hasDummyNames, 'No hardcoded dummy patients (Eleanor Vance / ML-98214) in store');

  // Check no dummy lab values in store
  const labs = Array.from(store.labResults.values());
  const hasDummyLabs = labs.some(
    (l) => l.testName === 'Hemoglobin' && l.measuredValue === '11.2' && (l.provenanceSource as any) === 'MOCK'
  );
  assert(!hasDummyLabs, 'No hardcoded fake lab values seeded in store');

  // ==========================================
  // PHASE 2: DETERMINISTIC VERIFICATION REQUIREMENT LOGIC
  // ==========================================
  console.log('\n--- Phase 2: Verification Requirement Logic ---');

  // Test 1: Low Confidence (< 90%) requires review
  const lowConfDecision = VerificationService.evaluateVerificationRequirement({
    confidence: 0.82,
    interpretation: 'NORMAL',
  });
  assert(
    lowConfDecision.requiresReview === true &&
      lowConfDecision.reason === 'LOW_EXTRACTION_CONFIDENCE',
    'Low confidence (<0.90) triggers LOW_EXTRACTION_CONFIDENCE'
  );

  // Test 2: Undetermined Reference Range requires review
  const undeterminedRangeDecision = VerificationService.evaluateVerificationRequirement({
    confidence: 0.98,
    interpretation: 'UNDETERMINED',
    hasReferenceRange: true,
  });
  assert(
    undeterminedRangeDecision.requiresReview === true &&
      undeterminedRangeDecision.reason === 'REFERENCE_RANGE_UNDETERMINED',
    'Undetermined reference range triggers REFERENCE_RANGE_UNDETERMINED'
  );

  // Test 3: Missing Source Evidence requires review
  const missingEvidenceDecision = VerificationService.evaluateVerificationRequirement({
    confidence: 0.95,
    sourceEvidenceMissing: true,
  });
  assert(
    missingEvidenceDecision.requiresReview === true &&
      missingEvidenceDecision.reason === 'MISSING_SOURCE_EVIDENCE',
    'Missing source evidence snippet triggers MISSING_SOURCE_EVIDENCE'
  );

  // Test 4: Detected Conflict requires review
  const conflictDecision = VerificationService.evaluateVerificationRequirement({
    confidence: 0.98,
    hasConflicts: true,
  });
  assert(
    conflictDecision.requiresReview === true &&
      conflictDecision.reason === 'CONFLICT_DETECTED',
    'Detected clinical conflict triggers CONFLICT_DETECTED'
  );

  // ==========================================
  // PHASE 3: REAL EXTRACTION → VERIFICATION TASK LIFECYCLE
  // ==========================================
  console.log('\n--- Phase 3: Real Extraction → Verification Task Lifecycle ---');

  // 1. Create a real patient
  const testPatient = await store.createPatient({
    identifier: 'REAL-TEST-MRN-901',
    fullName: 'David R. Miller',
    sex: 'MALE',
  });
  assert(Boolean(testPatient.id), 'Created real patient David R. Miller for intake test');

  // 2. Register a real source document
  const testDoc = await store.addDocument({
    patientId: testPatient.id,
    originalFileName: 'Metabolic_Panel_Report_2026.pdf',
    documentType: 'LAB_REPORT',
    processingStatus: 'COMPLETED',
    fileSizeBytes: 245000,
    fileHashSha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
    rawExtractedText: 'Comprehensive Metabolic Panel\nGlucose: 145 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]\nPotassium: 4.1 mEq/L (Ref: 3.5 - 5.0 mEq/L)',
  });
  assert(Boolean(testDoc.id), 'Saved real source document with raw extracted text');

  // 3. Save a lab result with high glucose and low confidence (triggers verification)
  const realLab = await store.addLabResult({
    patientId: testPatient.id,
    documentId: testDoc.id,
    testName: 'Serum Glucose',
    measuredValue: '145',
    unit: 'mg/dL',
    referenceRangeText: '70 - 99 mg/dL',
    confidenceScore: 0.85, // < 90% confidence
    sourceOriginalSnippet: 'Glucose: 145 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]',
    sourcePageNumber: 1,
    verificationStatus: 'UNVERIFIED',
  });
  assert(Boolean(realLab.id), 'Saved unverified Serum Glucose lab result with 85% confidence');

  // 4. Sync tasks and retrieve the created verification task
  await store.syncVerificationTasks();
  const patientTasks = await VerificationService.getTasks({ patientId: testPatient.id });
  const glucoseTask = patientTasks.find((t) => t.recordId === realLab.id);

  assert(Boolean(glucoseTask), 'Verification task created for Serum Glucose record');
  assert(glucoseTask?.status === 'PENDING_REVIEW', 'Initial verification task status is PENDING_REVIEW');
  assert(
    glucoseTask?.reason === 'LOW_EXTRACTION_CONFIDENCE',
    'Task reason is correctly LOW_EXTRACTION_CONFIDENCE'
  );

  // ==========================================
  // PHASE 4: TASK OPENING & START (IN_REVIEW)
  // ==========================================
  console.log('\n--- Phase 4: Verification Review Workflow (Start / Open) ---');

  if (glucoseTask) {
    const startedTask = await store.startVerification(glucoseTask.id, 'Dr. Sarah Jenkins, MD');
    assert(startedTask?.status === 'IN_REVIEW', 'startVerification transitions task status to IN_REVIEW');

    const historyAfterStart = await store.getVerificationHistory(glucoseTask.id);
    const startAction = historyAfterStart.find((a) => a.action === 'VERIFICATION_OPENED');
    assert(Boolean(startAction), 'VERIFICATION_OPENED action logged in verification history');
  }

  // ==========================================
  // PHASE 5: ACCEPT ACTION & PROVENANCE IMMUTABILITY
  // ==========================================
  console.log('\n--- Phase 5: Verification Accept Action ---');

  // Create another lab test to accept: Potassium (Normal)
  const potassiumLab = await store.addLabResult({
    patientId: testPatient.id,
    documentId: testDoc.id,
    testName: 'Serum Potassium',
    measuredValue: '4.1',
    unit: 'mEq/L',
    referenceRangeText: '3.5 - 5.0 mEq/L',
    confidenceScore: 0.88,
    sourceOriginalSnippet: 'Potassium: 4.1 mEq/L (Ref: 3.5 - 5.0 mEq/L)',
    sourcePageNumber: 1,
    verificationStatus: 'UNVERIFIED',
  });
  await store.syncVerificationTasks();

  const potassiumTasks = await VerificationService.getTasks({ patientId: testPatient.id });
  const potTask = potassiumTasks.find((t) => t.recordId === potassiumLab.id);
  assert(Boolean(potTask), 'Potassium verification task exists');

  if (potTask) {
    const acceptRes = await store.acceptVerification(potTask.id, {
      userId: 'Dr. Sarah Jenkins, MD',
      notes: 'Verified concordant with document page 1',
    });
    assert(acceptRes?.task?.status === 'VERIFIED', 'acceptVerification transitions task to VERIFIED');

    const verifiedLab = store.labResults.get(potassiumLab.id);
    assert(verifiedLab?.verificationStatus === 'VERIFIED', 'Underlying lab record verificationStatus is now VERIFIED');
    assert(verifiedLab?.verifiedBy === 'Dr. Sarah Jenkins, MD', 'Underlying lab record stores verifiedBy clinician');

    // Check HUMAN_VERIFIED provenance
    assert(Boolean(verifiedLab?.provenanceId), 'Verified lab has a valid provenanceId');

    // Check Verification Action history
    const history = await store.getVerificationHistory(potTask.id);
    const acceptAction = history.find((a) => a.action === 'RECORD_ACCEPTED');
    assert(Boolean(acceptAction), 'RECORD_ACCEPTED action logged in verification history');
  }

  // ==========================================
  // PHASE 6: CLINICIAN EDIT ACTION & DIFFS
  // ==========================================
  console.log('\n--- Phase 6: Clinician Edit Action & Diffs ---');

  if (glucoseTask) {
    const editRes = await store.editVerification(glucoseTask.id, {
      editedValues: { measuredValue: '142', unit: 'mg/dL' },
      userId: 'Dr. Sarah Jenkins, MD',
      reason: 'Corrected extraction artifact: digit 5 misread from handwritten note as 2',
    });

    assert(editRes?.task?.status === 'EDITED', 'editVerification transitions task to EDITED');

    const updatedLab = store.labResults.get(realLab.id);
    assert(updatedLab?.measuredValue === '142', 'Underlying lab record updated with clinician new value (142)');
    assert(updatedLab?.verificationStatus === 'EDITED', 'Underlying lab record verificationStatus set to EDITED');

    // Check history and diff
    const history = await store.getVerificationHistory(glucoseTask.id);
    const editAction = history.find((a) => a.action === 'RECORD_EDITED');
    assert(Boolean(editAction), 'RECORD_EDITED action logged in verification history');
    assert(
      (editAction?.previousValue as any)?.measuredValue === '145',
      `Audit record preserves previousValue ('145')`
    );
    assert(
      (editAction?.newValue as any)?.measuredValue === '142',
      `Audit record preserves newValue ('142')`
    );
    assert(
      editAction?.reason?.includes('misread') ?? false,
      'Audit record logs clinician justification for edit'
    );
  }

  // ==========================================
  // PHASE 7: REJECT ACTION & MANDATORY REASON
  // ==========================================
  console.log('\n--- Phase 7: Clinician Reject Action & Mandatory Reason ---');

  // Save an artifactual record to reject
  const falseEntity = await store.addMedication({
    patientId: testPatient.id,
    documentId: testDoc.id,
    drugName: 'Unrecognized Chemical Ingest',
    dosage: '100mg',
    confidenceScore: 0.65,
    verificationStatus: 'UNVERIFIED',
  });
  await store.syncVerificationTasks();

  const medTasks = await VerificationService.getTasks({ patientId: testPatient.id });
  const falseMedTask = medTasks.find((t) => t.recordId === falseEntity.id);
  assert(Boolean(falseMedTask), 'Verification task created for unrecognized entity');

  if (falseMedTask) {
    // 1. Verify rejection without reason throws an error
    let thrownError = false;
    try {
      await store.rejectVerification(falseMedTask.id, {
        userId: 'Dr. Sarah Jenkins, MD',
        reason: '',
      });
    } catch (e) {
      thrownError = true;
    }
    assert(thrownError, 'rejectVerification strictly throws error if reason is empty');

    // 2. Reject with valid reason
    const rejectRes = await store.rejectVerification(falseMedTask.id, {
      userId: 'Dr. Sarah Jenkins, MD',
      reason: 'Wrong entity',
    });
    assert(rejectRes?.task?.status === 'REJECTED', 'rejectVerification transitions task to REJECTED');

    const rejectedMed = store.medications.get(falseEntity.id);
    assert(rejectedMed?.verificationStatus === 'REJECTED', 'Underlying record marked as REJECTED');

    const history = await store.getVerificationHistory(falseMedTask.id);
    const rejectAction = history.find((a) => a.action === 'RECORD_REJECTED');
    assert(Boolean(rejectAction), 'RECORD_REJECTED action logged in verification history');
    assert(rejectAction?.reason === 'Wrong entity', 'Rejection reason correctly recorded in audit');
  }

  // ==========================================
  // PHASE 8: CONFLICT REVIEW & RESOLUTION
  // ==========================================
  console.log('\n--- Phase 8: Conflict Review & Clinician Resolution ---');

  // Create a real conflict
  const conflict = await store.addConflict({
    patientId: testPatient.id,
    conflictType: 'LAB_NUMERICAL_DISCREPANCY',
    severity: 'HIGH',
    description: 'Glucose recorded as 142 mg/dL in Lab 1 vs 85 mg/dL in Lab 2 within 1 hour',
    sourceA: {
      documentId: testDoc.id,
      documentName: 'Metabolic_Panel_Report_2026.pdf',
      pageNumber: 1,
      snippet: 'Glucose: 142 mg/dL',
      value: '142 mg/dL',
      recordId: realLab.id,
    },
    sourceB: {
      documentId: 'doc_bedside_01',
      documentName: 'Bedside_PointOfCare_2026.pdf',
      pageNumber: 1,
      snippet: 'POC Glucose: 85 mg/dL',
      value: '85 mg/dL',
      recordId: 'rec_poc_01',
    },
    resolutionStatus: 'UNREVIEWED',
    requiresHumanVerification: true,
  });
  await store.syncVerificationTasks();

  const conflictTasks = await VerificationService.getTasks({ patientId: testPatient.id });
  const confTask = conflictTasks.find((t) => t.recordId === conflict.id);
  assert(Boolean(confTask), 'Verification task created for clinical conflict');
  assert(confTask?.reason === 'CONFLICT_DETECTED', 'Conflict task reason is CONFLICT_DETECTED');

  // Resolve conflict with ACCEPT_SOURCE_A
  const resolvedConflict = await store.resolveConflict(conflict.id, {
    decision: 'ACCEPT_SOURCE_A',
    reviewerId: 'Dr. Sarah Jenkins, MD',
    reason: 'Confirmed laboratory venous blood draw takes precedence over POC capillary meter',
    selectedRecordId: realLab.id,
  });
  assert(
    resolvedConflict?.resolutionStatus === 'RESOLVED',
    'Conflict status transitioned to RESOLVED'
  );

  // ==========================================
  // PHASE 9: DYNAMIC SUMMARY STATS
  // ==========================================
  console.log('\n--- Phase 9: Dynamic Summary Stats ---');

  const stats = await store.getSummaryStats();
  assert(typeof stats.totalPatients === 'number', 'Stats contains totalPatients count');
  assert(typeof stats.totalDocuments === 'number', 'Stats contains totalDocuments count');
  assert(typeof stats.pendingVerification === 'number', 'Stats contains pendingVerification count');
  assert(typeof stats.activeConflicts === 'number', 'Stats contains activeConflicts count');

  // ==========================================
  // TEST SUITE SUMMARY
  // ==========================================
  console.log('\n===============================================================');
  console.log(`  VERIFICATION ENGINE TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================\n');

  if (passed === total) {
    console.log('  ALL HUMAN VERIFICATION & REVIEW ENGINE TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`  ${total - passed} TESTS FAILED.`);
    process.exit(1);
  }
}

runVerificationEngineTests().catch((err) => {
  console.error('Fatal error during verification test run:', err);
  process.exit(1);
});
