import { Provenance, ClinicalExtraction } from '../validation/schemas';
import { BoundingBox, ProvenanceRecord, ProvenanceType } from './ProvenanceTypes';
import { provenanceEngine } from './ProvenanceEngine';

export class ProvenanceService {
  /**
   * Creates a standardized Provenance record
   */
  static createProvenance(params: {
    sourceType?: 'DOCUMENT_EXTRACTED' | 'OCR_EXTRACTED' | 'AI_EXTRACTED' | 'HUMAN_VERIFIED' | 'USER_PROVIDED';
    sourceDocumentId: string;
    pageNumber: number;
    sourceText: string;
    confidence: number;
    boundingBox?: BoundingBox | null;
    timestamp?: string;
  }): Provenance {
    return {
      sourceType: params.sourceType || 'DOCUMENT_EXTRACTED',
      sourceDocumentId: params.sourceDocumentId,
      pageNumber: Math.max(1, params.pageNumber),
      sourceText: params.sourceText,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      extractionTimestamp: params.timestamp || new Date().toISOString(),
      boundingBox: params.boundingBox || null,
    };
  }

  /**
   * Enriches an entire ClinicalExtraction payload by attaching verified provenance to every entity.
   */
  static attachDocumentProvenance(
    data: ClinicalExtraction,
    sourceDocumentId: string,
    defaultConfidence = 0.984,
    sourceType: 'DOCUMENT_EXTRACTED' | 'OCR_EXTRACTED' | 'AI_EXTRACTED' | 'USER_PROVIDED' = 'DOCUMENT_EXTRACTED'
  ): ClinicalExtraction {
    const timestamp = new Date().toISOString();

    return {
      ...data,
      patient: data.patient
        ? {
            ...data.patient,
            provenance: data.patient.provenance || this.createProvenance({
              sourceType,
              sourceDocumentId,
              pageNumber: 1,
              sourceText: data.patient.sourceText || `Patient: ${data.patient.fullName || ''}`,
              confidence: data.patient.confidence || defaultConfidence,
              timestamp,
            }),
          }
        : undefined,
      laboratoryResults: (data.laboratoryResults || []).map(l => ({
        ...l,
        provenance: l.provenance || this.createProvenance({
          sourceType,
          sourceDocumentId,
          pageNumber: l.pageNumber || 1,
          sourceText: l.sourceText || `${l.testName}: ${l.value} ${l.unit || ''}`,
          confidence: l.confidence || defaultConfidence,
          timestamp,
        }),
      })),
      medications: (data.medications || []).map(m => ({
        ...m,
        provenance: m.provenance || this.createProvenance({
          sourceType,
          sourceDocumentId,
          pageNumber: m.pageNumber || 1,
          sourceText: m.sourceText || `${m.drugName} ${m.dose || ''}`,
          confidence: m.confidence || defaultConfidence,
          timestamp,
        }),
      })),
      allergies: (data.allergies || []).map(a => ({
        ...a,
        provenance: a.provenance || this.createProvenance({
          sourceType,
          sourceDocumentId,
          pageNumber: a.pageNumber || 1,
          sourceText: a.sourceText || a.allergen,
          confidence: a.confidence || defaultConfidence,
          timestamp,
        }),
      })),
      conditions: (data.conditions || []).map(c => ({
        ...c,
        provenance: c.provenance || this.createProvenance({
          sourceType,
          sourceDocumentId,
          pageNumber: c.pageNumber || 1,
          sourceText: c.sourceText || c.condition,
          confidence: c.confidence || defaultConfidence,
          timestamp,
        }),
      })),
      symptoms: (data.symptoms || []).map(s => ({
        ...s,
        provenance: s.provenance || this.createProvenance({
          sourceType,
          sourceDocumentId,
          pageNumber: s.pageNumber || 1,
          sourceText: s.sourceText || s.symptom,
          confidence: s.confidence || defaultConfidence,
          timestamp,
        }),
      })),
      observations: (data.observations || []).map(o => ({
        ...o,
        provenance: o.provenance || this.createProvenance({
          sourceType,
          sourceDocumentId,
          pageNumber: o.pageNumber || 1,
          sourceText: o.sourceText || o.content,
          confidence: o.confidence || defaultConfidence,
          timestamp,
        }),
      })),
    };
  }

  // Delegate methods to ProvenanceEngine singleton
  static async getProvenance(id: string): Promise<ProvenanceRecord | null> {
    return provenanceEngine.getProvenance(id);
  }

  static async getProvenanceHistory(entityId: string): Promise<ProvenanceRecord[]> {
    return provenanceEngine.getProvenanceHistory(entityId);
  }
}

export * from './ProvenanceTypes';
export * from './ProvenanceEngine';
