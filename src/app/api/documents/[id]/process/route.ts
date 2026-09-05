import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { verifyPatientAccess } from '@/lib/security/auth';
import { readUploadedFile } from '@/lib/storage/secureStorage';
import { DocumentExtractionPipeline } from '@/lib/services/pipeline/DocumentExtractionPipeline';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();

    // Find document
    let foundDoc = null;
    for (const doc of store.documents.values()) {
      if (doc.id === id) {
        foundDoc = doc;
        break;
      }
    }

    if (!foundDoc) {
      return NextResponse.json(
        { success: false, error: `Document with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    // Security check
    const auth = await verifyPatientAccess(req, foundDoc.patientId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized to process document.' },
        { status: 403 }
      );
    }

    // Read file buffer from secure storage or rawExtractedText
    let documentBuffer: Buffer;
    if (foundDoc.storagePath) {
      documentBuffer = await readUploadedFile(foundDoc.storagePath);
    } else {
      documentBuffer = Buffer.from(foundDoc.rawExtractedText || '', 'utf-8');
    }

    // Run modular DocumentExtractionPipeline
    const pipelineResult = await DocumentExtractionPipeline.processDocument({
      patientId: foundDoc.patientId,
      documentId: foundDoc.id,
      documentBuffer,
      fileName: foundDoc.originalFileName,
      mimeType: foundDoc.fileType,
      documentType: foundDoc.documentType,
    });

    // Update document status in store
    foundDoc.processingStatus = 'COMPLETED';
    store.documents.set(foundDoc.id, foundDoc);

    return NextResponse.json({
      success: true,
      data: pipelineResult,
    });
  } catch (error: any) {
    console.error('Pipeline processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Pipeline execution failed.' },
      { status: 500 }
    );
  }
}
