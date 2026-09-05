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

    let history = await store.getProvenanceHistory(id);

    if (!history || history.length === 0) {
      const lab = store.labResults.get(id);
      const med = store.medications.get(id);
      const all = store.allergies.get(id);
      const cond = store.conditions.get(id);
      const obs = store.observations.get(id);

      const entity = lab || med || all || cond || obs;
      if (!entity) {
        return NextResponse.json({ success: false, error: 'Clinical record not found' }, { status: 404 });
      }

      history = [
        {
          id: entity.provenanceId || `prov_${id}`,
          provenanceId: entity.provenanceId || `prov_${id}`,
          entityId: id,
          entityType: lab ? 'LAB_RESULT' : med ? 'MEDICATION' : all ? 'ALLERGY' : cond ? 'CONDITION' : 'OBSERVATION',
          provenanceType: entity.provenanceSource || 'DOCUMENT_EXTRACTED',
          version: 1,
          documentId: entity.documentId || null,
          pageNumber: entity.sourcePageNumber || 1,
          sourceText: entity.sourceOriginalSnippet || 'Initial clinical record created',
          confidence: entity.confidenceScore ?? 0.95,
          timestamp: entity.createdAt ? new Date(entity.createdAt).toISOString() : new Date().toISOString(),
          createdAt: entity.createdAt ? new Date(entity.createdAt).toISOString() : new Date().toISOString(),
        },
      ];
    }

    return NextResponse.json({
      success: true,
      entityId: id,
      totalVersions: history.length,
      history,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
