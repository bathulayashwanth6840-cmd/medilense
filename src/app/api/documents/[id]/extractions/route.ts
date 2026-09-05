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

    const labResults = Array.from(store.labResults.values()).filter(l => l.documentId === id);
    const medications = Array.from(store.medications.values()).filter(m => m.documentId === id);
    const allergies = Array.from(store.allergies.values()).filter(a => a.documentId === id);
    const conditions = Array.from(store.conditions.values()).filter(c => c.documentId === id);
    const observations = Array.from(store.observations.values()).filter(o => o.documentId === id);

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        patientId: foundDoc.patientId,
        labResults,
        medications,
        allergies,
        conditions,
        observations,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
