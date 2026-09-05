import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();

    const conflict = await store.getConflictById(id);
    if (!conflict) {
      return NextResponse.json({ success: false, error: 'Conflict record not found' }, { status: 404 });
    }

    const auth = await verifyPatientAccess(req, conflict.patientId);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const reviewerId = body.reviewerId || auth.userId || 'Dr. Sarah Jenkins, MD';
    const notes = body.notes || 'Conflict reviewed by clinician';

    const updated = await store.reviewConflict(id, reviewerId, notes);

    return NextResponse.json({
      success: true,
      message: 'Conflict marked as REVIEWED',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
