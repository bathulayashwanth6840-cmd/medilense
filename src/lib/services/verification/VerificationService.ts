import { getStore } from '@/lib/dataStore';
import { AuditService } from '../audit/AuditService';

export type VerificationStatusType = 'PENDING_REVIEW' | 'VERIFIED' | 'EDITED' | 'REJECTED' | 'CONFLICT';

export class VerificationService {
  /**
   * Evaluates whether an extracted entity requires human verification
   */
  static evaluateVerificationRequirement(params: {
    confidence: number;
    hasConflicts?: boolean;
    sourceEvidenceMissing?: boolean;
    ocrConfidenceLow?: boolean;
  }): { requiresReview: boolean; reason?: string; status: VerificationStatusType } {
    if (params.hasConflicts) {
      return {
        requiresReview: true,
        reason: 'Flagged: Clinical conflict detected across records.',
        status: 'CONFLICT',
      };
    }

    if (params.confidence < 0.90) {
      return {
        requiresReview: true,
        reason: `Flagged: Extraction confidence (${(params.confidence * 100).toFixed(1)}%) is below 90% threshold.`,
        status: 'PENDING_REVIEW',
      };
    }

    if (params.sourceEvidenceMissing) {
      return {
        requiresReview: true,
        reason: 'Flagged: Original document source text snippet is missing.',
        status: 'PENDING_REVIEW',
      };
    }

    if (params.ocrConfidenceLow) {
      return {
        requiresReview: true,
        reason: 'Flagged: Low OCR scan clarity.',
        status: 'PENDING_REVIEW',
      };
    }

    return {
      requiresReview: false,
      status: 'PENDING_REVIEW',
    };
  }

  /**
   * Accepts an extracted entity as clinically verified
   */
  static async acceptEntity(params: {
    patientId: string;
    entityType: 'LAB_RESULT' | 'MEDICATION' | 'ALLERGY' | 'CONDITION';
    entityId: string;
    verifiedBy?: string;
    notes?: string;
  }) {
    const store = getStore();
    const verifiedBy = params.verifiedBy || 'clinician-verifier';
    const now = new Date();

    if (params.entityType === 'LAB_RESULT') {
      const lab = store.labResults.get(params.entityId);
      if (lab) {
        const prev = { ...lab };
        lab.verificationStatus = 'VERIFIED';
        lab.verifiedBy = verifiedBy;
        lab.verifiedAt = now;
        lab.verificationNotes = params.notes || 'Accepted as verified';
        store.labResults.set(params.entityId, lab);

        await AuditService.recordEvent({
          patientId: params.patientId,
          documentId: lab.documentId,
          eventType: 'HUMAN_ACCEPTED_RECORD',
          entityType: 'LAB_RESULT',
          entityId: params.entityId,
          actor: 'USER',
          actorId: verifiedBy,
          previousValue: prev,
          newValue: lab,
          reason: params.notes || 'Accepted verified laboratory value',
        });
        return lab;
      }
    } else if (params.entityType === 'MEDICATION') {
      const med = store.medications.get(params.entityId);
      if (med) {
        const prev = { ...med };
        med.verificationStatus = 'VERIFIED';
        med.verifiedBy = verifiedBy;
        med.verifiedAt = now;
        med.verificationNotes = params.notes || 'Accepted as verified';
        store.medications.set(params.entityId, med);

        await AuditService.recordEvent({
          patientId: params.patientId,
          documentId: med.documentId,
          eventType: 'HUMAN_ACCEPTED_RECORD',
          entityType: 'MEDICATION',
          entityId: params.entityId,
          actor: 'USER',
          actorId: verifiedBy,
          previousValue: prev,
          newValue: med,
          reason: params.notes || 'Accepted verified medication',
        });
        return med;
      }
    }

    return null;
  }

  /**
   * Rejects an inaccurate or extraneous extracted entity
   */
  static async rejectEntity(params: {
    patientId: string;
    entityType: 'LAB_RESULT' | 'MEDICATION' | 'ALLERGY' | 'CONDITION';
    entityId: string;
    rejectedBy?: string;
    reason: string;
  }) {
    const store = getStore();
    const rejectedBy = params.rejectedBy || 'clinician-verifier';
    const now = new Date();

    if (params.entityType === 'LAB_RESULT') {
      const lab = store.labResults.get(params.entityId);
      if (lab) {
        const prev = { ...lab };
        lab.verificationStatus = 'REJECTED';
        lab.verifiedBy = rejectedBy;
        lab.verifiedAt = now;
        lab.verificationNotes = params.reason;
        store.labResults.set(params.entityId, lab);

        await AuditService.recordEvent({
          patientId: params.patientId,
          documentId: lab.documentId,
          eventType: 'HUMAN_REJECTED_RECORD',
          entityType: 'LAB_RESULT',
          entityId: params.entityId,
          actor: 'USER',
          actorId: rejectedBy,
          previousValue: prev,
          newValue: lab,
          reason: params.reason,
        });
        return lab;
      }
    }

    return null;
  }

  /**
   * Edits an extracted entity with audit trail preservation
   */
  static async editEntity(params: {
    patientId: string;
    entityType: 'LAB_RESULT' | 'MEDICATION' | 'ALLERGY' | 'CONDITION';
    entityId: string;
    editedValues: Record<string, any>;
    editedBy?: string;
    reason?: string;
  }) {
    const store = getStore();
    const editedBy = params.editedBy || 'clinician-verifier';
    const now = new Date();

    if (params.entityType === 'LAB_RESULT') {
      const lab = store.labResults.get(params.entityId);
      if (lab) {
        const prev = { ...lab };
        const updated = {
          ...lab,
          ...params.editedValues,
          provenanceSource: 'USER_EDITED' as const,
          verificationStatus: 'EDITED' as const,
          verifiedBy: editedBy,
          verifiedAt: now,
          verificationNotes: params.reason || 'Edited by clinician',
          updatedAt: now,
        };
        store.labResults.set(params.entityId, updated);

        await AuditService.recordEvent({
          patientId: params.patientId,
          documentId: lab.documentId,
          eventType: 'HUMAN_EDITED_RECORD',
          entityType: 'LAB_RESULT',
          entityId: params.entityId,
          actor: 'USER',
          actorId: editedBy,
          previousValue: prev,
          newValue: updated,
          reason: params.reason || 'Clinician manual value correction',
        });
        return updated;
      }
    }

    return null;
  }
}
