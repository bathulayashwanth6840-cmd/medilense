import { ReferenceRangeClassifier } from '../src/lib/services/classification/ReferenceRangeClassifier';
import { ValidationService } from '../src/lib/services/validation/ValidationService';
import { NormalizationService } from '../src/lib/services/normalization/NormalizationService';
import { ProvenanceService } from '../src/lib/services/provenance/ProvenanceService';
import { ConfidenceService } from '../src/lib/services/confidence/ConfidenceService';
import { ConflictDetectionService } from '../src/lib/services/conflicts/ConflictDetectionService';
import { GoogleDocumentAIService } from '../src/lib/services/ocr/GoogleDocumentAIService';
import { PaddleOCRService } from '../src/lib/services/ocr/PaddleOCRService';
import { TesseractOCRService } from '../src/lib/services/ocr/TesseractOCRService';
import { OCRFactory } from '../src/lib/services/ocr/OCRFactory';
import { DefaultPDFParser } from '../src/lib/services/pdf/PDFParser';
import { DocumentExtractionPipeline } from '../src/lib/services/pipeline/DocumentExtractionPipeline';
import { getStore } from '../src/lib/dataStore';

async function runExtractionEngineTests() {
  console.log('\n===============================================================');
  console.log('  MEDLENS EXTRACTION & AI ENGINE: PRODUCTION TEST SUITE');
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

  // ==========================================
  // 1. NON-NEGOTIABLE REFERENCE RANGE CLASSIFIER
  // ==========================================
  console.log('--- 1. Reference Range Classification Tests ---');

  // Test 1: 11.2 with 13–17 → LOW
  const res1 = ReferenceRangeClassifier.classifyLabResult({
    testName: 'Hemoglobin',
    value: '11.2',
    referenceRange: '13.0 - 17.0 g/dL',
  });
  assert(res1.status === 'LOW', '11.2 with range 13.0–17.0 -> LOW', `Got: ${res1.status}`);

  // Test 2: 15 with 13–17 → NORMAL
  const res2 = ReferenceRangeClassifier.classifyLabResult({
    testName: 'Hemoglobin',
    value: '15.0',
    referenceRange: '13.0 - 17.0 g/dL',
  });
  assert(res2.status === 'NORMAL', '15.0 with range 13.0–17.0 -> NORMAL', `Got: ${res2.status}`);

  // Test 3: 18 with 13–17 → HIGH
  const res3 = ReferenceRangeClassifier.classifyLabResult({
    testName: 'Hemoglobin',
    value: '18.0',
    referenceRange: '13.0 - 17.0 g/dL',
  });
  assert(res3.status === 'HIGH', '18.0 with range 13.0–17.0 -> HIGH', `Got: ${res3.status}`);

  // Test 4: 11.2 with no range → REFERENCE_UNAVAILABLE (referenceSource: NONE)
  const res4 = ReferenceRangeClassifier.classifyLabResult({
    testName: 'Hemoglobin',
    value: '11.2',
    referenceRange: null,
  });
  assert(
    res4.status === 'REFERENCE_UNAVAILABLE' && res4.referenceSource === 'NONE',
    '11.2 with NO range -> REFERENCE_UNAVAILABLE (referenceSource: NONE)',
    `Got status: ${res4.status}, source: ${res4.referenceSource}`
  );

  // Test 5: Ferritin 45 with no range → REFERENCE_UNAVAILABLE
  const res5 = ReferenceRangeClassifier.classifyLabResult({
    testName: 'Ferritin',
    value: '45 ng/mL',
    referenceRange: null,
  });
  assert(
    res5.status === 'REFERENCE_UNAVAILABLE' && res5.numericValue === 45,
    'Ferritin 45 with NO range -> REFERENCE_UNAVAILABLE',
    `Got status: ${res5.status}`
  );

  // Test 6: Boundary equalities (13.0 and 17.0 on 13.0-17.0 should be NORMAL)
  const res6a = ReferenceRangeClassifier.classifyLabResult({ value: '13.0', referenceRange: '13.0 - 17.0' });
  const res6b = ReferenceRangeClassifier.classifyLabResult({ value: '17.0', referenceRange: '13.0 - 17.0' });
  assert(res6a.status === 'NORMAL' && res6b.status === 'NORMAL', 'Equal-to-boundary values (13.0, 17.0) -> NORMAL');

  // Test 7: Less than format (< 200 mg/dL)
  const res7a = ReferenceRangeClassifier.classifyLabResult({ value: '215', referenceRange: '< 200 mg/dL' });
  const res7b = ReferenceRangeClassifier.classifyLabResult({ value: '180', referenceRange: '< 200 mg/dL' });
  assert(res7a.status === 'HIGH' && res7b.status === 'NORMAL', '< 200 mg/dL range: 215 is HIGH, 180 is NORMAL');

  // Test 8: Greater than format (> 40 mg/dL)
  const res8a = ReferenceRangeClassifier.classifyLabResult({ value: '35', referenceRange: '> 40 mg/dL' });
  const res8b = ReferenceRangeClassifier.classifyLabResult({ value: '52', referenceRange: '> 40 mg/dL' });
  assert(res8a.status === 'LOW' && res8b.status === 'NORMAL', '> 40 mg/dL range: 35 is LOW, 52 is NORMAL');

  // Test 9: Malformed or non-numeric range
  const res9 = ReferenceRangeClassifier.classifyLabResult({ value: 'Positive', referenceRange: 'Negative' });
  assert(res9.status === 'REFERENCE_UNAVAILABLE', 'Non-numeric textual value -> REFERENCE_UNAVAILABLE');

  // ==========================================
  // 2. VALIDATION LAYER (ZOD SCHEMAS)
  // ==========================================
  console.log('\n--- 2. Validation Layer Tests ---');

  // Test 10: Valid LLM JSON passes
  const validJson = {
    laboratoryResults: [
      {
        testName: 'Hemoglobin',
        value: '11.2',
        numericValue: 11.2,
        unit: 'g/dL',
        referenceRange: '13.0 - 17.0 g/dL',
        status: 'LOW',
        referenceSource: 'DOCUMENT',
        sourceText: 'Hemoglobin: 11.2 g/dL (Ref: 13.0 - 17.0)',
        pageNumber: 1,
        confidence: 0.98,
      },
    ],
    medications: [
      {
        drugName: 'Metformin',
        dose: '500 mg',
        frequency: 'twice daily',
        route: 'Oral',
        status: 'ACTIVE',
        sourceText: 'Rx: Metformin 500 mg twice daily',
        pageNumber: 1,
        confidence: 0.96,
      },
    ],
    allergies: [],
    conditions: [],
    symptoms: [],
    observations: [],
  };

  const valSuccess = ValidationService.safeValidate(validJson);
  assert(valSuccess.success, 'Valid clinical JSON successfully passes Zod validation');

  // Test 11: Malformed JSON missing required fields is rejected
  const malformedJson = {
    laboratoryResults: [
      {
        // Missing testName and value
        numericValue: 11.2,
      },
    ],
  };
  const valFail = ValidationService.safeValidate(malformedJson);
  assert(!valFail.success, 'Reject malformed JSON missing required testName/value fields');

  // Test 12: Invalid confidence score (> 1 or < 0) is rejected
  const invalidConfidenceJson = {
    laboratoryResults: [
      {
        testName: 'WBC',
        value: '7.1',
        numericValue: 7.1,
        sourceText: 'WBC: 7.1',
        confidence: 1.5, // Invalid > 1.0
      },
    ],
  };
  const valFail2 = ValidationService.safeValidate(invalidConfidenceJson);
  assert(!valFail2.success, 'Reject invalid confidence score exceeding 1.0');

  // ==========================================
  // 3. NORMALIZATION LAYER
  // ==========================================
  console.log('\n--- 3. Normalization Layer Tests ---');

  const rawExtraction = {
    laboratoryResults: [
      {
        testName: 'hgb',
        value: '11.2',
        numericValue: 11.2,
        unit: 'G/DL',
        referenceRange: '13.0 - 17.0 g/dL',
        status: 'REFERENCE_UNAVAILABLE' as const,
        referenceSource: 'DOCUMENT' as const,
        sourceText: 'hgb: 11.2 G/DL (Ref: 13.0 - 17.0 g/dL)',
        pageNumber: 1,
        confidence: 0.98,
      },
      {
        testName: 'POTASSIUM, SERUM',
        value: '4.2',
        numericValue: 4.2,
        unit: 'MEQ/L',
        referenceRange: '3.5 - 5.0 mEq/L',
        status: 'REFERENCE_UNAVAILABLE' as const,
        referenceSource: 'DOCUMENT' as const,
        sourceText: 'POTASSIUM, SERUM 4.2 MEQ/L',
        pageNumber: 1,
        confidence: 0.98,
      },
    ],
    medications: [
      {
        drugName: 'METFORMIN HCL TAB',
        dose: '500 mg',
        frequency: 'bid',
        route: 'PO',
        status: 'ACTIVE' as const,
        sourceText: 'Rx: METFORMIN HCL TAB 500 mg bid PO',
        pageNumber: 1,
        confidence: 0.96,
      },
    ],
    allergies: [],
    conditions: [],
    symptoms: [],
    observations: [],
  };

  const normalized = NormalizationService.normalizeClinicalData(rawExtraction);

  assert(
    normalized.laboratoryResults[0].testName === 'Hemoglobin' &&
    normalized.laboratoryResults[0].unit === 'g/dL' &&
    normalized.laboratoryResults[0].status === 'LOW',
    'Normalize test name (hgb -> Hemoglobin), unit (G/DL -> g/dL), and status (LOW)',
    `Test: ${normalized.laboratoryResults[0].testName}, Unit: ${normalized.laboratoryResults[0].unit}, Status: ${normalized.laboratoryResults[0].status}`
  );

  assert(
    normalized.laboratoryResults[0].sourceText === 'hgb: 11.2 G/DL (Ref: 13.0 - 17.0 g/dL)',
    'Strictly preserve original raw source text during normalization'
  );

  assert(
    normalized.medications[0].drugName === 'Metformin' &&
    normalized.medications[0].frequency === 'Twice daily',
    'Normalize medication title (METFORMIN HCL TAB -> Metformin) and frequency (bid -> Twice daily)'
  );

  // ==========================================
  // 4. PROVENANCE ATTACHMENT
  // ==========================================
  console.log('\n--- 4. Provenance Service Tests ---');

  const withProvenance = ProvenanceService.attachDocumentProvenance(
    normalized,
    'doc-test-9921',
    0.984,
    'DOCUMENT_EXTRACTED'
  );

  const labProv = withProvenance.laboratoryResults[0].provenance;
  assert(
    labProv !== undefined &&
    labProv.sourceDocumentId === 'doc-test-9921' &&
    labProv.sourceType === 'DOCUMENT_EXTRACTED' &&
    labProv.sourceText.length > 0 &&
    labProv.extractionTimestamp !== undefined,
    'Attach complete provenance (document ID, sourceType, sourceText, timestamp) to extracted labs'
  );

  const medProv = withProvenance.medications[0].provenance;
  assert(
    medProv !== undefined && medProv.sourceDocumentId === 'doc-test-9921',
    'Attach complete provenance to extracted medications'
  );

  // ==========================================
  // 5. CONFIDENCE CALCULATION
  // ==========================================
  console.log('\n--- 5. Confidence Calculation Tests ---');

  const labScore = ConfidenceService.calculateLabConfidence(normalized.laboratoryResults[0], 0.984);
  assert(
    labScore >= 0.95 && labScore <= 1.0,
    'Calculate realistic extraction confidence score (0.95 - 1.0) based on OCR & parsing',
    `Score: ${labScore}`
  );

  // ==========================================
  // 6. CONFLICT DETECTION
  // ==========================================
  console.log('\n--- 6. Conflict Detection Service Tests ---');

  const mockPatient = {
    id: 'p-test-01',
    identifier: 'MRN-449102',
    fullName: 'Eleanor Vance',
    createdAt: new Date(),
    updatedAt: new Date(),
    sex: 'FEMALE',
    medications: [
      {
        id: 'med-01',
        patientId: 'p-test-01',
        drugName: 'Metformin',
        dosage: '500 mg',
        frequency: 'twice daily',
        status: 'ACTIVE' as const,
        provenanceSource: 'USER_PROVIDED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    allergies: [
      {
        id: 'all-01',
        patientId: 'p-test-01',
        allergen: 'Penicillin',
        reaction: 'Urticaria',
        severity: 'SEVERE' as const,
        provenanceSource: 'DOCUMENT_EXTRACTED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const conflictingIncoming: any = {
    medications: [
      {
        drugName: 'Metformin',
        dose: '1000 mg', // Inconsistent dose (1000mg vs 500mg)
        frequency: 'twice daily',
        sourceText: 'Rx: Metformin 1000 mg twice daily',
      },
      {
        drugName: 'Amoxicillin', // Cross-reactive with Penicillin allergy
        dose: '500 mg',
        frequency: 'three times daily',
        sourceText: 'Rx: Amoxicillin 500 mg TID',
      },
    ],
    laboratoryResults: [],
    allergies: [],
    conditions: [],
    symptoms: [],
    observations: [],
  };

  const conflicts = ConflictDetectionService.detectConflicts(mockPatient as any, conflictingIncoming);
  const medDoseConflict = conflicts.find(c => c.conflictType === 'MEDICATION_INCONSISTENCY');
  const allergyContraConflict = conflicts.find(c => c.conflictType === 'ALLERGY_DISCREPANCY');

  assert(
    medDoseConflict !== undefined && medDoseConflict.requiresHumanReview === true,
    'Detect Metformin 500 mg vs 1000 mg dosage conflict (requiresHumanReview = true)'
  );

  assert(
    allergyContraConflict !== undefined && allergyContraConflict.requiresHumanReview === true,
    'Detect Penicillin allergy vs Amoxicillin prescription discrepancy'
  );

  // ==========================================
  // 7. OCR ABSTRACTION & PROVIDER SWITCHING
  // ==========================================
  console.log('\n--- 7. OCR Abstraction & Provider Switching Tests ---');

  const testDocBuffer = Buffer.from('Medical Report Test Document Buffer', 'utf-8');

  // Google Document AI Service
  const googleService = new GoogleDocumentAIService();
  const googleRes = await googleService.extract(testDocBuffer, 'report.pdf');
  assert(
    googleRes.provider === 'google-document-ai' &&
    Array.isArray(googleRes.pages) &&
    googleRes.overallConfidence > 0.9,
    'GoogleDocumentAIService returns normalized OCRResult interface'
  );

  // PaddleOCR Service
  const paddleService = new PaddleOCRService();
  const paddleRes = await paddleService.extract(testDocBuffer, 'scan.png');
  assert(
    paddleRes.provider === 'paddle-ocr' &&
    Array.isArray(paddleRes.pages) &&
    paddleRes.overallConfidence > 0.9,
    'PaddleOCRService returns identical normalized OCRResult interface'
  );

  // Tesseract Service
  const tesseractService = new TesseractOCRService();
  const tesseractRes = await tesseractService.extract(testDocBuffer, 'scan.jpg');
  assert(
    tesseractRes.provider === 'tesseract-ocr' &&
    Array.isArray(tesseractRes.pages),
    'TesseractOCRService returns identical normalized OCRResult interface'
  );

  // Factory creation with environment variable
  const factoryService = OCRFactory.createOCRService('google');
  assert(factoryService.providerName === 'google-document-ai', 'OCRFactory instantiates configured provider');

  // ==========================================
  // 8. PDF TEXT DETECTION (NATIVE VS SCANNED)
  // ==========================================
  console.log('\n--- 8. PDF Text Detection Tests ---');

  const pdfParser = new DefaultPDFParser();

  // Test machine-readable text document
  const nativeTextBuffer = Buffer.from(
    'LabCorp Diagnostic Laboratories\nPatient: Eleanor Vance | MRN: ML-98214\nHemoglobin: 11.2 g/dL (Ref: 13.0 - 17.0 g/dL) [L]\nRx: Ferrous Sulfate 325 mg PO daily',
    'utf-8'
  );
  const nativeResult = await pdfParser.extractText(nativeTextBuffer);
  assert(
    nativeResult.hasMachineReadableText === true && nativeResult.extractionMethod === 'NATIVE_PDF',
    'Detect machine-readable text PDF -> extraction_method: NATIVE_PDF'
  );

  // ==========================================
  // 9. END-TO-END PIPELINE ORCHESTRATION
  // ==========================================
  console.log('\n--- 9. End-to-End Extraction Pipeline Test ---');

  const store = getStore();
  const pipelinePatient = await store.createPatient({
    identifier: `MRN-E2E-${Date.now().toString().slice(-6)}`,
    fullName: 'Pipeline Test Patient',
    sex: 'FEMALE',
  });

  const pipelineDocument = await store.addDocument({
    patientId: pipelinePatient.id,
    originalFileName: 'LabCorp_CBC_Panel_2026.pdf',
    fileType: 'application/pdf',
    fileSizeBytes: nativeTextBuffer.length,
    fileHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    processingStatus: 'PROCESSING',
  });

  const pipelineResult = await DocumentExtractionPipeline.processDocument({
    patientId: pipelinePatient.id,
    documentId: pipelineDocument.id,
    documentBuffer: nativeTextBuffer,
    fileName: 'LabCorp_CBC_Panel_2026.pdf',
    mimeType: 'application/pdf',
  });

  assert(pipelineResult.success === true, 'Execute master DocumentExtractionPipeline successfully');
  assert(
    pipelineResult.clinicalData.laboratoryResults.length >= 1,
    'Pipeline extracted and normalized laboratory results'
  );
  assert(
    pipelineResult.clinicalData.laboratoryResults[0].provenance !== undefined,
    'Pipeline attached complete provenance to extracted results'
  );

  // ==========================================
  // FINAL REPORT
  // ==========================================
  console.log('\n===============================================================');
  console.log(`  EXTRACTION & AI ENGINE TESTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================\n');

  if (passed === total) {
    console.log('🎉 ALL MEDLENS EXTRACTION & AI ENGINE TESTS PASSED WITH 100% SUCCESS!\n');
  } else {
    console.error('❌ Some tests failed. Review output above.');
    process.exit(1);
  }
}

runExtractionEngineTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
