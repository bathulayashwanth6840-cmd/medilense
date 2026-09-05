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

    const labs = Array.from(store.labResults.values())
      .filter(l => l.documentId === id)
      .map(l => ({
        entityType: 'LAB_RESULT',
        entityId: l.id,
        name: l.testName,
        value: `${l.measuredValue} ${l.unit || ''}`,
        provenanceSource: l.provenanceSource,
        sourcePageNumber: l.sourcePageNumber,
        sourceOriginalSnippet: l.sourceOriginalSnippet,
        confidenceScore: l.confidenceScore,
        verificationStatus: l.verificationStatus,
      }));

    const meds = Array.from(store.medications.values())
      .filter(m => m.documentId === id)
      .map(m => ({
        entityType: 'MEDICATION',
        entityId: m.id,
        name: m.drugName,
        value: `${m.dosage || ''} ${m.frequency || ''}`,
        provenanceSource: m.provenanceSource,
        sourcePageNumber: m.sourcePageNumber,
        sourceOriginalSnippet: m.sourceOriginalSnippet,
        confidenceScore: m.confidenceScore,
        verificationStatus: m.verificationStatus,
      }));

    const allergies = Array.from(store.allergies.values())
      .filter(a => a.documentId === id)
      .map(a => ({
        entityType: 'ALLERGY',
        entityId: a.id,
        name: a.allergen,
        value: a.reaction || 'Reaction documented',
        provenanceSource: a.provenanceSource,
        sourcePageNumber: a.sourcePageNumber,
        sourceOriginalSnippet: a.sourceOriginalSnippet,
        confidenceScore: a.confidenceScore,
        verificationStatus: a.verificationStatus,
      }));

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        documentName: foundDoc.originalFileName,
        fileHashSha256: foundDoc.fileHashSha256,
        provenanceChain: [...labs, ...meds, ...allergies],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
