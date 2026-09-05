import crypto from 'crypto';
import { getStore } from '@/lib/dataStore';
import { saveUploadedFile } from '@/lib/storage/secureStorage';
import { extractFromDocument } from '@/lib/ai/gemini';
import { evaluateReferenceRange } from '@/lib/ai/parsers';
import { detectClinicalConflicts } from '@/lib/ai/conflictEngine';
import { sanitizeClinicalText } from '@/lib/security/auth';
import { 
  PatientIntakeFormData, 
  PatientIntakeFormSchema,
  DirectTextInputSchema,
  ProcessingStatusEnum
} from '@/lib/validation/schemas';
import { DocumentRecord, PatientRecord } from '@/types/clinical';
import { z } from 'zod';

/**
 * Extracts text content from a PDF file buffer using pdf-parse v2.
 * Returns the extracted text or null if extraction fails.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string | null> {
  try {
    const { PDFParse } = await import('pdf-parse');
    // pdf-parse v2 marks some methods as private in types but they are accessible at runtime
    const parser: any = new PDFParse({ data: new Uint8Array(buffer) });
    await parser.load();
    
    // getText() returns all text from the document
    const fullText: string = await parser.getText();
    
    if (fullText && fullText.trim().length > 0) {
      return fullText;
    }
    
    // Fallback: try page by page extraction
    const pageTexts: string[] = [];
    const numPages = parser.doc?.numPages || 0;
    for (let i = 1; i <= numPages; i++) {
      try {
        const pageText = await parser.getPageText(i);
        if (pageText && pageText.trim()) {
          pageTexts.push(pageText);
        }
      } catch {
        // Skip unreadable pages
      }
    }
    
    const combinedText = pageTexts.join('\n\n');
    if (combinedText.trim().length > 0) {
      return combinedText;
    }
    return null;
  } catch (err: any) {
    console.warn('PDF text extraction failed:', err.message);
    return null;
  }
}

/**
 * Performs Optical Character Recognition (OCR) on an image file buffer using Tesseract.js.
 * Returns the extracted text transcript or null if OCR fails or times out.
 */
async function extractTextFromImage(buffer: Buffer): Promise<string | null> {
  try {
    const ocrPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      await worker.terminate();
      if (ret && ret.data && ret.data.text && ret.data.text.trim().length > 3) {
        return ret.data.text.trim();
      }
      return null;
    })();

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    return await Promise.race([ocrPromise, timeoutPromise]);
  } catch (err: any) {
    console.warn('Tesseract OCR extraction failed:', err?.message || err);
    return null;
  }
}

/**
 * Extracts readable text from a file buffer based on its MIME type.
 * Supports PDF parsing, plain text, and real Tesseract OCR for image files.
 */
async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  originalFileName: string,
): Promise<string> {
  // 1. For text-based files, read directly as UTF-8
  if (
    mimeType.includes('text') ||
    originalFileName.toLowerCase().endsWith('.txt')
  ) {
    return buffer.toString('utf-8');
  }

  // 2. For image files (scans, photos), run Tesseract.js OCR
  if (
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(originalFileName)
  ) {
    const ocrText = await extractTextFromImage(buffer);
    if (ocrText && ocrText.trim().length > 5) {
      return ocrText;
    }
  }

  // 3. For PDF files, use pdf-parse library for text extraction
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/octet-stream' ||
    originalFileName.toLowerCase().endsWith('.pdf')
  ) {
    const pdfText = await extractTextFromPDF(buffer);
    if (pdfText && pdfText.trim().length > 10) {
      return pdfText;
    }
    
    // If pdf-parse returned nothing (scanned PDF), try Tesseract OCR
    const scannedPdfOcr = await extractTextFromImage(buffer);
    if (scannedPdfOcr && scannedPdfOcr.trim().length > 5) {
      return scannedPdfOcr;
    }

    // Try raw UTF-8 as fallback
    const rawUtf8 = buffer.toString('utf-8');
    const alphaRatio = (rawUtf8.match(/[a-zA-Z0-9]/g) || []).length / Math.max(rawUtf8.length, 1);
    if (alphaRatio > 0.3 && rawUtf8.length > 20) {
      return rawUtf8;
    }
    
    return `[Scanned PDF Document: ${originalFileName}]\nNo readable text could be recognized from this scanned PDF.`;
  }

  // 4. Last resort: try UTF-8 interpretation
  const rawUtf8 = buffer.toString('utf-8');
  if (rawUtf8.trim().length > 10) {
    return rawUtf8;
  }

  return `[Unrecognized Document Format: ${originalFileName}]\nCould not extract text content from this file.`;
}

export type ProcessingStatus = z.infer<typeof ProcessingStatusEnum>;

export interface IngestionResult {
  success: boolean;
  documentId?: string;
  patientId: string;
  processingStatus: ProcessingStatus;
  stagesCompleted: ProcessingStatus[];
  extractedCounts: {
    labs: number;
    medications: number;
    allergies: number;
    conditions: number;
    observations: number;
  };
  conflictsDetected: number;
  fileHashSha256?: string;
  error?: string;
}

export class MedLensIngestionEngine {
  /**
   * METHOD A: PDF & Document Upload Pipeline
   * Handles multi-part files, validation, secure private storage, SHA-256 checksumming,
   * multimodal extraction, zero-guess reference range normalization, and 8-stage state tracking.
   */
  static async ingestDocumentFile(params: {
    fileBuffer: Buffer;
    originalFileName: string;
    mimeType: string;
    patientId: string;
    documentType?: string;
  }): Promise<IngestionResult> {
    const { fileBuffer, originalFileName, mimeType, patientId } = params;
    const documentType = params.documentType || 'LAB_REPORT';
    const stagesCompleted: ProcessingStatus[] = [];
    const store = getStore();

    // Verify patient exists
    const patient = await store.getPatientById(patientId);
    if (!patient) {
      throw new Error(`Patient with ID '${patientId}' not found.`);
    }

    let docRecord: DocumentRecord | null = null;

    try {
      // 1. STAGE: UPLOADED - Validate and write to secure non-public storage
      const storedFile = await saveUploadedFile(fileBuffer, originalFileName, mimeType);
      stagesCompleted.push('UPLOADED');

      // 2. STAGE: QUEUED - Create document record in database
      docRecord = await store.addDocument({
        patientId,
        originalFileName: storedFile.sanitizedFileName,
        fileType: storedFile.mimeType,
        fileSizeBytes: storedFile.fileSizeBytes,
        fileHashSha256: storedFile.fileHashSha256,
        storagePath: storedFile.storagePath,
        documentType,
        processingStatus: 'QUEUED',
        reportDate: new Date(),
        rawExtractedText: '',
      });
      stagesCompleted.push('QUEUED');

      // 3. STAGE: PROCESSING - Initialize parsing pipeline
      docRecord.processingStatus = 'PROCESSING';
      stagesCompleted.push('PROCESSING');

      // 4. STAGE: EXTRACTING - Multimodal text extraction & AI Parsing
      stagesCompleted.push('EXTRACTING');
      const extractedText = await extractTextFromBuffer(fileBuffer, mimeType, originalFileName);
      docRecord.rawExtractedText = extractedText;

      // Extract and update patient metadata if document header contains patient info
      if (extractedText && patient) {
        const nameMatch = extractedText.match(/(?:patient(?:\s*name)?|pt(?:\s*name)?)\s*[:\s]+\s*([a-zA-Z\s,.'-]+?)(?:\r?\n|\||MRN|DOB|Date|$)/i);
        const mrnMatch = extractedText.match(/(?:mrn|patient\s*id|acct\.?|id)\s*[:\s#]+\s*([a-zA-Z0-9\-]+)/i);
        const dobMatch = extractedText.match(/(?:dob|date\s*of\s*birth|d\.o\.b\.?)\s*[:\s]+\s*([0-9/\-]+)/i);
        
        const updates: any = {};
        if (nameMatch && nameMatch[1]) {
          const nm = nameMatch[1].trim();
          if (nm.length > 2 && nm.length < 60 && (patient.fullName.includes('New Patient') || patient.fullName.includes('Record') || patient.fullName.includes('.pdf') || patient.fullName.includes('.txt'))) {
            updates.fullName = nm;
          }
        }
        if (mrnMatch && mrnMatch[1]) {
          const mrn = mrnMatch[1].trim();
          if (mrn.length > 2 && mrn.length < 40) {
            updates.identifier = mrn;
          }
        }
        if (dobMatch && dobMatch[1]) {
          updates.dateOfBirth = dobMatch[1].trim();
        }
        if (Object.keys(updates).length > 0) {
          await store.updatePatient(patientId, updates);
        }
      }

      const imageBase64 = (mimeType.startsWith('image/') || mimeType === 'application/pdf') ? fileBuffer.toString('base64') : undefined;
      const extracted = await extractFromDocument(extractedText, storedFile.sanitizedFileName, imageBase64, mimeType);

      // 5. STAGE: VALIDATING - Apply strict schemas & zero-guess reference ranges
      stagesCompleted.push('VALIDATING');
      let labsCount = 0;
      let medsCount = 0;
      let allergiesCount = 0;
      let conditionsCount = 0;
      let observationsCount = 0;

      // Ingest Lab Results with strict source reference ranges
      for (const l of extracted.labResults) {
        const parsedRange = evaluateReferenceRange(l.measuredValue, l.referenceRangeText);
        await store.addLabResult({
          patientId,
          documentId: docRecord.id,
          testName: l.testName,
          testCategory: l.testCategory || 'Automated Laboratory Extraction',
          measuredValue: l.measuredValue,
          numericValue: parsedRange.numericValue,
          unit: l.unit,
          referenceRangeText: parsedRange.rawRangeText,
          refRangeLow: parsedRange.refRangeLow,
          refRangeHigh: parsedRange.refRangeHigh,
          interpretation: parsedRange.interpretation,
          provenanceSource: 'DOCUMENT_EXTRACTED',
          sourcePageNumber: l.sourcePageNumber || 1,
          sourceOriginalSnippet: l.sourceOriginalSnippet || `${l.testName}: ${l.measuredValue} ${l.unit || ''}`,
          confidenceScore: l.confidenceScore || 0.95,
          verificationStatus: 'UNVERIFIED',
        });
        labsCount++;
      }

      // Ingest Medications
      for (const m of extracted.medications) {
        await store.addMedication({
          patientId,
          documentId: docRecord.id,
          drugName: m.drugName,
          dosage: m.dosage,
          frequency: m.frequency,
          route: m.route || 'Oral',
          status: (m.status as any) || 'ACTIVE',
          provenanceSource: 'DOCUMENT_EXTRACTED',
          sourcePageNumber: m.sourcePageNumber || 1,
          sourceOriginalSnippet: m.sourceOriginalSnippet || `${m.drugName} ${m.dosage || ''}`,
          confidenceScore: m.confidenceScore || 0.95,
          verificationStatus: 'UNVERIFIED',
        });
        medsCount++;
      }

      // Ingest Allergies
      for (const a of extracted.allergies) {
        await store.addAllergy({
          patientId,
          documentId: docRecord.id,
          allergen: a.allergen,
          reaction: a.reaction,
          severity: (a.severity as any) || 'UNKNOWN',
          provenanceSource: 'DOCUMENT_EXTRACTED',
          sourcePageNumber: a.sourcePageNumber || 1,
          sourceOriginalSnippet: a.sourceOriginalSnippet || a.allergen,
          confidenceScore: a.confidenceScore || 0.95,
          verificationStatus: 'UNVERIFIED',
        });
        allergiesCount++;
      }

      // Ingest Conditions
      for (const c of extracted.conditions) {
        await store.addCondition({
          patientId,
          documentId: docRecord.id,
          conditionName: c.conditionName,
          icd10Code: c.icd10Code,
          clinicalStatus: (c.clinicalStatus as any) || 'ACTIVE',
          provenanceSource: 'DOCUMENT_EXTRACTED',
          sourcePageNumber: c.sourcePageNumber || 1,
          sourceOriginalSnippet: c.sourceOriginalSnippet || c.conditionName,
          confidenceScore: c.confidenceScore || 0.95,
          verificationStatus: 'UNVERIFIED',
        });
        conditionsCount++;
      }

      // Ingest Observations
      for (const o of extracted.observations) {
        await store.addObservation({
          patientId,
          documentId: docRecord.id,
          category: o.category || 'CLINICIAN_NOTE',
          content: o.content,
          provenanceSource: 'DOCUMENT_EXTRACTED',
          sourcePageNumber: o.sourcePageNumber || 1,
          sourceOriginalSnippet: o.sourceOriginalSnippet || o.content,
          confidenceScore: o.confidenceScore || 0.95,
          verificationStatus: 'UNVERIFIED',
        });
        observationsCount++;
      }

      // 6. STAGE: READY_FOR_REVIEW - Run Conflict Detection and queue for clinician verification
      stagesCompleted.push('READY_FOR_REVIEW');
      let conflictsCount = 0;
      const freshPatient = await store.getPatientById(patientId);
      if (freshPatient) {
        const detectedConflicts = detectClinicalConflicts(freshPatient);
        for (const dc of detectedConflicts) {
          const existingConf = (freshPatient.conflicts || []).find(
            c => c.conflictType === dc.conflictType && c.description === dc.description
          );
          if (!existingConf) {
            await store.addConflict({
              patientId,
              conflictType: dc.conflictType,
              entityType: dc.entityType,
              description: dc.description,
              conflictingRecordsJson: JSON.stringify(dc.conflictingRecords),
              resolutionStatus: 'DETECTED',
            });
            conflictsCount++;
          }
        }
      }

      // 7. STAGE: COMPLETED
      stagesCompleted.push('COMPLETED');
      docRecord.processingStatus = 'COMPLETED';

      // Audit log
      await store.logAudit(
        patientId,
        'DOCUMENT',
        docRecord.id,
        'CREATED',
        null,
        docRecord,
        'SYSTEM',
        `Completed document ingestion: ${storedFile.sanitizedFileName} (${labsCount} labs, ${medsCount} meds, ${allergiesCount} allergies)`
      );

      return {
        success: true,
        documentId: docRecord.id,
        patientId,
        processingStatus: 'COMPLETED',
        stagesCompleted,
        extractedCounts: {
          labs: labsCount,
          medications: medsCount,
          allergies: allergiesCount,
          conditions: conditionsCount,
          observations: observationsCount,
        },
        conflictsDetected: conflictsCount,
        fileHashSha256: storedFile.fileHashSha256,
      };
    } catch (err: any) {
      stagesCompleted.push('FAILED');
      if (docRecord) {
        docRecord.processingStatus = 'FAILED';
      }
      return {
        success: false,
        documentId: docRecord?.id,
        patientId,
        processingStatus: 'FAILED',
        stagesCompleted,
        extractedCounts: { labs: 0, medications: 0, allergies: 0, conditions: 0, observations: 0 },
        conflictsDetected: 0,
        error: err.message || 'Ingestion failure',
      };
    }
  }

  /**
   * METHOD B: Direct Text Input Pipeline
   * Allows clinicians to paste raw notes, reports, and narratives.
   * Explicitly tags all created records with provenanceSource = 'USER_PROVIDED'.
   */
  static async ingestDirectTextInput(params: {
    patientId: string;
    rawText: string;
    originalFileName?: string;
    documentType?: string;
  }): Promise<IngestionResult> {
    // Validate schema
    const validated = DirectTextInputSchema.parse({
      patientId: params.patientId,
      rawText: params.rawText,
      originalFileName: params.originalFileName || 'Manual_Clinical_Entry.txt',
      documentType: params.documentType || 'CLINICIAN_NOTE',
      provenanceSource: 'USER_PROVIDED',
    });

    const store = getStore();
    const patient = await store.getPatientById(validated.patientId);
    if (!patient) {
      throw new Error(`Patient with ID '${validated.patientId}' not found.`);
    }

    const sanitizedText = sanitizeClinicalText(validated.rawText);
    const fileSizeBytes = Buffer.byteLength(sanitizedText, 'utf-8');
    const fileHashSha256 = crypto.createHash('sha256').update(sanitizedText).digest('hex');

    // 1. Create Document Record with USER_PROVIDED metadata
    const docRecord = await store.addDocument({
      patientId: validated.patientId,
      originalFileName: validated.originalFileName,
      fileType: 'text/plain',
      fileSizeBytes,
      fileHashSha256,
      documentType: validated.documentType,
      rawExtractedText: sanitizedText,
      processingStatus: 'COMPLETED',
      reportDate: new Date(),
    });

    // 2. Extract structured entities and enforce USER_PROVIDED provenance
    const extracted = await extractFromDocument(sanitizedText, validated.originalFileName);

    let labsCount = 0;
    let medsCount = 0;
    let allergiesCount = 0;
    let conditionsCount = 0;
    let observationsCount = 0;

    for (const l of extracted.labResults) {
      const parsedRange = evaluateReferenceRange(l.measuredValue, l.referenceRangeText);
      await store.addLabResult({
        patientId: validated.patientId,
        documentId: docRecord.id,
        testName: l.testName,
        testCategory: l.testCategory || 'User Entered Laboratory Value',
        measuredValue: l.measuredValue,
        numericValue: parsedRange.numericValue,
        unit: l.unit,
        referenceRangeText: parsedRange.rawRangeText,
        refRangeLow: parsedRange.refRangeLow,
        refRangeHigh: parsedRange.refRangeHigh,
        interpretation: parsedRange.interpretation,
        provenanceSource: 'USER_PROVIDED', // EXPLICIT PROVENANCE LABEL
        sourcePageNumber: 1,
        sourceOriginalSnippet: l.sourceOriginalSnippet || `${l.testName}: ${l.measuredValue} ${l.unit || ''}`,
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED',
      });
      labsCount++;
    }

    for (const m of extracted.medications) {
      await store.addMedication({
        patientId: validated.patientId,
        documentId: docRecord.id,
        drugName: m.drugName,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route || 'Oral',
        status: (m.status as any) || 'ACTIVE',
        provenanceSource: 'USER_PROVIDED', // EXPLICIT PROVENANCE LABEL
        sourcePageNumber: 1,
        sourceOriginalSnippet: m.sourceOriginalSnippet || `${m.drugName} ${m.dosage || ''}`,
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED',
      });
      medsCount++;
    }

    for (const a of extracted.allergies) {
      await store.addAllergy({
        patientId: validated.patientId,
        documentId: docRecord.id,
        allergen: a.allergen,
        reaction: a.reaction,
        severity: (a.severity as any) || 'UNKNOWN',
        provenanceSource: 'USER_PROVIDED', // EXPLICIT PROVENANCE LABEL
        sourcePageNumber: 1,
        sourceOriginalSnippet: a.sourceOriginalSnippet || a.allergen,
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED',
      });
      allergiesCount++;
    }

    for (const c of extracted.conditions) {
      await store.addCondition({
        patientId: validated.patientId,
        documentId: docRecord.id,
        conditionName: c.conditionName,
        icd10Code: c.icd10Code,
        clinicalStatus: (c.clinicalStatus as any) || 'ACTIVE',
        provenanceSource: 'USER_PROVIDED', // EXPLICIT PROVENANCE LABEL
        sourcePageNumber: 1,
        sourceOriginalSnippet: c.sourceOriginalSnippet || c.conditionName,
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED',
      });
      conditionsCount++;
    }

    for (const o of extracted.observations) {
      await store.addObservation({
        patientId: validated.patientId,
        documentId: docRecord.id,
        category: 'CLINICIAN_NOTE',
        content: o.content,
        provenanceSource: 'USER_PROVIDED', // EXPLICIT PROVENANCE LABEL
        sourcePageNumber: 1,
        sourceOriginalSnippet: o.sourceOriginalSnippet || o.content,
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED',
      });
      observationsCount++;
    }

    // Run conflict detection
    let conflictsCount = 0;
    const freshPatient = await store.getPatientById(validated.patientId);
    if (freshPatient) {
      const detectedConflicts = detectClinicalConflicts(freshPatient);
      for (const dc of detectedConflicts) {
        const existingConf = (freshPatient.conflicts || []).find(
          c => c.conflictType === dc.conflictType && c.description === dc.description
        );
        if (!existingConf) {
          await store.addConflict({
            patientId: validated.patientId,
            conflictType: dc.conflictType,
            entityType: dc.entityType,
            description: dc.description,
            conflictingRecordsJson: JSON.stringify(dc.conflictingRecords),
            resolutionStatus: 'DETECTED',
          });
          conflictsCount++;
        }
      }
    }

    await store.logAudit(
      validated.patientId,
      'DOCUMENT',
      docRecord.id,
      'CREATED',
      null,
      docRecord,
      'USER',
      `Ingested user-provided clinical text: ${validated.originalFileName}`
    );

    return {
      success: true,
      documentId: docRecord.id,
      patientId: validated.patientId,
      processingStatus: 'COMPLETED',
      stagesCompleted: ['UPLOADED', 'QUEUED', 'PROCESSING', 'EXTRACTING', 'VALIDATING', 'READY_FOR_REVIEW', 'COMPLETED'],
      extractedCounts: {
        labs: labsCount,
        medications: medsCount,
        allergies: allergiesCount,
        conditions: conditionsCount,
        observations: observationsCount,
      },
      conflictsDetected: conflictsCount,
      fileHashSha256,
    };
  }

  /**
   * METHOD C: Structured Patient Intake Form Pipeline
   * Validates full patient demographic and clinical payload with Zod,
   * generates Patient Record, Patient Profile, and seeds USER_PROVIDED clinical elements.
   */
  static async ingestStructuredPatientForm(intakeData: PatientIntakeFormData): Promise<{
    patient: PatientRecord;
    ingestionResult: IngestionResult;
  }> {
    // 1. Strict Server-Side Validation
    const validated = PatientIntakeFormSchema.parse(intakeData);

    const store = getStore();

    // 2. Format clinical narrative & composite notes
    const narrativeLines: string[] = [
      `=== MEDLENS STRUCTURED PATIENT INTAKE ===`,
      `Patient Name: ${validated.fullName}`,
      `Identifier / MRN: ${validated.identifier}`,
      `Date of Birth: ${validated.dateOfBirth || 'Not specified'}`,
      `Sex: ${validated.sex}`,
      `Blood Type: ${validated.bloodType || 'Unknown'}`,
      `Contact: ${validated.contactNumber || 'None provided'}`,
      `Emergency Contact: ${validated.emergencyContact || 'None provided'}`,
      ``,
      `--- PRESENTING SYMPTOMS ---`,
      validated.symptoms || 'None reported at intake.',
      ``,
      `--- ACTIVE MEDICATIONS ---`,
      validated.medications ? `Rx: ${validated.medications}` : 'No active medications reported.',
      ``,
      `--- DOCUMENTED ALLERGIES ---`,
      validated.allergies ? `Allergy: ${validated.allergies}` : 'No known drug allergies (NKDA).',
      ``,
      `--- EXISTING CONDITIONS & MEDICAL HISTORY ---`,
      validated.existingConditions ? `Assessment: ${validated.existingConditions}` : 'No chronic conditions reported.',
      validated.medicalHistory ? `Past History: ${validated.medicalHistory}` : '',
      ``,
      `--- ADDITIONAL CLINICAL NOTES ---`,
      validated.additionalNotes || 'Baseline structured intake record.',
    ];

    const fullNarrative = narrativeLines.filter(Boolean).join('\n');

    // 3. Create Patient Record
    const patient = await store.createPatient({
      identifier: validated.identifier,
      fullName: validated.fullName,
      dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : null,
      sex: validated.sex,
      contactNumber: validated.contactNumber || null,
      bloodType: validated.bloodType || null,
      emergencyContact: validated.emergencyContact || null,
      notes: fullNarrative,
    });

    // 4. Ingest Structured Clinical Narrative as Document with USER_PROVIDED provenance
    const ingestionResult = await this.ingestDirectTextInput({
      patientId: patient.id,
      rawText: fullNarrative,
      originalFileName: `Patient_Intake_${validated.identifier}.txt`,
      documentType: 'PATIENT_INTAKE_FORM',
    });

    // 5. Add Direct Clinical Entities if provided in individual fields
    if (validated.symptoms) {
      await store.addObservation({
        patientId: patient.id,
        category: 'SYMPTOM',
        content: `Reported Symptoms: ${validated.symptoms}`,
        provenanceSource: 'USER_PROVIDED',
        sourcePageNumber: 1,
        sourceOriginalSnippet: validated.symptoms,
        confidenceScore: 1.0,
        verificationStatus: 'UNVERIFIED',
      });
    }

    return {
      patient,
      ingestionResult,
    };
  }
}
