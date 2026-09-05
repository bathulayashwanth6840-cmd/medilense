import { NextRequest, NextResponse } from 'next/server';
import { VerificationService } from '@/lib/services/verification/VerificationService';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyPatientAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const history = await VerificationService.getTaskHistory(id);

    return NextResponse.json({
      success: true,
      taskId: id,
      count: history.length,
      history,
      data: history,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
