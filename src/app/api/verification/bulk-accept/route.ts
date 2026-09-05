import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, minConfidence = 0.90 } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required for bulk verification.' },
        { status: 400 }
      );
    }

    const auth = await verifyPatientAccess(req, patientId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized patient record access.' },
        { status: 403 }
      );
    }

    const store = getStore();
    const result = await store.verifyAllHighConfidence(
      patientId,
      minConfidence,
      'Dr. Sarah Jenkins, MD (Bulk Verified)'
    );

    return NextResponse.json({
      success: true,
      message: `Successfully verified ${result.verifiedCount} clinical extractions with confidence >= ${Math.round(minConfidence * 100)}%.`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during bulk verification.' },
      { status: 500 }
    );
  }
}
