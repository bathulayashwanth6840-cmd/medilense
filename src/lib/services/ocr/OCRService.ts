import { z } from 'zod';

/**
 * Normalized Bounding Box Schema (Percentages 0-100 or normalized coordinates 0-1)
 */
export const BoundingBoxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/**
 * Normalized OCR Block / Line Schema
 */
export const OCRBlockSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  boundingBox: BoundingBoxSchema.optional(),
  blockType: z.enum(['TEXT', 'TABLE', 'KEY_VALUE', 'HEADER', 'FOOTER']).default('TEXT'),
});

export type OCRBlock = z.infer<typeof OCRBlockSchema>;

/**
 * Normalized OCR Page Schema
 */
export const OCRPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string(),
  blocks: z.array(OCRBlockSchema).default([]),
  width: z.number().optional(),
  height: z.number().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
});

export type OCRPage = z.infer<typeof OCRPageSchema>;

/**
 * Provider-Independent OCR Result Schema
 */
export const OCRResultSchema = z.object({
  provider: z.string(),
  extractionMethod: z.enum(['NATIVE_PDF', 'OCR', 'HYBRID']),
  totalPages: z.number().int().positive(),
  fullText: z.string(),
  pages: z.array(OCRPageSchema),
  overallConfidence: z.number().min(0).max(1),
  processingTimeMs: z.number().nonnegative(),
  rawProviderMetadata: z.record(z.string(), z.any()).optional(),
});

export type OCRResult = z.infer<typeof OCRResultSchema>;

/**
 * Generic OCR Service Abstraction
 */
export interface OCRService {
  readonly providerName: string;
  extract(document: Buffer, fileName?: string): Promise<OCRResult>;
}
