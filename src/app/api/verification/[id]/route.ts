import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { VerificationService } from '@/lib/services/verification/VerificationService';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const store = getStore();

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

    const edited = await VerificationService.editEntity({
      patientId,
      entityType,
      entityId: id,
      editedValues: body.editedValues || body,
      editedBy: body.editedBy || 'clinician-editor',
      reason: body.reason || 'Edited in verification review',
    });

    return NextResponse.json({
      success: true,
      data: edited,
      message: 'Entity values successfully edited and audited.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
