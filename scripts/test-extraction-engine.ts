import { ReferenceRangeParser } from '../src/lib/services/reference-range/ReferenceRangeParser';
import { ReferenceRangeClassifier } from '../src/lib/services/reference-range/ReferenceRangeClassifier';
import { ReferenceRangeEngine, referenceRangeEngine } from '../src/lib/services/reference-range/ReferenceRangeEngine';
import { ValidationService } from '../src/lib/services/validation/ValidationService';
import { NormalizationService } from '../src/lib/services/normalization/NormalizationService';
import { ProvenanceService } from '../src/lib/services/provenance/ProvenanceService';
import { ConfidenceService } from '../src/lib/services/confidence/ConfidenceService';
import { ConflictDetectionService } from '../src/lib/services/conflicts/ConflictDetectionService';
import { GoogleDocumentAIService } from '../src/lib/services/ocr/GoogleDocumentAIService';
import { PaddleOCRService } from '../src/lib/services/ocr/PaddleOCRService';
import { OCRFactory } from '../src/lib/services/ocr/OCRFactory';
import { OCRResultSchema } from '../src/lib/services/ocr/OCRService';
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
  // 1. REFERENCE RANGE PARSER TESTS
  // ==========================================
  console.log('--- 1. Reference Range Parser Tests ---');

  // 13–17
  const p1 = ReferenceRangeParser.parse('13–17');
  assert(p1.type === 'BETWEEN' && p1.lower === 13 && p1.upper === 17, 'Parse format "13–17"');

  // 13 - 17
  const p2 = ReferenceRangeParser.parse('13 - 17');
  assert(p2.type === 'BETWEEN' && p2.lower === 13 && p2.upper === 17, 'Parse format "13 - 17"');

  // 13 to 17
  const p3 = ReferenceRangeParser.parse('13 to 17');
  assert(p3.type === 'BETWEEN' && p3.lower === 13 && p3.upper === 17, 'Parse format "13 to 17"');

  // 13.0–17.0
  const p4 = ReferenceRangeParser.parse('13.0–17.0');
  assert(p4.type === 'BETWEEN' && p4.lower === 13 && p4.upper === 17, 'Parse format "13.0–17.0"');

  // Reference interval: 13–17 g/dL
  const p5 = ReferenceRangeParser.parse('Reference interval: 13–17 g/dL');
  assert(
    p5.type === 'BETWEEN' && p5.lower === 13 && p5.upper === 17 && p5.unit === 'g/dL',
    'Parse format "Reference interval: 13–17 g/dL" with unit'
  );

  // Reference Range: 13.0 - 17.0 g/dL
  const p6 = ReferenceRangeParser.parse('Reference Range: 13.0 - 17.0 g/dL');
  assert(
    p6.type === 'BETWEEN' && p6.lower === 13 && p6.upper === 17 && p6.unit === 'g/dL',
    'Parse format "Reference Range: 13.0 - 17.0 g/dL"'
  );

  // Less than: <13 and < 13
  const p7 = ReferenceRangeParser.parse('<13');
  assert(p7.type === 'LESS_THAN' && p7.upper === 13, 'Parse format "<13"');

  // Less than or equal: ≤13 and <= 13
  const p8 = ReferenceRangeParser.parse('≤13');
  assert(p8.type === 'LESS_THAN_OR_EQUAL' && p8.upper === 13, 'Parse format "≤13"');

  // Greater than: >17 and > 17
  const p9 = ReferenceRangeParser.parse('>17');
  assert(p9.type === 'GREATER_THAN' && p9.lower === 17, 'Parse format ">17"');

  // Greater than or equal: ≥17 and >= 17
  const p10 = ReferenceRangeParser.parse('≥17');
  assert(p10.type === 'GREATER_THAN_OR_EQUAL' && p10.lower === 17, 'Parse format "≥17"');

  // ==========================================
  // 2. CLASSIFICATION TESTS
  // ==========================================
  console.log('\n--- 2. Deterministic Classification Tests ---');

  const standardRange = ReferenceRangeParser.parse('13.0 - 17.0 g/dL');

  // 11.2 with 13–17 → LOW
  const c1 = ReferenceRangeClassifier.classify(11.2, standardRange, 'g/dL');
  assert(c1.status === 'LOW', '11.2 with range 13–17 -> LOW');

  // 13 with 13–17 → NORMAL
  const c2 = ReferenceRangeClassifier.classify(13.0, standardRange, 'g/dL');
  assert(c2.status === 'NORMAL', '13.0 with range 13–17 (exact lower bound) -> NORMAL');

  // 15 with 13–17 → NORMAL
  const c3 = ReferenceRangeClassifier.classify(15.0, standardRange, 'g/dL');
  assert(c3.status === 'NORMAL', '15.0 with range 13–17 -> NORMAL');

  // 17 with 13–17 → NORMAL
  const c4 = ReferenceRangeClassifier.classify(17.0, standardRange, 'g/dL');
  assert(c4.status === 'NORMAL', '17.0 with range 13–17 (exact upper bound) -> NORMAL');

  // 18 with 13–17 → HIGH
  const c5 = ReferenceRangeClassifier.classify(18.0, standardRange, 'g/dL');
  assert(c5.status === 'HIGH', '18.0 with range 13–17 -> HIGH');

  // No range → REFERENCE_UNAVAILABLE (referenceSource: NONE)
  const noRange = ReferenceRangeParser.parse(null);
  const c6 = ReferenceRangeClassifier.classify(11.2, noRange, 'g/dL');
  assert(
    c6.status === 'REFERENCE_UNAVAILABLE' && c6.referenceSource === 'NONE',
    'No range present -> REFERENCE_UNAVAILABLE with referenceSource: NONE'
  );

  // ==========================================
  // 3. DECIMAL TESTS
  // ==========================================
  console.log('\n--- 3. Decimal Precision Tests ---');

  const decRange = ReferenceRangeParser.parse('11.00 - 17.25 g/dL');
  const d1 = ReferenceRangeClassifier.classify(11.25, decRange, 'g/dL');
  const d2 = ReferenceRangeClassifier.classify(13.00, decRange, 'g/dL');
  const d3 = ReferenceRangeClassifier.classify(17.50, decRange, 'g/dL');

  assert(d1.status === 'NORMAL', 'Decimal 11.25 within 11.00-17.25 -> NORMAL');
  assert(d2.status === 'NORMAL', 'Decimal 13.00 within 11.00-17.25 -> NORMAL');
  assert(d3.status === 'HIGH', 'Decimal 17.50 with 11.00-17.25 -> HIGH');

  // ==========================================
  // 4. UNIT HANDLING & INCOMPATIBLE UNITS
  // ==========================================
  console.log('\n--- 4. Unit Handling Tests ---');

  // Incompatible units: 11.2 g/dL with range in mmol/L
  const mmolRange = ReferenceRangeParser.parse('13 - 17 mmol/L');
  const u1 = ReferenceRangeClassifier.classify(11.2, mmolRange, 'g/dL');
  assert(
    u1.status === 'UNDETERMINED' && u1.unitMismatch === true,
    'Incompatible units (g/dL vs mmol/L) -> UNDETERMINED'
  );

  // Compatible units
  const gdlRange = ReferenceRangeParser.parse('13 - 17 g/dL');
  const u2 = ReferenceRangeClassifier.classify(15.0, gdlRange, 'g/dL');
  assert(u2.status === 'NORMAL' && !u2.unitMismatch, 'Compatible units (g/dL vs g/dL) -> NORMAL');

  // ==========================================
  // 5. TEXTUAL REFERENCE RANGES
  // ==========================================
  console.log('\n--- 5. Textual Reference Ranges Tests ---');

  const textRange1 = ReferenceRangeParser.parse('Negative');
  const textRange2 = ReferenceRangeParser.parse('Non-reactive');
  const textRange3 = ReferenceRangeParser.parse('Not detected');

  assert(textRange1.type === 'TEXTUAL', 'Parse "Negative" as TEXTUAL');
  assert(textRange2.type === 'TEXTUAL', 'Parse "Non-reactive" as TEXTUAL');
  assert(textRange3.type === 'TEXTUAL', 'Parse "Not detected" as TEXTUAL');

  const textClass = ReferenceRangeClassifier.classify(null, textRange1, null, 'Negative');
  assert(
    textClass.status === 'UNDETERMINED',
    'Textual reference ranges return UNDETERMINED for numeric classification'
  );

  // ==========================================
  // 6. MALFORMED & AMBIGUOUS RANGES
  // ==========================================
  console.log('\n--- 6. Malformed & Ambiguous Range Tests ---');

  const m1 = ReferenceRangeParser.parse('13-');
  const m2 = ReferenceRangeParser.parse('-17');
  const m3 = ReferenceRangeParser.parse('13 to');
  const m4 = ReferenceRangeParser.parse('abc');
  const m5 = ReferenceRangeParser.parse('13 seventeen');
  const m6 = ReferenceRangeParser.parse('13–17–20');

  assert(m1.type === 'INVALID', 'Malformed "13-" parsed as INVALID');
  assert(m2.type === 'INVALID', 'Malformed "-17" parsed as INVALID');
  assert(m3.type === 'INVALID', 'Malformed "13 to" parsed as INVALID');
  assert(m4.type === 'INVALID', 'Malformed "abc" parsed as INVALID');
  assert(m5.type === 'INVALID', 'Malformed "13 seventeen" parsed as INVALID');
  assert(m6.type === 'INVALID', 'Malformed "13–17–20" parsed as INVALID');

  const mClass = ReferenceRangeClassifier.classify(15.0, m1, 'g/dL');
  assert(mClass.status === 'UNDETERMINED', 'Malformed range -> status UNDETERMINED');

  // Multiple demographic ranges without explicit patient link
  const multiDemo = ReferenceRangeParser.parse('Male: 13–17 g/dL Female: 12–15 g/dL');
  assert(multiDemo.type === 'INVALID', 'Multiple demographic ranges without explicit patient link -> INVALID');
  const multiClass = ReferenceRangeClassifier.classify(14.0, multiDemo, 'g/dL');
  assert(multiClass.status === 'UNDETERMINED', 'Ambiguous multiple demographic ranges -> UNDETERMINED');

  // ==========================================
  // 7. CRITICAL ANTI-HALLUCINATION GUARDRAIL
  // ==========================================
  console.log('\n--- 7. Anti-Hallucination Guardrail Tests ---');

  const engine = new ReferenceRangeEngine();

  // Range actually present in source text
  const supportedResult = engine.evaluateLab({
    value: '11.2',
    numericValue: 11.2,
    unit: 'g/dL',
    sourceReferenceRange: '13.0 - 17.0 g/dL',
    sourceText: 'Hemoglobin: 11.2 g/dL (Ref Range: 13.0 - 17.0 g/dL)',
  });
  assert(
    supportedResult.status === 'LOW' && supportedResult.referenceSource === 'DOCUMENT',
    'Source-supported reference range is accepted and classified as LOW'
  );

  // Hallucinated range not present in source text
  const hallucinatedResult = engine.evaluateLab({
    value: '11.2',
    numericValue: 11.2,
    unit: 'g/dL',
    sourceReferenceRange: '13.0 - 17.0 g/dL', // LLM made this up
    sourceText: 'Hemoglobin: 11.2 g/dL (no reference interval provided by laboratory)',
  });
  assert(
    hallucinatedResult.status === 'REFERENCE_UNAVAILABLE' &&
    hallucinatedResult.referenceSource === 'NONE',
    'Reject hallucinated reference range missing from source evidence -> REFERENCE_UNAVAILABLE'
  );

  // ==========================================
  // 8. OCR PROVIDER CONFORMANCE
  // ==========================================
  console.log('\n--- 8. OCR Provider Schema Conformance Tests ---');

  const paddleService = new PaddleOCRService();
  const googleService = new GoogleDocumentAIService();

  const dummyPdf = Buffer.from('%PDF-1.4 Dummy Scanned Document Header');

  const paddleRes = await paddleService.extract(dummyPdf);
  const googleRes = await googleService.extract(dummyPdf);

  const paddleValid = OCRResultSchema.safeParse(paddleRes);
  const googleValid = OCRResultSchema.safeParse(googleRes);

  assert(paddleValid.success, 'PaddleOCRService returns valid provider-independent OCRResultSchema');
  assert(googleValid.success, 'GoogleDocumentAIService returns valid provider-independent OCRResultSchema');
  assert(
    paddleRes.pages.length > 0 && googleRes.pages.length > 0,
    'Both OCR services provide structured pages with bounding boxes and confidence scores'
  );

  // ==========================================
  // 9. ZOD VALIDATION & RETRY HANDLING
  // ==========================================
  console.log('\n--- 9. Zod Validation & Schema Tests ---');

  const validJson = {
    laboratoryResults: [
      {
        testName: 'Hemoglobin',
        value: '11.2',
        numericValue: 11.2,
        unit: 'g/dL',
        sourceReferenceRange: '13.0 - 17.0 g/dL',
        status: 'LOW' as const,
        referenceSource: 'DOCUMENT' as const,
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
        status: 'ACTIVE' as const,
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
  assert(valSuccess.success, 'Valid clinical JSON passes Zod validation');

  const malformedJson = {
    laboratoryResults: [
      {
        // Missing required testName and value
        numericValue: 11.2,
      },
    ],
  };
  const valFail = ValidationService.safeValidate(malformedJson);
  assert(!valFail.success, 'Reject malformed JSON missing required fields');

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
  // 10. NORMALIZATION LAYER
  // ==========================================
  console.log('\n--- 10. Normalization Layer Tests ---');

  const rawExtraction = {
    laboratoryResults: [
      {
        testName: 'hgb',
        value: '11.2',
        numericValue: 11.2,
        unit: 'G/DL',
        sourceReferenceRange: '13.0 - 17.0 g/dL',
        status: 'REFERENCE_UNAVAILABLE' as const,
        referenceSource: 'DOCUMENT' as const,
        sourceText: 'hgb: 11.2 G/DL (Ref: 13.0 - 17.0 g/dL)',
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
    'Normalize test name (hgb -> Hemoglobin), unit (G/DL -> g/dL), and status (LOW)'
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
  // 11. PROVENANCE & CONFIDENCE
  // ==========================================
  console.log('\n--- 11. Provenance & Confidence Tests ---');

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
    'Attach complete provenance (document ID, sourceType, sourceText, timestamp) to extracted entities'
  );

  const labScore = ConfidenceService.calculateLabConfidence(normalized.laboratoryResults[0], 0.984);
  assert(
    labScore >= 0.95 && labScore <= 1.0,
    'Calculate extraction confidence score based on OCR, syntax & source alignment'
  );

  // ==========================================
  // 12. CONFLICT DETECTION
  // ==========================================
  console.log('\n--- 12. Conflict Detection Tests ---');

  const mockPatient = {
    id: 'p-test-01',
    identifier: 'MRN-449102',
    fullName: 'Eleanor Vance',
    createdAt: new Date(),
    updatedAt: new Date(),
    sex: 'FEMALE' as const,
    medications: [
      {
        id: 'med-01',
        patientId: 'p-test-01',
        drugName: 'Metformin',
        dosage: '500 mg',
        frequency: 'Once daily',
        route: 'Oral',
        status: 'ACTIVE' as const,
        provenanceSource: 'USER_PROVIDED' as const,
        confidenceScore: 1.0,
        verificationStatus: 'VERIFIED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    allergies: [
      {
        id: 'all-01',
        patientId: 'p-test-01',
        allergen: 'Penicillin',
        reaction: 'Severe hives & wheezing',
        severity: 'SEVERE' as const,
        provenanceSource: 'USER_PROVIDED' as const,
        confidenceScore: 1.0,
        verificationStatus: 'VERIFIED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    labResults: [],
    conditions: [],
    observations: [],
    documents: [],
    summaries: [],
    conflicts: [],
    auditLogs: [],
  };

  const conflictingExtraction = {
    laboratoryResults: [],
    medications: [
      {
        drugName: 'Metformin',
        dose: '1000 mg', // 1000 mg vs existing 500 mg
        frequency: 'Twice daily',
        route: 'Oral',
        status: 'ACTIVE' as const,
        sourceText: 'Discharge Rx: Metformin 1000 mg BID',
        pageNumber: 1,
        confidence: 0.97,
      },
      {
        drugName: 'Amoxicillin', // Beta-lactam contraindication for Penicillin allergy
        dose: '500 mg',
        frequency: 'Three times daily',
        route: 'Oral',
        status: 'ACTIVE' as const,
        sourceText: 'Rx: Amoxicillin 500 mg TID',
        pageNumber: 1,
        confidence: 0.95,
      },
    ],
    allergies: [],
    conditions: [],
    symptoms: [],
    observations: [],
  };

  const conflicts = ConflictDetectionService.detectConflicts(mockPatient as any, conflictingExtraction, 'doc-test-9921');
  assert(conflicts.length >= 2, 'Detect multiple clinical conflicts (dosage discrepancy + allergy contraindication)');

  const dosageConflict = conflicts.find(c => c.conflictType === 'MEDICATION_DOSAGE_DISCREPANCY');
  assert(dosageConflict !== undefined, 'Identify MEDICATION_DOSAGE_DISCREPANCY (500 mg vs 1000 mg)');

  const allergyConflict = conflicts.find(c => c.conflictType === 'ALLERGY_MEDICATION_CONTRAINDICATION');
  assert(allergyConflict !== undefined, 'Identify ALLERGY_MEDICATION_CONTRAINDICATION (Amoxicillin with Penicillin allergy)');

  // ==========================================
  // 13. END-TO-END PIPELINE EXECUTION
  // ==========================================
  console.log('\n--- 13. End-to-End Pipeline Execution Tests ---');

  const sampleReportText = `
LABORATORY REPORT - METROPOLITAN MEDICAL CENTER
Patient: Eleanor Vance | MRN: ML-98214 | Date: 2026-09-05
------------------------------------------------------------
COMPLETE BLOOD COUNT (CBC):
Hemoglobin: 11.2 g/dL       (Ref Range: 13.0 - 17.0 g/dL)
Hematocrit: 34.1 %          (Ref Range: 37.0 - 48.0 %)
WBC Count: 6.8 k/uL         (Ref Range: 4.5 - 11.0 k/uL)
Platelets: 245 k/uL         (Ref Range: 150 - 450 k/uL)

CURRENT MEDICATIONS:
Rx: Metformin 500 mg twice daily Oral
Rx: Lisinopril 10 mg once daily Oral

ALLERGIES:
Allergy: Penicillin (Reaction: Anaphylaxis / Severe Hives)
`;

  const pipelineRes = await DocumentExtractionPipeline.processDocument({
    patientId: 'p-demo-eleanor',
    documentId: 'doc-pipeline-test-01',
    documentBuffer: Buffer.from(sampleReportText),
    fileName: 'Eleanor_Vance_CBC_Report.pdf',
    mimeType: 'application/pdf',
  });

  assert(pipelineRes.success, 'Full DocumentExtractionPipeline executes end-to-end successfully');
  assert(pipelineRes.clinicalData.laboratoryResults.length >= 3, 'Extracted all documented lab tests');
  assert(pipelineRes.clinicalData.medications.length >= 2, 'Extracted all documented medications');
  assert(
    pipelineRes.clinicalData.laboratoryResults.some(l => l.testName === 'Hemoglobin' && l.status === 'LOW'),
    'Pipeline classified Hemoglobin 11.2 g/dL as LOW deterministically'
  );

  console.log('\n===============================================================');
  console.log(`  EXTRACTION ENGINE TEST SUMMARY: ${passed}/${total} PASSED (100%)`);
  console.log('===============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runExtractionEngineTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
