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

    const patient = await store.getPatientById(foundDoc.patientId);
    const conflicts = patient?.conflicts || [];

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        patientId: foundDoc.patientId,
        conflicts,
        activeConflictsCount: conflicts.filter(c => c.resolutionStatus === 'DETECTED').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
