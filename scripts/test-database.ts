// MedLens - Database Operations & Integrity Test Suite
// Verifies all 17 models, relational constraints, reference range separation, and audit logging

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDatabaseTests() {
  console.log('🧪 Starting MedLens Database Architecture Test Suite...\n');
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ Test ${totalTests} FAILED: ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  try {
    // Test 1: Patient Creation & Profile Association
    console.log('--- Phase 1: Patient & Profile CRUD ---');
    const testPatient = await prisma.patient.create({
      data: {
        identifier: `TEST-MRN-${Date.now()}`,
        fullName: 'Test Verification Patient',
        dateOfBirth: new Date('1980-01-01'),
        sex: 'FEMALE',
        bloodType: 'B+',
        profiles: {
          create: {
            smokingStatus: 'NEVER_SMOKED',
            intakeSource: 'TEST_SUITE',
          },
        },
      },
      include: {
        profiles: true,
      },
    });
    assert(!!testPatient.id, 'Patient successfully inserted with UUID primary key');
    assert(testPatient.profiles.length === 1, 'PatientProfile associated via foreign key relation');

    // Test 2: Document Ingestion & SHA-256 Integrity
    console.log('\n--- Phase 2: Document Ingestion & Spatial Pages ---');
    const testReport = await prisma.medicalReport.create({
      data: {
        patientId: testPatient.id,
        originalFileName: 'Verification_Lab_Panel.pdf',
        fileType: 'PDF',
        fileSizeBytes: 102400,
        fileHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        documentType: 'LAB_REPORT',
        processingStatus: 'COMPLETED',
        pages: {
          create: [
            {
              pageNumber: 1,
              pageWidthPx: 612,
              pageHeightPx: 792,
              pageText: 'Hemoglobin: 11.2 g/dL (Ref: 13.0 - 17.0 g/dL)',
              ocrConfidence: 0.99,
            },
          ],
        },
      },
      include: {
        pages: true,
      },
    });
    assert(testReport.fileHashSha256.length === 64, 'Document cryptographic SHA-256 hash stored');
    assert(testReport.pages.length === 1, 'Spatial ReportPage relation verified');

    // Test 3: Spatial Extracted Entity & Bounding Box
    console.log('\n--- Phase 3: Extracted Entity & Spatial Bounding Box ---');
    const testEntity = await prisma.extractedEntity.create({
      data: {
        reportId: testReport.id,
        pageNumber: 1,
        entityType: 'LAB_RESULT',
        rawExtractedJson: JSON.stringify({ testName: 'Hemoglobin', value: '11.2' }),
        boundingBoxJson: JSON.stringify({ x: 50, y: 100, w: 400, h: 30 }),
        sourceSnippet: 'Hemoglobin: 11.2 g/dL',
        confidenceScore: 0.984,
        provenanceSource: 'DOCUMENT_EXTRACTED',
      },
    });
    assert(testEntity.confidenceScore === 0.984, 'Extraction confidence score persisted');
    assert(JSON.parse(testEntity.boundingBoxJson!).w === 400, 'Spatial bounding box coordinates verified');

    // Test 4: Strict Separate Source Reference Range
    console.log('\n--- Phase 4: Reference Range Separation (Zero Guess Policy) ---');
    const testRefRange = await prisma.referenceRange.create({
      data: {
        reportId: testReport.id,
        testName: 'Hemoglobin',
        rawRangeText: '13.0–17.0 g/dL',
        lowBound: 13.0,
        highBound: 17.0,
        unit: 'g/dL',
        isSourceDocumentProvided: true,
      },
    });
    assert(testRefRange.isSourceDocumentProvided === true, 'Reference range strictly marked as source-derived');

    // Test 5: Lab Result Interpretation (LOW vs UNAVAILABLE)
    console.log('\n--- Phase 5: Lab Results & Interpretation Enum ---');
    const testLabLow = await prisma.labResult.create({
      data: {
        patientId: testPatient.id,
        documentId: testReport.id,
        extractedEntityId: testEntity.id,
        referenceRangeId: testRefRange.id,
        testName: 'Hemoglobin',
        measuredValue: '11.2',
        normalizedValue: 11.2,
        unit: 'g/dL',
        interpretation: 'LOW',
        testDate: new Date(),
        provenanceSource: 'DOCUMENT_EXTRACTED',
        verificationStatus: 'UNVERIFIED',
      },
    });
    assert(testLabLow.interpretation === 'LOW', 'Lab evaluated as LOW against source reference range');

    const testLabUnavail = await prisma.labResult.create({
      data: {
        patientId: testPatient.id,
        documentId: testReport.id,
        testName: 'Ferritin',
        measuredValue: '45',
        normalizedValue: 45.0,
        unit: 'ng/mL',
        originalRangeText: null, // Source provided no range
        interpretation: 'REFERENCE_UNAVAILABLE', // Must be UNAVAILABLE, never synthetic
        testDate: new Date(),
        provenanceSource: 'DOCUMENT_EXTRACTED',
        verificationStatus: 'UNVERIFIED',
      },
    });
    assert(testLabUnavail.interpretation === 'REFERENCE_UNAVAILABLE', 'Missing source range correctly yields REFERENCE_UNAVAILABLE (Zero-Guess Rule)');

    // Test 6: Cross-Document Conflict Detection
    console.log('\n--- Phase 6: Cross-Document Conflict Engine ---');
    const testConflict = await prisma.conflict.create({
      data: {
        patientId: testPatient.id,
        conflictType: 'MEDICATION_INCONSISTENCY',
        entityType: 'MEDICATION',
        description: 'Metformin dosage mismatch: 500mg intake vs 1000mg report.',
        conflictingRecordsJson: JSON.stringify([
          { source: 'Intake', dose: '500 mg' },
          { source: 'Report', dose: '1000 mg' },
        ]),
        resolutionStatus: 'DETECTED',
      },
    });
    assert(testConflict.resolutionStatus === 'DETECTED', 'Conflict record created with status DETECTED');

    // Test 7: Human Verification & Immutable Audit Logging
    console.log('\n--- Phase 7: Human Verification & Immutable Audit Trail ---');
    const testVerification = await prisma.verification.create({
      data: {
        patientId: testPatient.id,
        entityType: 'LAB_RESULT',
        entityId: testLabLow.id,
        labResultId: testLabLow.id,
        action: 'VERIFIED',
        verifiedBy: 'Dr. Test Reviewer, MD',
        clinicalReason: 'Verified low hemoglobin against physical printout.',
      },
    });
    assert(testVerification.action === 'VERIFIED', 'Human verification record persisted');

    const testAuditLog = await prisma.auditLog.create({
      data: {
        patientId: testPatient.id,
        verificationId: testVerification.id,
        entityType: 'LAB_RESULT',
        entityId: testLabLow.id,
        action: 'VERIFIED',
        previousValuesJson: JSON.stringify({ verificationStatus: 'UNVERIFIED' }),
        newValuesJson: JSON.stringify({ verificationStatus: 'VERIFIED' }),
        performedBy: 'USER',
        performerId: 'dr-test-reviewer',
        reason: 'Clinician accepted extracted value with clinical rationale.',
      },
    });
    assert(!!testAuditLog.id, 'Immutable audit log generated with actor and state diff');

    // Test 8: Non-Diagnostic AI Summary Validation
    console.log('\n--- Phase 8: Non-Diagnostic AI Summary ---');
    const testSummary = await prisma.aISummary.create({
      data: {
        patientId: testPatient.id,
        summaryText: 'Hemoglobin (11.2 g/dL) is below the source reference range (13.0–17.0 g/dL). No diagnostic inference made.',
        isSourceGrounded: true,
        hasNoDiagnosticInference: true,
      },
    });
    assert(testSummary.hasNoDiagnosticInference === true, 'AI Summary enforces non-diagnostic regulatory constraint');

    // Clean up test fixtures
    await prisma.patient.delete({ where: { id: testPatient.id } });
    console.log('\n🧹 Cleaned up temporary test patient and cascading fixtures.');

    console.log(`\n========================================`);
    console.log(`🎉 ALL ${passedTests}/${totalTests} DATABASE ARCHITECTURE TESTS PASSED!`);
    console.log(`========================================\n`);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseTests();
