import { NextRequest, NextResponse } from 'next/server';
import { MedLensIngestionEngine } from '@/lib/ingestion/ingestionEngine';
import { verifyPatientAccess } from '@/lib/security/auth';
import { validateFileType, validateFileSize } from '@/lib/storage/secureStorage';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data (Method A: File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const patientId = (formData.get('patientId') as string) || '';
      const documentType = (formData.get('documentType') as string) || 'LAB_REPORT';

      if (!patientId) {
        return NextResponse.json(
          { success: false, error: 'Patient ID is required for document ingestion.' },
          { status: 400 }
        );
      }

      // Authorization check
      const auth = await verifyPatientAccess(req, patientId);
      if (!auth.authorized) {
        return NextResponse.json(
          { success: false, error: auth.error || 'Unauthorized patient record access.' },
          { status: 403 }
        );
      }

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No medical document file provided in request.' },
          { status: 400 }
        );
      }

      // Validate file size and type
      const sizeValidation = validateFileSize(file.size);
      if (!sizeValidation.valid) {
        return NextResponse.json({ success: false, error: sizeValidation.error }, { status: 400 });
      }

      const typeValidation = validateFileType(file.name, file.type);
      if (!typeValidation.valid) {
        return NextResponse.json({ success: false, error: typeValidation.error }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Ingest via MedLens Ingestion Engine
      const result = await MedLensIngestionEngine.ingestDocumentFile({
        fileBuffer,
        originalFileName: file.name,
        mimeType: file.type || 'application/pdf',
        patientId,
        documentType,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, processingStatus: result.processingStatus },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Handle JSON (Method B: Direct Clinical Text Input & Sample Ingestion)
    const body = await req.json();
    const { patientId, rawText, originalFileName, documentType } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required.' },
        { status: 400 }
      );
    }

    // Authorization check
    const auth = await verifyPatientAccess(req, patientId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized patient record access.' },
        { status: 403 }
      );
    }

    if (!rawText || rawText.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Clinical text content must contain at least 5 characters.' },
        { status: 400 }
      );
    }

    // Ingest via Direct Text pipeline (Explicit USER_PROVIDED provenance)
    const result = await MedLensIngestionEngine.ingestDirectTextInput({
      patientId,
      rawText,
      originalFileName: originalFileName || 'Manual_Clinical_Entry.txt',
      documentType: documentType || 'CLINICIAN_NOTE',
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Document ingestion API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during ingestion.' },
      { status: 500 }
    );
  }
}
