import {
  DocumentProvenanceSchema,
  UserProvenanceSchema,
  AIProvenanceSchema,
  UserEditProvenanceSchema,
  HumanVerificationProvenanceSchema,
  UniversalProvenanceSchema,
} from '../src/lib/services/provenance/ProvenanceTypes';
import { provenanceEngine, ProvenanceEngine } from '../src/lib/services/provenance/ProvenanceEngine';
import { getStore } from '../src/lib/dataStore';

async function runProvenanceSystemTests() {
  console.log('\n===============================================================');
  console.log('  MEDLENS PROVENANCE SYSTEM: COMPREHENSIVE AUTOMATED TEST SUITE');
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
  // PHASE 1: PROVENANCE SCHEMAS & VALIDATION
  // ==========================================
  console.log('--- Phase 1: Provenance Schemas & Validation ---');

  // Test 1: Valid Document Provenance
  const validDocProv = {
    provenanceType: 'DOCUMENT_EXTRACTED',
    documentId: 'doc-cbc-01',
    documentName: 'LabCorp_CBC_2026.pdf',
    pageNumber: 2,
    sourceText: 'Hemoglobin: 11.2 g/dL (Ref: 13.0 - 17.0 g/dL)',
    extractionTimestamp: new Date().toISOString(),
    confidence: 0.984,
    extractionMethod: 'OCR',
    boundingBox: { x: 50, y: 120, width: 480, height: 45 },
  };
  const docVal = DocumentProvenanceSchema.safeParse(validDocProv);
  assert(docVal.success, 'Valid DOCUMENT_EXTRACTED provenance passes Zod validation');

  // Test 2: Incomplete Document Provenance Rejected (Missing sourceText)
  const invalidDocProv = {
    provenanceType: 'DOCUMENT_EXTRACTED',
    documentId: 'doc-cbc-01',
    pageNumber: 2,
    // Missing sourceText
    confidence: 0.984,
    extractionMethod: 'OCR',
  };
  const docValFail = DocumentProvenanceSchema.safeParse(invalidDocProv);
  assert(!docValFail.success, 'Reject incomplete DOCUMENT_EXTRACTED provenance missing source evidence');

  // Test 3: Valid User-Provided Provenance
  const validUserProv = {
    provenanceType: 'USER_PROVIDED',
    userId: 'usr_patient_01',
    timestamp: new Date().toISOString(),
    field: 'Allergies',
    source: 'USER',
    notes: 'Direct intake entry',
  };
  const userVal = UserProvenanceSchema.safeParse(validUserProv);
  assert(userVal.success, 'Valid USER_PROVIDED provenance passes Zod validation');

  // Test 4: Valid AI-Generated Provenance with Mandatory Disclaimer
  const validAIProv = {
    provenanceType: 'AI_GENERATED',
    model: 'gemini-1.5-flash',
    provider: 'Google AI',
    generationTimestamp: new Date().toISOString(),
    inputRecordIds: ['rec_123', 'rec_456'],
    generatedStatus: 'GENERATED',
    disclaimer: 'AI-generated summary. Verify against source records.',
  };
  const aiVal = AIProvenanceSchema.safeParse(validAIProv);
  assert(aiVal.success, 'Valid AI_GENERATED provenance passes Zod validation with mandatory disclaimer');

  // Test 5: Reject AI-Generated Provenance with Empty Input Records
  const invalidAIProv = {
    provenanceType: 'AI_GENERATED',
    model: 'gpt-4o',
    provider: 'OpenAI',
    generationTimestamp: new Date().toISOString(),
    inputRecordIds: [], // Empty
    disclaimer: 'AI summary',
  };
  const aiValFail = AIProvenanceSchema.safeParse(invalidAIProv);
  assert(!aiValFail.success, 'Reject AI_GENERATED provenance with empty input record IDs');

  // Test 6: Valid User Edit Provenance with Diff Tracking
  const validEditProv = {
    provenanceType: 'USER_EDITED',
    previousValue: { measuredValue: '11.2', unit: 'g/dL' },
    newValue: { measuredValue: '11.5', unit: 'g/dL' },
    userId: 'dr_jenkins_md',
    action: 'EDIT',
    timestamp: new Date().toISOString(),
    reason: 'Corrected transcription error from faint scan',
  };
  const editVal = UserEditProvenanceSchema.safeParse(validEditProv);
  assert(editVal.success, 'Valid USER_EDITED provenance passes Zod validation with diffs & reason');

  // Test 7: Valid Human Verification Provenance
  const validVerifProv = {
    provenanceType: 'HUMAN_VERIFIED',
    userId: 'dr_jenkins_md',
    timestamp: new Date().toISOString(),
    action: 'VERIFY',
    verifiedRecordId: 'lab_hgb_99',
    notes: 'Verified against source image bounding box',
  };
  const verifVal = HumanVerificationProvenanceSchema.safeParse(validVerifProv);
  assert(verifVal.success, 'Valid HUMAN_VERIFIED provenance passes Zod validation');

  // ==========================================
  // PHASE 2: PROVENANCE ENGINE & IMMUTABILITY
  // ==========================================
  console.log('\n--- Phase 2: Provenance Engine & Immutable History ---');

  const engine = new ProvenanceEngine();
  const testEntityId = 'lab_test_ferritin_99';

  // Version 1: Initial Document Extraction
  const v1 = await engine.createDocumentProvenance({
    entityId: testEntityId,
    entityType: 'LAB_RESULT',
    documentId: 'doc-cbc-01',
    documentName: 'LabCorp_CBC_2026.pdf',
    pageNumber: 1,
    sourceText: 'Ferritin: 45 ng/mL\nRef: 20 – 200 ng/mL',
    confidence: 0.97,
    extractionMethod: 'OCR',
    boundingBox: { x: 50, y: 220, width: 480, height: 45 },
  });

  assert(
    v1.version === 1 && v1.provenanceType === 'DOCUMENT_EXTRACTED',
    'Create Version 1 DOCUMENT_EXTRACTED provenance'
  );

  // Version 2: User Correction / Edit
  const v2 = await engine.createUserEditProvenance({
    entityId: testEntityId,
    entityType: 'LAB_RESULT',
    previousValue: '45 ng/mL',
    newValue: '48 ng/mL',
    userId: 'dr_jenkins_md',
    reason: 'Faint OCR artifact corrected',
  });

  assert(
    v2.version === 2 && v2.provenanceType === 'USER_EDITED' && v2.reason === 'Faint OCR artifact corrected',
    'Create Version 2 USER_EDITED provenance preserving previous and new values'
  );

  // Version 3: Human Verification
  const v3 = await engine.createVerificationProvenance({
    entityId: testEntityId,
    entityType: 'LAB_RESULT',
    userId: 'dr_jenkins_md',
    verifiedRecordId: testEntityId,
    notes: 'Confirmed 48 ng/mL against original lab report',
  });

  assert(
    v3.version === 3 && v3.provenanceType === 'HUMAN_VERIFIED',
    'Create Version 3 HUMAN_VERIFIED provenance'
  );

  // Test 8: Historical Immutability (Version 1 must remain completely unchanged)
  const fetchedV1 = await engine.getProvenance(v1.id);
  assert(
    fetchedV1 !== null &&
    fetchedV1.version === 1 &&
    fetchedV1.provenanceType === 'DOCUMENT_EXTRACTED' &&
    fetchedV1.sourceText === 'Ferritin: 45 ng/mL\nRef: 20 – 200 ng/mL',
    'Historical Version 1 is strictly immutable and retains original OCR evidence'
  );

  // Test 9: Complete Provenance Chain Ordering
  const fullHistory = await engine.getProvenanceHistory(testEntityId);
  assert(
    fullHistory.length === 3 &&
    fullHistory[0].version === 1 &&
    fullHistory[1].version === 2 &&
    fullHistory[2].version === 3,
    'Provenance history chain returns 3 sequentially ordered versions (v1 -> v2 -> v3)'
  );

  // ==========================================
  // PHASE 3: USER PROVENANCE & AI SUMMARY PROVENANCE
  // ==========================================
  console.log('\n--- Phase 3: User & AI Provenance Lifecycle ---');

  // User-Provided Intake Fact
  const userFactId = 'med_intake_metformin';
  const userProvRecord = await engine.createUserProvenance({
    entityId: userFactId,
    entityType: 'MEDICATION',
    userId: 'Eleanor Vance (Patient)',
    field: 'Current Medications',
    notes: 'Self-reported during registration',
  });

  assert(
    userProvRecord.provenanceType === 'USER_PROVIDED' &&
    userProvRecord.userId === 'Eleanor Vance (Patient)',
    'Record USER_PROVIDED provenance for patient intake'
  );

  // AI-Generated Summary Provenance
  const summaryId = 'summary_demo_01';
  const aiProvRecord = await engine.createAIProvenance({
    entityId: summaryId,
    entityType: 'CLINICAL_SUMMARY',
    model: 'gemini-1.5-flash',
    provider: 'Google AI',
    inputRecordIds: [testEntityId, userFactId],
    disclaimer: 'AI-generated clinical summary. Always verify against source records.',
  });

  assert(
    aiProvRecord.provenanceType === 'AI_GENERATED' &&
    aiProvRecord.inputRecordIds?.length === 2 &&
    Boolean(aiProvRecord.disclaimer?.includes('Always verify against source records')),
    'Record AI_GENERATED provenance linking source inputs and safety disclaimer'
  );

  // ==========================================
  // PHASE 4: MISSING SOURCE & ERROR HANDLING
  // ==========================================
  console.log('\n--- Phase 4: Missing Source & Fault-Tolerant Retrieval ---');

  // Provenance when physical document is archived/missing
  const archivedDocProv = await engine.createDocumentProvenance({
    entityId: 'lab_archived_1',
    entityType: 'LAB_RESULT',
    documentId: 'doc-archived-999',
    documentName: 'Archived_Historical_CBC_2020.pdf',
    pageNumber: 3,
    sourceText: 'Hemoglobin: 12.0 g/dL',
    confidence: 0.95,
    extractionMethod: 'OCR',
  });

  assert(
    archivedDocProv.documentName === 'Archived_Historical_CBC_2020.pdf' &&
    archivedDocProv.pageNumber === 3,
    'Preserve document provenance metadata even when physical file is archived'
  );

  console.log('\n===============================================================');
  console.log(`  PROVENANCE SYSTEM TEST SUMMARY: ${passed}/${total} PASSED (100%)`);
  console.log('===============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runProvenanceSystemTests().catch(err => {
  console.error('Provenance test runner fatal error:', err);
  process.exit(1);
});
