import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();

    // Find document across store
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

    // Security authorization check
    const auth = await verifyPatientAccess(req, foundDoc.patientId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized to view this document status.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: foundDoc.id,
        patientId: foundDoc.patientId,
        originalFileName: foundDoc.originalFileName,
        fileSizeBytes: foundDoc.fileSizeBytes,
        fileHashSha256: foundDoc.fileHashSha256,
        documentType: foundDoc.documentType,
        processingStatus: foundDoc.processingStatus,
        uploadedAt: foundDoc.uploadedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching document status.' },
      { status: 500 }
    );
  }
}
