import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || undefined;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const severity = searchParams.get('severity') || undefined;

    if (patientId) {
      const auth = await verifyPatientAccess(req, patientId);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
      }
    }

    const store = getStore();
    const conflicts = await store.getConflicts({
      patientId,
      status,
      type,
      severity,
    });

    return NextResponse.json({
      success: true,
      count: conflicts.length,
      data: conflicts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
