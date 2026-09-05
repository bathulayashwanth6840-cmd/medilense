import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();
    const doc = store.documents.get(id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Return structured page information
    const pages = [
      {
        pageNumber: 1,
        text: doc.extractedText || '',
        blocks: [
          {
            text: doc.extractedText ? doc.extractedText.slice(0, 200) : '',
            confidence: doc.confidenceScore || 0.984,
            boundingBox: { x: 50, y: 100, width: 500, height: 200 },
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        totalPages: doc.pageCount || 1,
        extractionMethod: doc.extractionMethod || 'NATIVE_PDF',
        pages,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve document pages' },
      { status: 500 }
    );
  }
}
