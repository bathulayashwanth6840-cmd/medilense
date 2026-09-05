import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Determine writable directory based on environment (Vercel serverless functions use /tmp)
function getStorageRoot(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'medlens_uploads');
  }
  return path.resolve(process.cwd(), 'storage', 'secure_uploads');
}

const STORAGE_ROOT = getStorageRoot();

// Maximum allowed file size: 30MB
export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 31,457,280 bytes

// Allowed MIME types for medical documents
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/octet-stream', // frequently sent by some browsers for binary PDFs
];

// Disallowed dangerous extensions to prevent script execution / RCE
export const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.bash', '.bin',
  '.js', '.mjs', '.ts', '.jsx', '.tsx', '.php', '.phtml',
  '.py', '.rb', '.pl', '.vbs', '.ps1', '.jar', '.war',
  '.html', '.htm', '.xhtml', '.svg', '.xml'
];

export interface StoredFileMetadata {
  fileId: string;
  originalFileName: string;
  sanitizedFileName: string;
  storagePath: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Ensures the secure storage directory exists with proper permissions
 */
export function ensureSecureStorageDir(): string {
  try {
    const targetDir = getStorageRoot();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
    }
    return targetDir;
  } catch (err) {
    // Fallback to system OS tmpdir if project directory is read-only
    const tmpDir = path.join(os.tmpdir(), 'medlens_uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o700 });
    }
    return tmpDir;
  }
}

/**
 * Sanitizes unsafe filenames to prevent directory traversal and injection attacks.
 * Strips path separators (../, ..\, /), special control characters, and normalizes extensions.
 */
export function sanitizeFileName(rawFileName: string): string {
  if (!rawFileName) return 'document.pdf';

  // 1. Extract only the base name (stripping directory paths)
  let base = path.basename(rawFileName);

  // 2. Remove null bytes and control chars
  base = base.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

  // 3. Remove traversal patterns explicitly
  base = base.replace(/\.\./g, '');

  // 4. Replace spaces and unsafe special characters with underscores
  base = base.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 5. Truncate name if excessively long (keep max 100 chars for stem + extension)
  const ext = path.extname(base).toLowerCase();
  const nameWithoutExt = path.basename(base, ext);
  const truncatedStem = nameWithoutExt.substring(0, 80);

  // Ensure an extension exists
  const finalExt = ext || '.pdf';
  return `${truncatedStem || 'document'}${finalExt}`;
}

/**
 * Validates uploaded file type against permitted medical formats
 */
export function validateFileType(fileName: string, mimeType: string): { valid: boolean; error?: string } {
  const ext = path.extname(fileName).toLowerCase();

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Security violation: File type '${ext}' is strictly prohibited. Only medical PDF, image, and text reports are permitted.`
    };
  }

  // Check allowed MIME types or known extensions
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
  const isAllowedExt = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt'].includes(ext);

  if (!isAllowedMime && !isAllowedExt) {
    return {
      valid: false,
      error: `Invalid file format (${mimeType || ext}). MedLens supports PDF (.pdf), High-Resolution Scans (.png, .jpg, .webp), and Clinical Text (.txt).`
    };
  }

  return { valid: true };
}

/**
 * Validates file size against the 30MB limit
 */
export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 30 MB.`
    };
  }
  return { valid: true };
}

/**
 * Calculates SHA-256 cryptographic checksum of buffer
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Securely writes an uploaded file to private non-public disk storage.
 * Generates a unique file identifier (UUID) and stores the file with sanitized naming.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalFileName: string,
  mimeType: string = 'application/pdf'
): Promise<StoredFileMetadata> {
  // Validate size
  const sizeValidation = validateFileSize(buffer.length);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error);
  }

  // Validate type
  const typeValidation = validateFileType(originalFileName, mimeType);
  if (!typeValidation.valid) {
    throw new Error(typeValidation.error);
  }

  // Ensure storage root directory exists
  const storageDir = ensureSecureStorageDir();

  // Generate unique identifier and sanitized safe name
  const fileId = uuidv4();
  const sanitized = sanitizeFileName(originalFileName);
  const safeStorageName = `${fileId}_${sanitized}`;
  const absolutePath = path.join(storageDir, safeStorageName);

  // Cryptographic SHA-256 checksum
  const fileHashSha256 = computeSha256(buffer);

  // Write file to secure storage with restricted permissions
  await fs.promises.writeFile(absolutePath, buffer, { mode: 0o600 });

  return {
    fileId,
    originalFileName,
    sanitizedFileName: sanitized,
    storagePath: absolutePath,
    fileSizeBytes: buffer.length,
    fileHashSha256,
    mimeType,
    uploadedAt: new Date(),
  };
}

/**
 * Securely reads a file from storage, verifying that it is within the secure storage directory.
 */
export async function readUploadedFile(filePath: string): Promise<Buffer> {
  const resolved = path.resolve(filePath);
  const storageDir = ensureSecureStorageDir();
  const tmpDir = os.tmpdir();

  // Prevent path traversal breakout - allow if in storageDir or os.tmpdir
  if (!resolved.startsWith(storageDir) && !resolved.startsWith(tmpDir)) {
    throw new Error('Access denied: File is outside the authorized secure storage root.');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error('Requested medical report file not found on secure storage.');
  }

  return fs.promises.readFile(resolved);
}

/**
 * Checks if a given file path is located in the secure storage directory
 */
export function isSecureStoragePath(filePath: string): boolean {
  try {
    const resolved = path.resolve(filePath);
    const storageDir = ensureSecureStorageDir();
    const tmpDir = os.tmpdir();
    return resolved.startsWith(storageDir) || resolved.startsWith(tmpDir);
  } catch {
    return false;
  }
}
