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

    const prov = await store.getProvenanceById(id);
    if (!prov) {
      return NextResponse.json({ success: false, error: 'Provenance record not found' }, { status: 404 });
    }

    // Access control: find associated patient
    let patientId: string | null = null;
    if (prov.entityType === 'LAB_RESULT') {
      const lab = store.labResults.get(prov.entityId);
      if (lab) patientId = lab.patientId;
    } else if (prov.entityType === 'MEDICATION') {
      const med = store.medications.get(prov.entityId);
      if (med) patientId = med.patientId;
    } else if (prov.entityType === 'ALLERGY') {
      const all = store.allergies.get(prov.entityId);
      if (all) patientId = all.patientId;
    } else if (prov.entityType === 'CONDITION') {
      const cond = store.conditions.get(prov.entityId);
      if (cond) patientId = cond.patientId;
    }

    if (patientId) {
      const auth = await verifyPatientAccess(req, patientId);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: prov,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
