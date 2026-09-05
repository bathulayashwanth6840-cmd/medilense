import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/lib/services/verification/VerificationService';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyPatientAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'A rejection reason is required (e.g. Incorrect extraction, Unsupported source, Wrong entity, Unreadable source, Duplicate).',
        },
        { status: 400 }
      );
    }

    const result = await VerificationService.rejectTask(id, {
      userId: body.rejectedBy || body.userId || auth.userId || 'Dr. Sarah Jenkins, MD',
      reason: body.reason.trim(),
    });

    return NextResponse.json({
      success: true,
      data: result.record || result.task,
      task: result.task,
      message: 'Entity marked as REJECTED with reason recorded in audit log.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
