import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { VerificationService } from '@/lib/services/verification/VerificationService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const store = getStore();

    // Determine entity type and patientId
    let patientId = body.patientId;
    let entityType: any = body.entityType || 'LAB_RESULT';

    if (!patientId) {
      const lab = store.labResults.get(id);
      if (lab) {
        patientId = lab.patientId;
        entityType = 'LAB_RESULT';
      } else {
        const med = store.medications.get(id);
        if (med) {
          patientId = med.patientId;
          entityType = 'MEDICATION';
        }
      }
    }

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Entity or patient not found' }, { status: 404 });
    }

    const verified = await VerificationService.acceptEntity({
      patientId,
      entityType,
      entityId: id,
      verifiedBy: body.verifiedBy || 'clinician-verifier',
      notes: body.notes || 'Accepted as verified by clinician',
    });

    return NextResponse.json({
      success: true,
      data: verified,
      message: 'Entity verified successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
