import { v4 as uuidv4 } from 'uuid';
import {
  ProvenanceRecord,
  DocumentProvenanceInput,
  UserProvenanceInput,
  AIProvenanceInput,
  UserEditProvenanceInput,
  VerificationProvenanceInput,
  DocumentProvenanceSchema,
  UserProvenanceSchema,
  AIProvenanceSchema,
  UserEditProvenanceSchema,
  HumanVerificationProvenanceSchema,
} from './ProvenanceTypes';
import { getStore } from '@/lib/dataStore';
import { AuditService } from '../audit/AuditService';

export interface IProvenanceService {
  createDocumentProvenance(data: DocumentProvenanceInput): Promise<ProvenanceRecord>;
  createUserProvenance(data: UserProvenanceInput): Promise<ProvenanceRecord>;
  createAIProvenance(data: AIProvenanceInput): Promise<ProvenanceRecord>;
  createUserEditProvenance(data: UserEditProvenanceInput): Promise<ProvenanceRecord>;
  createVerificationProvenance(data: VerificationProvenanceInput): Promise<ProvenanceRecord>;
  getProvenance(provenanceId: string): Promise<ProvenanceRecord | null>;
  getProvenanceHistory(entityId: string): Promise<ProvenanceRecord[]>;
}

export class ProvenanceEngine implements IProvenanceService {
  /**
   * 1. Create Document-Extracted Provenance
   */
  async createDocumentProvenance(data: DocumentProvenanceInput): Promise<ProvenanceRecord> {
    const timestamp = data.timestamp || new Date().toISOString();

    // Strict Zod Validation
    const validated = DocumentProvenanceSchema.parse({
      provenanceType: 'DOCUMENT_EXTRACTED',
      documentId: data.documentId,
      documentName: data.documentName,
      pageNumber: data.pageNumber,
      sourceText: data.sourceText,
      extractionTimestamp: timestamp,
      confidence: data.confidence,
      extractionMethod: data.extractionMethod,
      boundingBox: data.boundingBox || null,
      blockId: data.blockId,
      lineId: data.lineId,
      paragraphId: data.paragraphId,
    });

    const store = getStore();
    const existingHistory = await store.getProvenanceHistory(data.entityId);
    const version = existingHistory.length + 1;
    const id = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const record: ProvenanceRecord = {
      id,
      provenanceId: id,
      entityId: data.entityId,
      entityType: data.entityType,
      provenanceType: 'DOCUMENT_EXTRACTED',
      version,
      documentId: validated.documentId,
      documentName: validated.documentName,
      pageNumber: validated.pageNumber,
      sourceText: validated.sourceText,
      confidence: validated.confidence,
      extractionMethod: validated.extractionMethod,
      boundingBox: validated.boundingBox || null,
      blockId: validated.blockId,
      lineId: validated.lineId,
      paragraphId: validated.paragraphId,
      timestamp,
      createdAt: timestamp,
    };

    await store.addProvenance(record);

    return record;
  }

  /**
   * 2. Create User-Provided Provenance
   */
  async createUserProvenance(data: UserProvenanceInput): Promise<ProvenanceRecord> {
    const timestamp = data.timestamp || new Date().toISOString();

    const validated = UserProvenanceSchema.parse({
      provenanceType: 'USER_PROVIDED',
      userId: data.userId,
      timestamp,
      field: data.field,
      source: 'USER',
      notes: data.notes,
    });

    const store = getStore();
    const existingHistory = await store.getProvenanceHistory(data.entityId);
    const version = existingHistory.length + 1;
    const id = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const record: ProvenanceRecord = {
      id,
      provenanceId: id,
      entityId: data.entityId,
      entityType: data.entityType,
      provenanceType: 'USER_PROVIDED',
      version,
      userId: validated.userId,
      field: validated.field,
      source: validated.source,
      timestamp,
      createdAt: timestamp,
    };

    await store.addProvenance(record);

    return record;
  }

  /**
   * 3. Create AI-Generated Provenance
   */
  async createAIProvenance(data: AIProvenanceInput): Promise<ProvenanceRecord> {
    const timestamp = data.timestamp || new Date().toISOString();

    const validated = AIProvenanceSchema.parse({
      provenanceType: 'AI_GENERATED',
      model: data.model,
      provider: data.provider,
      generationTimestamp: timestamp,
      inputRecordIds: data.inputRecordIds,
      generatedStatus: data.generatedStatus || 'GENERATED',
      disclaimer: data.disclaimer || 'AI-generated summary. Verify against source records.',
    });

    const store = getStore();
    const existingHistory = await store.getProvenanceHistory(data.entityId);
    const version = existingHistory.length + 1;
    const id = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const record: ProvenanceRecord = {
      id,
      provenanceId: id,
      entityId: data.entityId,
      entityType: data.entityType,
      provenanceType: 'AI_GENERATED',
      version,
      model: validated.model,
      provider: validated.provider,
      inputRecordIds: validated.inputRecordIds,
      generatedStatus: validated.generatedStatus,
      disclaimer: validated.disclaimer,
      timestamp,
      createdAt: timestamp,
    };

    await store.addProvenance(record);

    return record;
  }

  /**
   * 4. Create User Edit Provenance
   */
  async createUserEditProvenance(data: UserEditProvenanceInput): Promise<ProvenanceRecord> {
    const timestamp = data.timestamp || new Date().toISOString();

    const validated = UserEditProvenanceSchema.parse({
      provenanceType: 'USER_EDITED',
      previousValue: data.previousValue,
      newValue: data.newValue,
      userId: data.userId,
      action: data.action || 'EDIT',
      timestamp,
      reason: data.reason || null,
      field: data.field,
    });

    const store = getStore();
    const existingHistory = await store.getProvenanceHistory(data.entityId);
    const version = existingHistory.length + 1;
    const id = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const record: ProvenanceRecord = {
      id,
      provenanceId: id,
      entityId: data.entityId,
      entityType: data.entityType,
      provenanceType: 'USER_EDITED',
      version,
      previousValue: validated.previousValue,
      newValue: validated.newValue,
      userId: validated.userId,
      action: validated.action,
      reason: validated.reason || null,
      field: validated.field,
      timestamp,
      createdAt: timestamp,
    };

    await store.addProvenance(record);

    return record;
  }

  /**
   * 5. Create Human Verification Provenance
   */
  async createVerificationProvenance(data: VerificationProvenanceInput): Promise<ProvenanceRecord> {
    const timestamp = data.timestamp || new Date().toISOString();

    const validated = HumanVerificationProvenanceSchema.parse({
      provenanceType: 'HUMAN_VERIFIED',
      userId: data.userId,
      timestamp,
      action: data.action || 'VERIFY',
      verifiedRecordId: data.verifiedRecordId,
      notes: data.notes,
    });

    const store = getStore();
    const existingHistory = await store.getProvenanceHistory(data.entityId);
    const version = existingHistory.length + 1;
    const id = `prov_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const record: ProvenanceRecord = {
      id,
      provenanceId: id,
      entityId: data.entityId,
      entityType: data.entityType,
      provenanceType: 'HUMAN_VERIFIED',
      version,
      userId: validated.userId,
      action: validated.action,
      verifiedRecordId: validated.verifiedRecordId,
      timestamp,
      createdAt: timestamp,
    };

    await store.addProvenance(record);

    return record;
  }

  /**
   * Retrieve single provenance record by ID
   */
  async getProvenance(provenanceId: string): Promise<ProvenanceRecord | null> {
    const store = getStore();
    return store.getProvenanceById(provenanceId);
  }

  /**
   * Retrieve immutable historical provenance chain for an entity
   */
  async getProvenanceHistory(entityId: string): Promise<ProvenanceRecord[]> {
    const store = getStore();
    return store.getProvenanceHistory(entityId);
  }
}

export const provenanceEngine = new ProvenanceEngine();
