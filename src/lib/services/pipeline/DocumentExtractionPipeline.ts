import { DefaultPDFParser } from '../pdf/PDFParser';
import { OCRFactory } from '../ocr/OCRFactory';
import { GeminiAIExtractionService } from '../ai/AIExtractionService';
import { NormalizationService } from '../normalization/NormalizationService';
import { ProvenanceService } from '../provenance/ProvenanceService';
import { ConfidenceService } from '../confidence/ConfidenceService';
import { ConflictDetectionService } from '../conflicts/ConflictDetectionService';
import { AuditService } from '../audit/AuditService';
import { getStore } from '@/lib/dataStore';
import { ClinicalExtraction } from '../validation/schemas';

export interface PipelineOptions {
  patientId: string;
  documentId: string;
  documentBuffer: Buffer;
  fileName: string;
  mimeType?: string;
  documentType?: string;
}

export interface PipelineExecutionResult {
  success: boolean;
  documentId: string;
  patientId: string;
  extractionMethod: 'NATIVE_PDF' | 'OCR' | 'HYBRID';
  ocrProvider?: string;
  clinicalData: ClinicalExtraction;
  conflictsDetected: number;
  unverifiedCount: number;
  processingTimeMs: number;
}

export class DocumentExtractionPipeline {
  /**
   * Executes the entire end-to-end MedLens Extraction & AI Engine pipeline
   */
  static async processDocument(options: PipelineOptions): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const { patientId, documentId, documentBuffer, fileName, mimeType, documentType } = options;
    const store = getStore();

    // 1. Audit: Document Upload & Pipeline Start
    await AuditService.recordEvent({
      patientId,
      documentId,
      eventType: 'DOCUMENT_UPLOADED',
      reason: `Started extraction pipeline for ${fileName}`,
    });

    // 2. Step 1: Detect whether PDF contains machine-readable text
    const pdfParser = new DefaultPDFParser();
    const pdfTextResult = await pdfParser.extractText(documentBuffer);

    let extractedText = '';
    let extractionMethod: 'NATIVE_PDF' | 'OCR' | 'HYBRID' = 'NATIVE_PDF';
    let ocrProvider: string | undefined = undefined;
    let ocrConfidence = 0.984;

    await AuditService.recordEvent({
      patientId,
      documentId,
      eventType: 'PDF_PARSED',
      reason: `PDF text detection completed. Native text: ${pdfTextResult.hasMachineReadableText}`,
      metadata: { totalPages: pdfTextResult.totalPages, characterDensity: pdfTextResult.characterDensityPerPage },
    });

    if (pdfTextResult.hasMachineReadableText) {
      // Use native PDF text
      extractedText = pdfTextResult.fullText;
      extractionMethod = 'NATIVE_PDF';
    } else {
      // 3. Step 2: Route to Cloud OCR / Local Fallback
      await AuditService.recordEvent({
        patientId,
        documentId,
        eventType: 'OCR_STARTED',
        reason: 'Document is image-based/scanned. Invoking OCR service.',
      });

      const ocrResult = await OCRFactory.extractWithFallback(documentBuffer, fileName, (err, fallback) => {
        AuditService.recordEvent({
          patientId,
          documentId,
          eventType: 'OCR_STARTED',
          reason: `OCR primary failure (${err.message}). Switched to fallback provider '${fallback}'.`,
        });
      });

      extractedText = ocrResult.fullText;
      extractionMethod = ocrResult.extractionMethod;
      ocrProvider = ocrResult.provider;
      ocrConfidence = ocrResult.overallConfidence;

      await AuditService.recordEvent({
        patientId,
        documentId,
        eventType: 'OCR_COMPLETED',
        reason: `OCR extraction completed with provider '${ocrResult.provider}'.`,
        metadata: { confidence: ocrResult.overallConfidence, totalPages: ocrResult.totalPages },
      });
    }

    // 4. Step 3: Multimodal LLM Extraction
    await AuditService.recordEvent({
      patientId,
      documentId,
      eventType: 'AI_EXTRACTION_STARTED',
      reason: 'Dispatching content to AI Extraction Service.',
    });

    const aiService = new GeminiAIExtractionService();
    const rawExtracted = await aiService.extractClinicalData({
      text: extractedText,
      fileName,
      mimeType,
      documentId,
    });

    await AuditService.recordEvent({
      patientId,
      documentId,
      eventType: 'AI_EXTRACTION_COMPLETED',
      reason: `AI Extraction completed: ${rawExtracted.laboratoryResults.length} labs, ${rawExtracted.medications.length} meds.`,
    });

    // 5. Step 4: Normalization Layer & Deterministic Reference Range Rules
    const normalized = NormalizationService.normalizeClinicalData(rawExtracted);

    await AuditService.recordEvent({
      patientId,
      documentId,
      eventType: 'NORMALIZATION_COMPLETED',
      reason: 'Standardized test names and evaluated reference ranges deterministically.',
    });

    // 6. Step 5: Attach Verified Provenance & Calculate Extraction Confidence
    const enrichedWithProvenance = ProvenanceService.attachDocumentProvenance(
      normalized,
      documentId,
      ocrConfidence,
      extractionMethod === 'NATIVE_PDF' ? 'DOCUMENT_EXTRACTED' : 'OCR_EXTRACTED'
    );

    // Calculate individual confidence scores
    enrichedWithProvenance.laboratoryResults = enrichedWithProvenance.laboratoryResults.map(l => ({
      ...l,
      confidence: ConfidenceService.calculateLabConfidence(l, ocrConfidence),
    }));

    enrichedWithProvenance.medications = enrichedWithProvenance.medications.map(m => ({
      ...m,
      confidence: ConfidenceService.calculateMedicationConfidence(m, ocrConfidence),
    }));

    enrichedWithProvenance.allergies = enrichedWithProvenance.allergies.map(a => ({
      ...a,
      confidence: ConfidenceService.calculateAllergyConfidence(a, ocrConfidence),
    }));

    // 7. Step 6: Database Persistence
    const patient = await store.getPatientById(patientId);

    // Save Lab Results
    for (const l of enrichedWithProvenance.laboratoryResults) {
      await store.addLabResult({
        patientId,
        documentId,
        testName: l.testName,
        measuredValue: l.value,
        numericValue: l.numericValue,
        unit: l.unit,
        referenceRangeText: l.referenceRange,
        refRangeLow: l.referenceLow,
        refRangeHigh: l.referenceHigh,
        interpretation: l.status,
        provenanceSource: l.provenance?.sourceType || 'DOCUMENT_EXTRACTED',
        sourcePageNumber: l.pageNumber || 1,
        sourceOriginalSnippet: l.sourceText,
        confidenceScore: l.confidence,
        verificationStatus: l.confidence < 0.90 ? 'UNVERIFIED' : 'UNVERIFIED',
      });
    }

    // Save Medications
    for (const m of enrichedWithProvenance.medications) {
      await store.addMedication({
        patientId,
        documentId,
        drugName: m.drugName,
        dosage: m.dose,
        frequency: m.frequency,
        route: m.route || 'Oral',
        status: m.status as any,
        provenanceSource: m.provenance?.sourceType || 'DOCUMENT_EXTRACTED',
        sourcePageNumber: m.pageNumber || 1,
        sourceOriginalSnippet: m.sourceText,
        confidenceScore: m.confidence,
        verificationStatus: 'UNVERIFIED',
      });
    }

    // Save Allergies
    for (const a of enrichedWithProvenance.allergies) {
      await store.addAllergy({
        patientId,
        documentId,
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity as any,
        provenanceSource: a.provenance?.sourceType || 'DOCUMENT_EXTRACTED',
        sourcePageNumber: a.pageNumber || 1,
        sourceOriginalSnippet: a.sourceText,
        confidenceScore: a.confidence,
        verificationStatus: 'UNVERIFIED',
      });
    }

    // Save Conditions
    for (const c of enrichedWithProvenance.conditions) {
      await store.addCondition({
        patientId,
        documentId,
        conditionName: c.condition,
        clinicalStatus: c.clinicalStatus as any,
        provenanceSource: c.provenance?.sourceType || 'DOCUMENT_EXTRACTED',
        sourcePageNumber: c.pageNumber || 1,
        sourceOriginalSnippet: c.sourceText,
        confidenceScore: c.confidence,
        verificationStatus: 'UNVERIFIED',
      });
    }

    // 8. Step 7: Conflict Detection & Human Review Flagging
    let detectedConflictsCount = 0;
    if (patient) {
      const conflicts = ConflictDetectionService.detectConflicts(patient, enrichedWithProvenance, documentId);
      for (const conf of conflicts) {
        await store.addConflict({
          patientId,
          conflictType: conf.conflictType,
          entityType: conf.entityType,
          description: conf.description,
          conflictingRecordsJson: JSON.stringify(conf.conflictingRecords),
          resolutionStatus: 'DETECTED',
        });
        detectedConflictsCount++;

        await AuditService.recordEvent({
          patientId,
          documentId,
          eventType: 'CONFLICT_DETECTED',
          entityType: conf.entityType,
          reason: conf.description,
        });
      }
    }

    return {
      success: true,
      documentId,
      patientId,
      extractionMethod,
      ocrProvider,
      clinicalData: enrichedWithProvenance,
      conflictsDetected: detectedConflictsCount,
      unverifiedCount:
        enrichedWithProvenance.laboratoryResults.length +
        enrichedWithProvenance.medications.length +
        enrichedWithProvenance.allergies.length,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
