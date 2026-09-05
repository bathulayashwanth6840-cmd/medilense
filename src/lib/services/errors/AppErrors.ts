/**
 * MedLens Typed Application & Extraction Pipeline Errors
 */

export interface ErrorMetadata {
  documentId?: string;
  patientId?: string;
  stage?: string;
  timestamp?: string;
  retryable?: boolean;
  provider?: string;
  details?: any;
}

export abstract class MedLensError extends Error {
  public readonly code: string;
  public readonly stage: string;
  public readonly documentId?: string;
  public readonly timestamp: string;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(code: string, message: string, meta: ErrorMetadata = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.stage = meta.stage || 'UNKNOWN';
    this.documentId = meta.documentId;
    this.timestamp = meta.timestamp || new Date().toISOString();
    this.retryable = meta.retryable ?? false;
    this.details = meta.details;

    // Maintain proper stack trace in V8 / Node.js
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      stage: this.stage,
      documentId: this.documentId,
      timestamp: this.timestamp,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

export class PDFParseError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_PDF_PARSE', message, { ...meta, stage: 'PDF_PARSING', retryable: false });
  }
}

export class OCRProviderError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_OCR_PROVIDER', message, { ...meta, stage: 'OCR_EXTRACTION', retryable: true });
  }
}

export class OCRTimeoutError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_OCR_TIMEOUT', message, { ...meta, stage: 'OCR_EXTRACTION', retryable: true });
  }
}

export class AIExtractionError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_AI_EXTRACTION', message, { ...meta, stage: 'AI_EXTRACTION', retryable: true });
  }
}

export class AIValidationError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_AI_VALIDATION', message, { ...meta, stage: 'AI_VALIDATION', retryable: false });
  }
}

export class NormalizationError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_NORMALIZATION', message, { ...meta, stage: 'NORMALIZATION', retryable: false });
  }
}

export class DatabaseError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_DATABASE', message, { ...meta, stage: 'PERSISTENCE', retryable: true });
  }
}

export class AuthorizationError extends MedLensError {
  constructor(message: string, meta: ErrorMetadata = {}) {
    super('ERR_AUTHORIZATION', message, { ...meta, stage: 'SECURITY', retryable: false });
  }
}
