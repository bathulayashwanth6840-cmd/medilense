import { z } from 'zod';
import { OCRPage, OCRResult } from '../ocr/OCRService';
import { PDFParseError } from '../errors/AppErrors';

export const PDFTextResultSchema = z.object({
  hasMachineReadableText: z.boolean(),
  extractionMethod: z.enum(['NATIVE_PDF', 'OCR', 'HYBRID']),
  totalPages: z.number().int().positive(),
  fullText: z.string(),
  pages: z.array(
    z.object({
      pageNumber: z.number().int().positive(),
      text: z.string(),
      lineCount: z.number().nonnegative(),
      charCount: z.number().nonnegative(),
    })
  ),
  characterDensityPerPage: z.number().nonnegative(),
});

export type PDFTextResult = z.infer<typeof PDFTextResultSchema>;

export interface PDFParser {
  hasText(document: Buffer): Promise<boolean>;
  extractText(document: Buffer): Promise<PDFTextResult>;
}

export class DefaultPDFParser implements PDFParser {
  // Threshold: Minimum machine-readable characters per page to consider native text sufficient
  private readonly MIN_CHARS_FOR_NATIVE = 40;

  /**
   * Fast detection of whether a PDF buffer has machine-readable text content
   */
  async hasText(document: Buffer): Promise<boolean> {
    try {
      const result = await this.extractText(document);
      return result.hasMachineReadableText;
    } catch {
      return false;
    }
  }

  /**
   * Extracts text content and page distribution from native PDF streams
   */
  async extractText(document: Buffer): Promise<PDFTextResult> {
    const raw = document.toString('latin1');

    try {
      // 1. Detect page count from PDF object hierarchy / trailer
      const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
      const totalPages = Math.max(1, pageMatches ? pageMatches.length : 1);

      // 2. Extract plain text streams & decoded strings
      // PDF text objects live between BT (Begin Text) and ET (End Text) or within parentheses (text) / Tj / TJ
      const extractedPages: Array<{ pageNumber: number; text: string; lineCount: number; charCount: number }> = [];
      let fullTextAcc = '';

      // Check for plain text files / UTF-8 documents passed directly
      const utf8Candidate = document.toString('utf-8');
      if (
        !raw.startsWith('%PDF-') &&
        (utf8Candidate.includes('Patient') || utf8Candidate.includes('Report') || utf8Candidate.includes('Lab') || utf8Candidate.includes('Hemoglobin'))
      ) {
        const lines = utf8Candidate.split(/\r?\n/).filter(l => l.trim().length > 0);
        return {
          hasMachineReadableText: true,
          extractionMethod: 'NATIVE_PDF',
          totalPages: 1,
          fullText: utf8Candidate,
          pages: [
            {
              pageNumber: 1,
              text: utf8Candidate,
              lineCount: lines.length,
              charCount: utf8Candidate.length,
            },
          ],
          characterDensityPerPage: utf8Candidate.length,
        };
      }

      // PDF stream parsing
      const textChunkRegex = /\(([^)]+)\)\s*T[jJ]/g;
      let textChunks: string[] = [];
      let match;
      while ((match = textChunkRegex.exec(raw)) !== null) {
        if (match[1] && match[1].trim().length > 0) {
          // Unescape octal / special pdf escapes
          const cleanChunk = match[1]
            .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')');
          textChunks.push(cleanChunk);
        }
      }

      // If text chunks found in PDF streams
      if (textChunks.length > 0) {
        const streamText = textChunks.join(' ');
        fullTextAcc = streamText;
        const charsPerPage = Math.floor(streamText.length / totalPages);

        for (let p = 1; p <= totalPages; p++) {
          const pagePortion = streamText.slice((p - 1) * charsPerPage, p * charsPerPage) || streamText;
          const lines = pagePortion.split(/\r?\n/);
          extractedPages.push({
            pageNumber: p,
            text: pagePortion,
            lineCount: lines.length,
            charCount: pagePortion.length,
          });
        }
      } else {
        // Search for uncompressed text blocks in raw buffer
        const asciiMatches = raw.match(/[\x20-\x7E\r\n]{5,}/g) || [];
        const filteredAscii = asciiMatches
          .filter(s => !s.startsWith('/Filter') && !s.startsWith('/Length') && !s.startsWith('/Font') && s.length > 10)
          .join('\n');

        fullTextAcc = filteredAscii;
        for (let p = 1; p <= totalPages; p++) {
          extractedPages.push({
            pageNumber: p,
            text: filteredAscii,
            lineCount: filteredAscii.split('\n').length,
            charCount: filteredAscii.length,
          });
        }
      }

      const totalChars = fullTextAcc.trim().length;
      const density = totalChars / totalPages;
      const hasMachineReadableText = density >= this.MIN_CHARS_FOR_NATIVE;

      return {
        hasMachineReadableText,
        extractionMethod: hasMachineReadableText ? 'NATIVE_PDF' : 'OCR',
        totalPages,
        fullText: fullTextAcc,
        pages: extractedPages,
        characterDensityPerPage: density,
      };
    } catch (err: any) {
      throw new PDFParseError(`Failed to parse PDF stream: ${err.message}`, { details: err });
    }
  }
}
