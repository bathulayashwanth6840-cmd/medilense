// MedLens - Prisma Database Seeding Script
// Generates realistic clinical test fixtures for Eleanor Vance (ML-98214)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MedLens database seeding...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.auditLog.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.aISummary.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.referenceRange.deleteMany();
  await prisma.extractedEntity.deleteMany();
  await prisma.reportPage.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.patient.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 2. Seed Patient (Eleanor Vance)
  const patient = await prisma.patient.create({
    data: {
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      identifier: 'ML-98214',
      fullName: 'Eleanor Vance',
      dateOfBirth: new Date('1972-04-14'),
      sex: 'FEMALE',
      bloodType: 'A+',
      contactNumber: '+1 (555) 234-8901',
      emergencyContact: 'Thomas Vance (Spouse) - +1 (555) 987-6543',
      notes: 'Initial intake: Patient presents with persistent fatigue and cold sensitivity over past 6 weeks.',
      createdAt: new Date('2026-09-02T08:30:00Z'),
    },
  });

  // 3. Seed Patient Profile
  await prisma.patientProfile.create({
    data: {
      patientId: patient.id,
      smokingStatus: 'NON_SMOKER',
      alcoholConsumption: 'OCCASIONAL',
      occupation: 'Architectural Designer',
      intakeSource: 'WEB_INTAKE_FORM',
    },
  });

  // 4. Seed Medical Report (LabCorp CBC 2026 PDF)
  const report = await prisma.medicalReport.create({
    data: {
      id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
      patientId: patient.id,
      originalFileName: 'LabCorp_CBC_2026.pdf',
      fileType: 'PDF',
      fileSizeBytes: 245100,
      fileHashSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      documentType: 'LAB_REPORT',
      reportDate: new Date('2026-09-05T11:15:00Z'),
      processingStatus: 'COMPLETED',
      rawExtractedText: `LabCorp Diagnostic Laboratory\nPatient: Eleanor Vance | Age: 54 | Sex: Female | MRN: ML-98214\nAccession #: LC-849201 | Report Date: 09/05/2026 11:15 UTC\nPage 1 of 2\n\nCOMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL\nHemoglobin: 11.2 g/dL            (Ref: 13.0 – 17.0 g/dL)  [LOW]\nWBC Count: 6.8 k/uL              (Ref: 4.5 – 11.0 k/uL)   [NORMAL]\nFerritin: 45 ng/mL               (Ref: Unavailable)       [UNAVAILABLE]\nPlatelets: 240 k/uL              (Ref: 150 – 450 k/uL)    [NORMAL]\nGlucose, Fasting: 92 mg/dL       (Ref: 70 – 99 mg/dL)     [NORMAL]\n\nRx: Metformin 1000 mg PO twice daily with meals`,
      uploadedAt: new Date('2026-09-05T11:15:00Z'),
    },
  });

  // 5. Seed Report Pages with Spatial Layout
  const page1 = await prisma.reportPage.create({
    data: {
      reportId: report.id,
      pageNumber: 1,
      pageWidthPx: 612,
      pageHeightPx: 792,
      pageText: report.rawExtractedText,
      ocrConfidence: 0.995,
    },
  });

  await prisma.reportPage.create({
    data: {
      reportId: report.id,
      pageNumber: 2,
      pageWidthPx: 612,
      pageHeightPx: 792,
      pageText: 'LabCorp Diagnostic Laboratory - Page 2 of 2\nLaboratory Director: Dr. Sarah Jenkins, MD\nEnd of Diagnostic Report.',
      ocrConfidence: 0.998,
    },
  });

  // 6. Seed Extracted Entities (Spatial Bounding Boxes)
  const entityHgb = await prisma.extractedEntity.create({
    data: {
      reportId: report.id,
      pageId: page1.id,
      pageNumber: 1,
      entityType: 'LAB_RESULT',
      rawExtractedJson: JSON.stringify({ testName: 'Hemoglobin', value: '11.2', unit: 'g/dL', range: '13.0–17.0 g/dL' }),
      boundingBoxJson: JSON.stringify({ x: 42, y: 185, w: 520, h: 24 }),
      sourceSnippet: 'Hemoglobin: 11.2 g/dL (Ref: 13.0 – 17.0 g/dL) [LOW]',
      confidenceScore: 0.984,
      provenanceSource: 'DOCUMENT_EXTRACTED',
    },
  });

  const entityWbc = await prisma.extractedEntity.create({
    data: {
      reportId: report.id,
      pageId: page1.id,
      pageNumber: 1,
      entityType: 'LAB_RESULT',
      rawExtractedJson: JSON.stringify({ testName: 'WBC Count', value: '6.8', unit: 'k/uL', range: '4.5–11.0 k/uL' }),
      boundingBoxJson: JSON.stringify({ x: 42, y: 215, w: 520, h: 24 }),
      sourceSnippet: 'WBC Count: 6.8 k/uL (Ref: 4.5 – 11.0 k/uL) [NORMAL]',
      confidenceScore: 0.990,
      provenanceSource: 'DOCUMENT_EXTRACTED',
    },
  });

  const entityFerritin = await prisma.extractedEntity.create({
    data: {
      reportId: report.id,
      pageId: page1.id,
      pageNumber: 1,
      entityType: 'LAB_RESULT',
      rawExtractedJson: JSON.stringify({ testName: 'Ferritin', value: '45', unit: 'ng/mL', range: null }),
      boundingBoxJson: JSON.stringify({ x: 42, y: 245, w: 520, h: 24 }),
      sourceSnippet: 'Ferritin: 45 ng/mL (Ref: Unavailable)',
      confidenceScore: 0.970,
      provenanceSource: 'DOCUMENT_EXTRACTED',
    },
  });

  // 7. Seed Strictly Separate Source Reference Ranges
  const refRangeHgb = await prisma.referenceRange.create({
    data: {
      reportId: report.id,
      testName: 'Hemoglobin',
      rawRangeText: '13.0–17.0 g/dL',
      lowBound: 13.0,
      highBound: 17.0,
      unit: 'g/dL',
      isSourceDocumentProvided: true,
      sourcePageNumber: 1,
      sourceSnippet: 'Ref: 13.0 – 17.0 g/dL',
    },
  });

  const refRangeWbc = await prisma.referenceRange.create({
    data: {
      reportId: report.id,
      testName: 'WBC Count',
      rawRangeText: '4.5–11.0 k/uL',
      lowBound: 4.5,
      highBound: 11.0,
      unit: 'k/uL',
      isSourceDocumentProvided: true,
      sourcePageNumber: 1,
      sourceSnippet: 'Ref: 4.5 – 11.0 k/uL',
    },
  });

  // 8. Seed Lab Results
  const labHgb = await prisma.labResult.create({
    data: {
      patientId: patient.id,
      documentId: report.id,
      extractedEntityId: entityHgb.id,
      referenceRangeId: refRangeHgb.id,
      testName: 'Hemoglobin',
      testCategory: 'Complete Blood Count (CBC)',
      measuredValue: '11.2',
      normalizedValue: 11.2,
      unit: 'g/dL',
      originalValueText: 'Hemoglobin: 11.2 g/dL',
      originalRangeText: '13.0–17.0 g/dL',
      interpretation: 'LOW',
      testDate: new Date('2026-09-05T11:15:00Z'),
      provenanceSource: 'DOCUMENT_EXTRACTED',
      sourcePageNumber: 1,
      sourceOriginalSnippet: 'Hemoglobin: 11.2 g/dL\nRef: 13.0 – 17.0 g/dL',
      confidenceScore: 0.984,
      verificationStatus: 'UNVERIFIED',
    },
  });

  const labWbc = await prisma.labResult.create({
    data: {
      patientId: patient.id,
      documentId: report.id,
      extractedEntityId: entityWbc.id,
      referenceRangeId: refRangeWbc.id,
      testName: 'WBC Count',
      testCategory: 'Complete Blood Count (CBC)',
      measuredValue: '6.8',
      normalizedValue: 6.8,
      unit: 'k/uL',
      originalValueText: 'WBC Count: 6.8 k/uL',
      originalRangeText: '4.5–11.0 k/uL',
      interpretation: 'NORMAL',
      testDate: new Date('2026-09-05T11:15:00Z'),
      provenanceSource: 'DOCUMENT_EXTRACTED',
      sourcePageNumber: 1,
      sourceOriginalSnippet: 'WBC Count: 6.8 k/uL\nRef: 4.5 – 11.0 k/uL',
      confidenceScore: 0.990,
      verificationStatus: 'VERIFIED',
    },
  });

  const labFerritin = await prisma.labResult.create({
    data: {
      patientId: patient.id,
      documentId: report.id,
      extractedEntityId: entityFerritin.id,
      testName: 'Ferritin',
      testCategory: 'Iron Studies',
      measuredValue: '45',
      normalizedValue: 45.0,
      unit: 'ng/mL',
      originalValueText: 'Ferritin: 45 ng/mL',
      originalRangeText: null, // Source report provided no range -> NULL
      interpretation: 'REFERENCE_UNAVAILABLE', // Zero guessed ranges
      testDate: new Date('2026-09-05T11:15:00Z'),
      provenanceSource: 'DOCUMENT_EXTRACTED',
      sourcePageNumber: 1,
      sourceOriginalSnippet: 'Ferritin: 45 ng/mL\n(Ref: Unavailable)',
      confidenceScore: 0.970,
      verificationStatus: 'VERIFIED',
    },
  });

  // 9. Seed Medications (Conflicting Metformin records)
  const medReport = await prisma.medication.create({
    data: {
      patientId: patient.id,
      documentId: report.id,
      drugName: 'Metformin',
      dosage: '1000 mg',
      normalizedDosageMg: 1000.0,
      frequency: 'Twice daily with meals',
      route: 'Oral',
      status: 'ACTIVE',
      originalValueText: 'Rx: Metformin 1000 mg PO twice daily with meals',
      reportDate: new Date('2026-09-05T11:15:00Z'),
      provenanceSource: 'DOCUMENT_EXTRACTED',
      sourcePageNumber: 1,
      sourceOriginalSnippet: 'Rx: Metformin 1000 mg PO twice daily with meals',
      confidenceScore: 0.960,
      verificationStatus: 'UNVERIFIED',
    },
  });

  const medIntake = await prisma.medication.create({
    data: {
      patientId: patient.id,
      drugName: 'Metformin',
      dosage: '500 mg',
      normalizedDosageMg: 500.0,
      frequency: 'Once daily with dinner',
      route: 'Oral',
      status: 'ACTIVE',
      originalValueText: 'Patient reported taking Metformin 500 mg with dinner',
      reportDate: new Date('2026-09-02T08:30:00Z'),
      provenanceSource: 'USER_PROVIDED',
      sourceOriginalSnippet: 'Patient intake form: Metformin 500 mg recorded Sep 2, 2026',
      confidenceScore: 1.0,
      verificationStatus: 'UNVERIFIED',
    },
  });

  // 10. Seed Allergies
  await prisma.allergy.create({
    data: {
      patientId: patient.id,
      documentId: report.id,
      allergen: 'Penicillin',
      reaction: 'Urticaria / Cutaneous rash',
      severity: 'MODERATE',
      originalValueText: 'Allergies: Penicillin (Reaction: Rash)',
      provenanceSource: 'DOCUMENT_EXTRACTED',
      sourcePageNumber: 1,
      confidenceScore: 0.980,
      verificationStatus: 'VERIFIED',
    },
  });

  // 11. Seed Symptoms & Conditions
  await prisma.symptom.create({
    data: {
      patientId: patient.id,
      symptomName: 'Persistent Fatigue',
      severity: 'MODERATE',
      onsetDate: new Date('2026-07-20'),
      durationDescription: '6 weeks',
      notes: 'Worsens in the afternoon, accompanied by mild cold sensitivity.',
      provenanceSource: 'USER_PROVIDED',
    },
  });

  await prisma.condition.create({
    data: {
      patientId: patient.id,
      conditionName: 'Microcytic Anemia State',
      clinicalStatus: 'ACTIVE',
      diagnosedDate: new Date('2026-09-02'),
      provenanceSource: 'DOCUMENT_EXTRACTED',
    },
  });

  // 12. Seed Observation
  await prisma.observation.create({
    data: {
      patientId: patient.id,
      documentId: report.id,
      category: 'CLINICIAN_NOTE',
      content: 'Microcytic hypochromic state noted on laboratory CBC review. Recommended dietary iron evaluation.',
      observationDate: new Date('2026-09-05T11:15:00Z'),
      provenanceSource: 'DOCUMENT_EXTRACTED',
      sourcePageNumber: 1,
    },
  });

  // 13. Seed Conflict Record
  const conflict = await prisma.conflict.create({
    data: {
      patientId: patient.id,
      conflictType: 'MEDICATION_INCONSISTENCY',
      entityType: 'MEDICATION',
      description: 'Potential conflict detected — human verification required: Metformin dosage differs between Patient Intake (500 mg) and Medical Report (1000 mg).',
      conflictingRecordsJson: JSON.stringify([
        {
          id: medIntake.id,
          source: 'Patient Intake',
          label: 'Metformin',
          value: '500 mg',
          date: '2026-09-02',
          confidence: '—',
        },
        {
          id: medReport.id,
          source: 'Medical Report (LabCorp_CBC_2026.pdf)',
          label: 'Metformin',
          value: '1000 mg',
          date: '2026-09-05',
          confidence: '96%',
        },
      ]),
      resolutionStatus: 'DETECTED',
      detectedAt: new Date('2026-09-05T11:16:10Z'),
    },
  });

  // 14. Seed Verifications
  const verifWbc = await prisma.verification.create({
    data: {
      patientId: patient.id,
      entityType: 'LAB_RESULT',
      entityId: labWbc.id,
      labResultId: labWbc.id,
      action: 'VERIFIED',
      verifiedBy: 'Dr. Sarah Jenkins, MD',
      clinicalReason: 'Standard normal CBC white blood cell count verified against LabCorp report.',
      verifiedAt: new Date('2026-09-05T11:20:00Z'),
    },
  });

  // 15. Seed Immutable Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        patientId: patient.id,
        entityType: 'LAB_RESULT',
        entityId: labHgb.id,
        action: 'AI_EXTRACTED',
        previousValuesJson: null,
        newValuesJson: JSON.stringify({ testName: 'Hemoglobin', measuredValue: '11.2', unit: 'g/dL' }),
        performedBy: 'AI_ENGINE',
        performerId: 'gemini-2.0-flash-parser-v2',
        reason: 'Hemoglobin = 11.2 g/dL extracted from LabCorp_CBC_2026.pdf',
        timestamp: new Date('2026-09-05T11:15:02Z'),
      },
      {
        patientId: patient.id,
        entityType: 'LAB_RESULT',
        entityId: labHgb.id,
        action: 'CONFIDENCE_EVALUATED',
        previousValuesJson: null,
        newValuesJson: JSON.stringify({ testName: 'Hemoglobin', confidenceScore: 0.984 }),
        performedBy: 'AI_ENGINE',
        reason: 'Extraction confidence: 98.4%',
        timestamp: new Date('2026-09-05T11:15:03Z'),
      },
      {
        patientId: patient.id,
        entityType: 'CONFLICT',
        entityId: conflict.id,
        action: 'CONFLICT_DETECTED',
        previousValuesJson: null,
        newValuesJson: JSON.stringify({ entity: 'Metformin', intake: '500 mg', report: '1000 mg' }),
        performedBy: 'AI_ENGINE',
        reason: 'Conflict detected: Metformin 500 mg vs 1000 mg',
        timestamp: new Date('2026-09-05T11:16:10Z'),
      },
      {
        patientId: patient.id,
        entityType: 'CONFLICT',
        entityId: conflict.id,
        action: 'VIEWED',
        previousValuesJson: null,
        newValuesJson: null,
        performedBy: 'USER',
        performerId: 'dr-sarah-jenkins',
        reason: 'Human reviewer opened conflict for inspection',
        timestamp: new Date('2026-09-05T11:17:42Z'),
      },
      {
        patientId: patient.id,
        entityType: 'LAB_RESULT',
        entityId: labWbc.id,
        verificationId: verifWbc.id,
        action: 'VERIFIED',
        previousValuesJson: JSON.stringify({ verificationStatus: 'UNVERIFIED' }),
        newValuesJson: JSON.stringify({ verificationStatus: 'VERIFIED' }),
        performedBy: 'USER',
        performerId: 'dr-sarah-jenkins',
        reason: 'Clinician accepted extracted WBC Count value',
        timestamp: new Date('2026-09-05T11:20:00Z'),
      },
    ],
  });

  // 16. Seed AI Summary
  await prisma.aISummary.create({
    data: {
      patientId: patient.id,
      summaryText: '2 reports processed. Hemoglobin (11.2 g/dL) is below the source reference range (13.0–17.0 g/dL). No diagnostic inference made.',
      keyFindingsJson: JSON.stringify([
        'Hemoglobin measured at 11.2 g/dL (Source reference range: 13.0–17.0 g/dL)',
        'WBC Count measured at 6.8 k/uL (Source reference range: 4.5–11.0 k/uL)',
        'Ferritin measured at 45 ng/mL (Source reference range unavailable)',
      ]),
      notableChangesJson: JSON.stringify([
        'Metformin dosage documented as 500 mg in intake and 1000 mg in diagnostic report',
      ]),
      missingInformationJson: JSON.stringify([
        'Source report provided no reference range for Ferritin assay',
      ]),
      guardrailVersion: 'v2.4-strict-neutral',
      isSourceGrounded: true,
      hasNoDiagnosticInference: true,
    },
  });

  // 17. Seed Timeline Events
  await prisma.timelineEvent.createMany({
    data: [
      {
        patientId: patient.id,
        eventDate: new Date('2026-09-02T08:30:00Z'),
        eventType: 'INTAKE',
        title: 'Initial Patient Intake Registered',
        subtitle: 'Patient intake form completed: Metformin 500 mg reported.',
        badgeText: 'Intake',
      },
      {
        patientId: patient.id,
        eventDate: new Date('2026-09-05T11:15:00Z'),
        eventType: 'LAB_REPORT',
        title: 'Lab Report Ingestion & Multimodal Extraction',
        subtitle: 'Processed LabCorp_CBC_2026.pdf (Hemoglobin, WBC, Ferritin extracted).',
        badgeText: 'Lab Report',
        sourceDocumentName: 'LabCorp_CBC_2026.pdf',
      },
      {
        patientId: patient.id,
        eventDate: new Date('2026-09-05T11:16:10Z'),
        eventType: 'CONFLICT',
        title: 'Potential Conflict Detected: Metformin',
        subtitle: 'Contradiction between intake (500 mg) and diagnostic report (1000 mg).',
        badgeText: 'Conflict Detected',
      },
    ],
  });

  console.log('✅ MedLens database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
