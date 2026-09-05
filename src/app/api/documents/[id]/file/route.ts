import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { verifyPatientAccess } from '@/lib/security/auth';
import { readUploadedFile } from '@/lib/storage/secureStorage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();

    // Find document record
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

    // Security & Authorization Check
    const auth = await verifyPatientAccess(req, foundDoc.patientId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Access denied: Unauthorized patient record request.' },
        { status: 403 }
      );
    }

    // If document has physical storage path, securely stream it
    if (foundDoc.storagePath) {
      const fileBuffer = await readUploadedFile(foundDoc.storagePath);
      
      const contentType = foundDoc.fileType.includes('pdf') 
        ? 'application/pdf' 
        : foundDoc.fileType.includes('png')
        ? 'image/png'
        : foundDoc.fileType.includes('jpeg') || foundDoc.fileType.includes('jpg')
        ? 'image/jpeg'
        : 'text/plain';

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(foundDoc.originalFileName)}"`,
          'X-MedLens-File-Hash': foundDoc.fileHashSha256,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // If document is text or stored raw
    if (foundDoc.rawExtractedText) {
      return new NextResponse(foundDoc.rawExtractedText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `inline; filename="${encodeURIComponent(foundDoc.originalFileName)}"`,
          'X-MedLens-File-Hash': foundDoc.fileHashSha256,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Document file content is unavailable.' },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to securely access document file.' },
      { status: 500 }
    );
  }
}
