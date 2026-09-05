import { getStore } from '@/lib/dataStore';
import { AuditService } from '../audit/AuditService';
import { VerificationTask, VerificationRequirementReason } from '@/types/clinical';

export class VerificationService {
  /**
   * Evaluates whether an extracted entity requires human verification and computes deterministic reason
   */
  static evaluateVerificationRequirement(params: {
    confidence: number;
    hasConflicts?: boolean;
    sourceEvidenceMissing?: boolean;
    ocrConfidenceLow?: boolean;
    interpretation?: string;
    hasReferenceRange?: boolean;
  }): { requiresReview: boolean; reason: VerificationRequirementReason; status: 'PENDING_REVIEW' | 'IN_REVIEW' | 'VERIFIED' } {
    if (params.hasConflicts) {
      return {
        requiresReview: true,
        reason: 'CONFLICT_DETECTED',
        status: 'PENDING_REVIEW',
      };
    }

    if (params.confidence < 0.90) {
      return {
        requiresReview: true,
        reason: 'LOW_EXTRACTION_CONFIDENCE',
        status: 'PENDING_REVIEW',
      };
    }

    if (params.interpretation === 'UNDETERMINED' || (params.interpretation === 'REFERENCE_UNAVAILABLE' && params.hasReferenceRange)) {
      return {
        requiresReview: true,
        reason: 'REFERENCE_RANGE_UNDETERMINED',
        status: 'PENDING_REVIEW',
      };
    }

    if (params.sourceEvidenceMissing) {
      return {
        requiresReview: true,
        reason: 'MISSING_SOURCE_EVIDENCE',
        status: 'PENDING_REVIEW',
      };
    }

    if (params.ocrConfidenceLow) {
      return {
        requiresReview: true,
        reason: 'OCR_QUALITY_ISSUE',
        status: 'PENDING_REVIEW',
      };
    }

    return {
      requiresReview: false,
      reason: 'PENDING_REVIEW',
      status: 'PENDING_REVIEW',
    };
  }

  /**
   * Retrieves pending or filtered verification tasks
   */
  static async getTasks(filter?: {
    patientId?: string;
    status?: string;
    reason?: string;
    recordType?: string;
  }): Promise<VerificationTask[]> {
    const store = getStore();
    return store.getVerificationTasks(filter);
  }

  /**
   * Retrieves a verification task by ID with full joined entity context
   */
  static async getTaskById(taskIdOrRecordId: string): Promise<VerificationTask | null> {
    const store = getStore();
    return store.getVerificationTaskById(taskIdOrRecordId);
  }

  /**
   * Transitions a verification task to IN_REVIEW when a reviewer opens it
   */
  static async startTask(taskIdOrRecordId: string, userId: string = 'Dr. Sarah Jenkins, MD'): Promise<VerificationTask | null> {
    const store = getStore();
    return store.startVerification(taskIdOrRecordId, userId);
  }

  /**
   * Accepts an extracted entity, marking it VERIFIED and creating HUMAN_VERIFIED provenance
   */
  static async acceptTask(taskIdOrRecordId: string, params?: { userId?: string; notes?: string }) {
    const store = getStore();
    return store.acceptVerification(taskIdOrRecordId, params);
  }

  /**
   * Edits an extracted entity, creating USER_EDITED provenance with diffs and audit logs
   */
  static async editTask(taskIdOrRecordId: string, params: { editedValues: any; userId?: string; reason?: string }) {
    const store = getStore();
    return store.editVerification(taskIdOrRecordId, params);
  }

  /**
   * Rejects an extracted entity with mandatory justification
   */
  static async rejectTask(taskIdOrRecordId: string, params: { userId?: string; reason: string }) {
    const store = getStore();
    return store.rejectVerification(taskIdOrRecordId, params);
  }

  /**
   * Retrieves immutable verification actions and audit history for a task
   */
  static async getTaskHistory(taskIdOrRecordId: string) {
    const store = getStore();
    return store.getVerificationHistory(taskIdOrRecordId);
  }
}
