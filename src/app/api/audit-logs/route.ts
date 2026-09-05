import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    const store = getStore();
    if (patientId) {
      const patient = await store.getPatientById(patientId);
      return NextResponse.json({ success: true, data: patient?.auditLogs || [] });
    }

    const allLogs = Array.from(store.auditLogs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ success: true, data: allLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
