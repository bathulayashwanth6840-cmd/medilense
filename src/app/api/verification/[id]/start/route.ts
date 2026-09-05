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
    const userId = body.userId || auth.userId || 'Dr. Sarah Jenkins, MD';

    const task = await VerificationService.startTask(id, userId);
    if (!task) {
      return NextResponse.json({ success: false, error: `Verification task '${id}' not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Verification task marked as IN_REVIEW.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
