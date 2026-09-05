import { OCRService, OCRResult } from './OCRService';
import { GoogleDocumentAIService } from './GoogleDocumentAIService';
import { PaddleOCRService } from './PaddleOCRService';
import { TesseractOCRService } from './TesseractOCRService';
import { OCRProviderError } from '../errors/AppErrors';

export class OCRFactory {
  /**
   * Instantiates the configured OCR provider
   */
  static createOCRService(provider?: string): OCRService {
    const selected = (provider || process.env.OCR_PROVIDER || 'google').toLowerCase();

    switch (selected) {
      case 'google':
      case 'google-document-ai':
        return new GoogleDocumentAIService();

      case 'paddle':
      case 'paddle-ocr':
        return new PaddleOCRService();

      case 'tesseract':
      case 'tesseract-ocr':
        return new TesseractOCRService();

      default:
        console.warn(`Unknown OCR_PROVIDER '${selected}', defaulting to GoogleDocumentAIService`);
        return new GoogleDocumentAIService();
    }
  }

  /**
   * Executes OCR extraction with automatic failover to the configured fallback provider
   */
  static async extractWithFallback(
    document: Buffer,
    fileName?: string,
    onFallback?: (primaryError: Error, fallbackProvider: string) => void
  ): Promise<OCRResult> {
    const primaryProviderName = process.env.OCR_PROVIDER || 'google';
    const fallbackProviderName = process.env.OCR_FALLBACK_PROVIDER || 'paddle';

    const primaryService = this.createOCRService(primaryProviderName);

    try {
      return await primaryService.extract(document, fileName);
    } catch (primaryErr: any) {
      console.warn(
        `Primary OCR provider '${primaryService.providerName}' failed. Activating fallback provider '${fallbackProviderName}'. Reason: ${primaryErr.message}`
      );

      if (onFallback) {
        onFallback(primaryErr, fallbackProviderName);
      }

      // Execute fallback provider
      try {
        const fallbackService = this.createOCRService(fallbackProviderName);
        const result = await fallbackService.extract(document, fileName);
        return {
          ...result,
          rawProviderMetadata: {
            ...result.rawProviderMetadata,
            fallbackActivated: true,
            primaryProvider: primaryService.providerName,
            primaryError: primaryErr.message,
          },
        };
      } catch (fallbackErr: any) {
        throw new OCRProviderError(
          `All OCR providers failed. Primary (${primaryService.providerName}): ${primaryErr.message} | Fallback (${fallbackProviderName}): ${fallbackErr.message}`,
          { details: { primaryErr, fallbackErr } }
        );
      }
    }
  }
}
