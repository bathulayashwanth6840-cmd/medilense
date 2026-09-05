import { getStore } from '@/lib/dataStore';
import { v4 as uuidv4 } from 'uuid';

export type AuditEventType =
  | 'DOCUMENT_UPLOADED'
  | 'PDF_PARSED'
  | 'OCR_STARTED'
  | 'OCR_COMPLETED'
  | 'AI_EXTRACTION_STARTED'
  | 'AI_EXTRACTION_COMPLETED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'NORMALIZATION_COMPLETED'
  | 'CONFLICT_DETECTED'
  | 'HUMAN_OPENED_RECORD'
  | 'HUMAN_EDITED_RECORD'
  | 'HUMAN_ACCEPTED_RECORD'
  | 'HUMAN_REJECTED_RECORD';

export interface AuditEntry {
  id: string;
  patientId: string;
  documentId?: string | null;
  eventType: AuditEventType;
  entityType?: string;
  entityId?: string;
  actor: 'USER' | 'AI_ENGINE' | 'SYSTEM';
  actorId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Records an immutable audit log entry
   */
  static async recordEvent(params: {
    patientId: string;
    documentId?: string | null;
    eventType: AuditEventType;
    entityType?: string;
    entityId?: string;
    actor?: 'USER' | 'AI_ENGINE' | 'SYSTEM';
    actorId?: string;
    previousValue?: any;
    newValue?: any;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditEntry> {
    const store = getStore();
    const entryId = uuidv4();
    const timestamp = new Date().toISOString();

    const entry: AuditEntry = {
      id: entryId,
      patientId: params.patientId,
      documentId: params.documentId || null,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor || 'SYSTEM',
      actorId: params.actorId || 'medlens-engine',
      previousValue: params.previousValue,
      newValue: params.newValue,
      reason: params.reason,
      timestamp,
      metadata: params.metadata,
    };

    // Store in data store audit log map
    await store.logAudit(
      params.patientId,
      (params.entityType as any) || 'DOCUMENT',
      params.entityId || params.documentId || entryId,
      this.mapToStoreAuditAction(params.eventType),
      params.previousValue,
      params.newValue,
      params.actor || 'SYSTEM',
      params.reason || `Audit event: ${params.eventType}`
    );

    return entry;
  }

  private static mapToStoreAuditAction(eventType: AuditEventType): any {
    switch (eventType) {
      case 'DOCUMENT_UPLOADED':
        return 'CREATED';
      case 'AI_EXTRACTION_COMPLETED':
        return 'AI_EXTRACTED';
      case 'HUMAN_ACCEPTED_RECORD':
        return 'VERIFIED';
      case 'HUMAN_EDITED_RECORD':
        return 'EDITED';
      case 'HUMAN_REJECTED_RECORD':
        return 'REJECTED';
      case 'CONFLICT_DETECTED':
        return 'CONFLICT_DETECTED';
      case 'HUMAN_OPENED_RECORD':
        return 'VIEWED';
      default:
        return 'CONFIDENCE_EVALUATED';
    }
  }
}
