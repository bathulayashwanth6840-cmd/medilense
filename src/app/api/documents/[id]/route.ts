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

    let foundDoc = null;
    for (const doc of store.documents.values()) {
      if (doc.id === id) {
        foundDoc = doc;
        break;
      }
    }

    if (!foundDoc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const auth = await verifyPatientAccess(req, foundDoc.patientId);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    // Attach count of extracted entities
    const labs = Array.from(store.labResults.values()).filter(l => l.documentId === id);
    const meds = Array.from(store.medications.values()).filter(m => m.documentId === id);
    const allergies = Array.from(store.allergies.values()).filter(a => a.documentId === id);
    const conditions = Array.from(store.conditions.values()).filter(c => c.documentId === id);

    return NextResponse.json({
      success: true,
      data: {
        ...foundDoc,
        extractionsSummary: {
          labsCount: labs.length,
          medicationsCount: meds.length,
          allergiesCount: allergies.length,
          conditionsCount: conditions.length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
