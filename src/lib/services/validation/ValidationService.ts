import { ClinicalExtraction, ClinicalExtractionSchema } from './schemas';
import { AIValidationError } from '../errors/AppErrors';

export interface ValidationResult {
  success: boolean;
  data?: ClinicalExtraction;
  errors: string[];
}

export class ValidationService {
  /**
   * Validates raw LLM JSON output against strict ClinicalExtractionSchema.
   * Throws typed AIValidationError if validation fails.
   */
  static validate(data: unknown, documentId?: string): ClinicalExtraction {
    const parseResult = ClinicalExtractionSchema.safeParse(data);

    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues.map(
        iss => `[${iss.path.join('.') || 'root'}]: ${iss.message}`
      );

      throw new AIValidationError(
        `Strict schema validation failed: ${formattedErrors.join('; ')}`,
        {
          documentId,
          details: { issues: parseResult.error.issues, rawData: data },
        }
      );
    }

    return parseResult.data;
  }

  /**
   * Safe non-throwing schema validation
   */
  static safeValidate(data: unknown): ValidationResult {
    const parseResult = ClinicalExtractionSchema.safeParse(data);

    if (!parseResult.success) {
      return {
        success: false,
        errors: parseResult.error.issues.map(
          iss => `[${iss.path.join('.') || 'root'}]: ${iss.message}`
        ),
      };
    }

    return {
      success: true,
      data: parseResult.data,
      errors: [],
    };
  }
}
