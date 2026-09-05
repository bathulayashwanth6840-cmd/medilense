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

    const conflict = await store.getConflictById(id);
    if (!conflict) {
      return NextResponse.json({ success: false, error: 'Conflict record not found' }, { status: 404 });
    }

    if (conflict.patientId) {
      const auth = await verifyPatientAccess(req, conflict.patientId);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: conflict,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
