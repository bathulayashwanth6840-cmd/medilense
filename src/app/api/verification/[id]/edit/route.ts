import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/lib/services/verification/VerificationService';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleEdit(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleEdit(req, params);
}

async function handleEdit(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const auth = await verifyPatientAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const editedValues = body.editedValues || body;
    const result = await VerificationService.editTask(id, {
      editedValues,
      userId: body.editedBy || body.userId || auth.userId || 'Dr. Sarah Jenkins, MD',
      reason: body.reason || 'Clinician corrected value during verification review',
    });

    return NextResponse.json({
      success: true,
      data: result.record || result.task,
      task: result.task,
      message: 'Entity edited successfully with USER_EDITED provenance and audit log.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
