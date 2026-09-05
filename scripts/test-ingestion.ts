import { MedLensIngestionEngine } from '../src/lib/ingestion/ingestionEngine';
import { 
  validateFileType, 
  validateFileSize, 
  sanitizeFileName, 
  computeSha256, 
  isSecureStoragePath,
  saveUploadedFile,
  readUploadedFile,
  MAX_FILE_SIZE_BYTES
} from '../src/lib/storage/secureStorage';
import { PatientIntakeFormSchema, DirectTextInputSchema } from '../src/lib/validation/schemas';
import { getStore } from '../src/lib/dataStore';
import path from 'path';

async function runIngestionTests() {
  console.log('\n===============================================================');
  console.log('  MEDLENS INGESTION ENGINE: COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  const store = getStore();

  // Create or retrieve a test patient for tests
  const testPatient = await store.createPatient({
    identifier: `MRN-TEST-${Date.now().toString().slice(-6)}`,
    fullName: 'Test Eleanor Vance',
    dateOfBirth: new Date('1972-04-14'),
    sex: 'FEMALE',
    bloodType: 'A+',
    contactNumber: '+1 555 0192',
    notes: 'Ingestion test fixture patient profile',
  });

  console.log(`[SETUP] Created test patient: ${testPatient.fullName} (${testPatient.identifier}, ID: ${testPatient.id})\n`);

  // ==========================================
  // PHASE 1: FILE VALIDATION & SECURITY CHECKS
  // ==========================================
  console.log('--- PHASE 1: Storage Layer & Security File Validation ---');

  // Test 1: File type validation (Valid types)
  const validPdfCheck = validateFileType('lab_report_cbc.pdf', 'application/pdf');
  assert(validPdfCheck.valid, 'Allow valid medical PDF document');

  const validPngCheck = validateFileType('scan_radiology.png', 'image/png');
  assert(validPngCheck.valid, 'Allow valid scan PNG image');

  const validTxtCheck = validateFileType('clinician_note.txt', 'text/plain');
  assert(validTxtCheck.valid, 'Allow valid clinical text file');

  // Test 2: Reject dangerous / non-medical extensions
  const exeCheck = validateFileType('malicious_payload.exe', 'application/x-msdownload');
  assert(!exeCheck.valid, 'Block dangerous executable (.exe) file upload');

  const scriptCheck = validateFileType('exploit_script.sh', 'text/x-shellscript');
  assert(!scriptCheck.valid, 'Block dangerous shell script (.sh) upload');

  const phpCheck = validateFileType('webshell.php', 'application/x-httpd-php');
  assert(!phpCheck.valid, 'Block dangerous web script (.php) upload');

  // Test 3: File size validation
  const validSizeCheck = validateFileSize(5 * 1024 * 1024); // 5MB
  assert(validSizeCheck.valid, 'Allow valid file size (5MB <= 30MB limit)');

  const oversizeCheck = validateFileSize(35 * 1024 * 1024); // 35MB
  assert(!oversizeCheck.valid, 'Block oversized document (>30MB limit)');

  const zeroByteCheck = validateFileSize(0);
  assert(!zeroByteCheck.valid, 'Block empty file (0 bytes)');

  // Test 4: Filename Sanitization & Path Traversal Protection
  const traversalName = '../../../../etc/passwd/report.pdf';
  const sanitized1 = sanitizeFileName(traversalName);
  assert(
    !sanitized1.includes('..') && !sanitized1.includes('/') && sanitized1.endsWith('.pdf'),
    'Sanitize path traversal attempts (../../ stripped)',
    `Result: ${sanitized1}`
  );

  const maliciousName = 'exploit<script>alert(1)</script>_report.pdf';
  const sanitized2 = sanitizeFileName(maliciousName);
  assert(
    !sanitized2.includes('<') && !sanitized2.includes('>') && !sanitized2.includes('('),
    'Sanitize special characters and XSS tags from filename',
    `Result: ${sanitized2}`
  );

  // Test 5: Cryptographic SHA-256 Checksum Calculation
  const testBuffer = Buffer.from('MedLens Clinical Test Buffer Integrity 2026', 'utf-8');
  const shaHash = computeSha256(testBuffer);
  assert(
    shaHash.length === 64 && /^[0-9a-f]+$/.test(shaHash),
    'Compute 64-character hexadecimal SHA-256 hash for document integrity',
    `Hash: ${shaHash}`
  );

  // Test 6: Secure Private File Storage (Outside public/ and static)
  const stored = await saveUploadedFile(testBuffer, 'lab_sample_cbc.pdf', 'application/pdf');
  assert(
    isSecureStoragePath(stored.storagePath),
    'Store uploaded document strictly in private storage directory',
    `Path: ${stored.storagePath}`
  );
  assert(
    !stored.storagePath.includes('public') && !stored.storagePath.includes('static'),
    'Ensure medical files are NEVER written to public/ or static directories'
  );

  const readBack = await readUploadedFile(stored.storagePath);
  assert(
    readBack.toString('utf-8') === testBuffer.toString('utf-8'),
    'Read back secure file content accurately'
  );

  // ==========================================
  // PHASE 2: METHOD A - PDF / DOCUMENT INGESTION
  // ==========================================
  console.log('\n--- PHASE 2: Method A - Medical PDF / Document Ingestion ---');

  const samplePdfContent = Buffer.from(
    `LabCorp Comprehensive Diagnostic Report
Patient: Eleanor Vance | MRN: ${testPatient.identifier} | Date: 2026-09-02
Ordering Physician: Dr. Sarah Jenkins, MD

Complete Blood Count:
Hemoglobin: 10.9 g/dL (Ref: 13.0 - 17.0 g/dL) [L]
Hematocrit: 33.1 % (Ref: 37.0 - 48.0 %) [L]
WBC: 7.1 k/uL (Ref: 4.5 - 11.0 k/uL)
Platelets: 235 k/uL (Ref: 150 - 450 k/uL)

Iron Studies:
Ferritin: 12 ng/mL (Ref: 20 - 200 ng/mL) [L]

Prescriptions:
Rx: Ferrous Sulfate 325 mg PO once daily
Rx: Atorvastatin 10 mg PO once daily at bedtime

Allergies:
Allergy: Penicillin - Reaction: Severe Urticaria and bronchospasm`,
    'utf-8'
  );

  const docIngestion = await MedLensIngestionEngine.ingestDocumentFile({
    fileBuffer: samplePdfContent,
    originalFileName: 'LabCorp_CBC_Panel_2026.pdf',
    mimeType: 'application/pdf',
    patientId: testPatient.id,
    documentType: 'LAB_REPORT',
  });

  assert(docIngestion.success, 'Execute Method A Document Ingestion successfully');
  assert(
    docIngestion.processingStatus === 'COMPLETED',
    'Document reaches COMPLETED status after full pipeline execution'
  );
  assert(
    docIngestion.stagesCompleted.includes('UPLOADED') &&
    docIngestion.stagesCompleted.includes('QUEUED') &&
    docIngestion.stagesCompleted.includes('PROCESSING') &&
    docIngestion.stagesCompleted.includes('EXTRACTING') &&
    docIngestion.stagesCompleted.includes('VALIDATING') &&
    docIngestion.stagesCompleted.includes('READY_FOR_REVIEW') &&
    docIngestion.stagesCompleted.includes('COMPLETED'),
    'Progress through all 7 pipeline stages sequentially'
  );
  assert(
    docIngestion.extractedCounts.labs >= 3,
    'Extract lab results from document',
    `Extracted ${docIngestion.extractedCounts.labs} labs`
  );
  assert(
    docIngestion.extractedCounts.medications >= 1,
    'Extract medications from document',
    `Extracted ${docIngestion.extractedCounts.medications} meds`
  );

  // Verify Zero-Guess Reference Ranges in Extracted Document Labs
  const patientAfterDoc = await store.getPatientById(testPatient.id);
  const docLabs = (patientAfterDoc?.labResults || []).filter(l => l.documentId === docIngestion.documentId);
  const hgbLab = docLabs.find(l => l.testName.toLowerCase().includes('hemoglobin'));
  assert(
    hgbLab !== undefined && hgbLab.interpretation === 'LOW',
    'Correctly classify Hemoglobin as LOW based on source range (13.0 - 17.0 g/dL)',
    `Measured: ${hgbLab?.measuredValue}, Status: ${hgbLab?.interpretation}`
  );
  assert(
    hgbLab?.provenanceSource === 'DOCUMENT_EXTRACTED',
    'Set provenanceSource = DOCUMENT_EXTRACTED for document-parsed entities'
  );

  // ==========================================
  // PHASE 3: METHOD B - DIRECT TEXT INPUT
  // ==========================================
  console.log('\n--- PHASE 3: Method B - Direct Text Input (USER_PROVIDED) ---');

  const directTextPayload = `Mercy Health Direct Clinician Consultation Note
Patient: Eleanor Vance | MRN: ${testPatient.identifier}
Consultant: Dr. Marcus Thorne, MD

Reported Clinical Observations:
Patient reports generalized morning fatigue and leg muscle cramps.

Entered Lab Values:
Serum Potassium: 3.2 mEq/L (Ref: 3.5 - 5.0 mEq/L) [L]
Magnesium: 1.8 mg/dL (Ref: 1.7 - 2.2 mg/dL)

Entered Prescriptions:
Rx: Potassium Chloride 20 mEq PO once daily with meals

Entered Allergies:
Allergy: Sulfa Drugs - Reaction: Maculopapular rash`;

  const textIngestion = await MedLensIngestionEngine.ingestDirectTextInput({
    patientId: testPatient.id,
    rawText: directTextPayload,
    originalFileName: 'Direct_Clinician_Note.txt',
    documentType: 'CLINICIAN_NOTE',
  });

  assert(textIngestion.success, 'Execute Method B Direct Text Ingestion successfully');
  assert(textIngestion.extractedCounts.labs >= 1, 'Extract labs from pasted text narrative');

  // Verify that all entities created via Method B are explicitly tagged USER_PROVIDED
  const patientAfterText = await store.getPatientById(testPatient.id);
  const userProvidedLabs = (patientAfterText?.labResults || []).filter(l => l.documentId === textIngestion.documentId);
  const userProvidedMeds = (patientAfterText?.medications || []).filter(m => m.documentId === textIngestion.documentId);
  const userProvidedAllergies = (patientAfterText?.allergies || []).filter(a => a.documentId === textIngestion.documentId);

  assert(
    userProvidedLabs.every(l => l.provenanceSource === 'USER_PROVIDED'),
    'Explicitly label all direct text lab results with USER_PROVIDED provenance',
    `Labs checked: ${userProvidedLabs.length}`
  );
  assert(
    userProvidedMeds.every(m => m.provenanceSource === 'USER_PROVIDED'),
    'Explicitly label all direct text medications with USER_PROVIDED provenance',
    `Meds checked: ${userProvidedMeds.length}`
  );
  assert(
    userProvidedAllergies.every(a => a.provenanceSource === 'USER_PROVIDED'),
    'Explicitly label all direct text allergies with USER_PROVIDED provenance',
    `Allergies checked: ${userProvidedAllergies.length}`
  );

  // ==========================================
  // PHASE 4: METHOD C - STRUCTURED PATIENT FORM
  // ==========================================
  console.log('\n--- PHASE 4: Method C - Structured Patient Intake Form ---');

  // Test 1: Valid Intake Submission
  const validIntakePayload = {
    identifier: `MRN-${Math.floor(200000 + Math.random() * 700000)}`,
    fullName: 'Sophia Bennett',
    dateOfBirth: '1985-06-20',
    age: 41,
    sex: 'FEMALE' as const,
    contactNumber: '+1 (555) 902-3344',
    bloodType: 'O+',
    emergencyContact: 'David Bennett (Brother) - +1 (555) 902-3345',
    symptoms: 'Intermittent tachycardia, dizziness, and mild heat intolerance',
    existingConditions: 'Mild Hyperthyroidism, Recurrent Migraines',
    allergies: 'Aspirin (Bronchospasm / Wheezing)',
    medications: 'Methimazole 5mg PO daily, Propranolol 20mg PO twice daily',
    medicalHistory: 'Cholecystectomy in 2019, No family history of thyroid cancer',
    additionalNotes: 'Patient requests endocrinology workup and baseline TSH review.',
  };

  const intakeResult = await MedLensIngestionEngine.ingestStructuredPatientForm(validIntakePayload);
  assert(intakeResult.patient !== undefined, 'Create Patient record from structured intake form');
  assert(
    intakeResult.patient.fullName === 'Sophia Bennett',
    'Store patient identity fields correctly'
  );
  assert(
    intakeResult.ingestionResult.success,
    'Ingest structured clinical narrative document successfully'
  );

  // Verify intake entities
  const sophiaRecord = await store.getPatientById(intakeResult.patient.id);
  assert(
    (sophiaRecord?.medications || []).length > 0,
    'Extract and record active medications from structured intake'
  );
  assert(
    (sophiaRecord?.allergies || []).length > 0,
    'Extract and record documented allergies from structured intake'
  );

  // Test 2: Validation Failures for Invalid Intake Submissions
  const invalidPayload1 = {
    identifier: '', // Missing required identifier
    fullName: 'A',  // Too short
    sex: 'INVALID_SEX' as any,
  };
  const validationFail1 = PatientIntakeFormSchema.safeParse(invalidPayload1);
  assert(!validationFail1.success, 'Reject structured intake with missing MRN and invalid name length');

  const invalidPayload2 = {
    identifier: 'MRN-999',
    fullName: 'Valid Name',
    dateOfBirth: '2099-01-01', // Future date
  };
  const validationFail2 = PatientIntakeFormSchema.safeParse(invalidPayload2);
  assert(!validationFail2.success, 'Reject future date of birth in patient intake');

  // ==========================================
  // PHASE 5: CONFLICT DETECTION & CROSS-RECONCILIATION
  // ==========================================
  console.log('\n--- PHASE 5: Clinical Conflict Detection & Safety ---');

  // Inject a contradictory medication (e.g. Metformin 500mg vs 1000mg or Penicillin allergy vs prescription)
  await store.addMedication({
    patientId: testPatient.id,
    drugName: 'Metformin',
    dosage: '500mg',
    frequency: 'twice daily',
    status: 'ACTIVE',
    provenanceSource: 'USER_PROVIDED',
    verificationStatus: 'UNVERIFIED',
  });

  await store.addMedication({
    patientId: testPatient.id,
    drugName: 'Metformin',
    dosage: '1000mg',
    frequency: 'twice daily',
    status: 'ACTIVE',
    provenanceSource: 'DOCUMENT_EXTRACTED',
    verificationStatus: 'UNVERIFIED',
  });

  // Re-run conflict detection
  const patientWithConflict = await store.getPatientById(testPatient.id);
  const { detectClinicalConflicts } = await import('../src/lib/ai/conflictEngine');
  const detected = detectClinicalConflicts(patientWithConflict!);

  const medConflict = detected.find(c => c.conflictType === 'MEDICATION_INCONSISTENCY');
  assert(
    medConflict !== undefined,
    'Detect dosage discrepancy conflict between Metformin 500mg and Metformin 1000mg',
    `Description: ${medConflict?.description}`
  );

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL MEDLENS INGESTION ENGINE TESTS PASSED WITH 100% SUCCESS!\n');
  } else {
    console.error('❌ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

runIngestionTests().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
