import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { VerificationService } from '@/lib/services/verification/VerificationService';
import { VerificationActionSchema } from '@/lib/validation/schemas';
import { verifyPatientAccess } from '@/lib/security/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyPatientAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || undefined;
    const status = searchParams.get('status') || undefined;
    const reason = searchParams.get('reason') || undefined;
    const recordType = searchParams.get('recordType') || undefined;

    const tasks = await VerificationService.getTasks({
      patientId,
      status,
      reason,
      recordType,
    });

    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks,
      items: tasks, // Backward compatibility
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list verification queue' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyPatientAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const store = getStore();

    // 1. Bulk Verification
    if (body.action === 'BULK_ACCEPT_CONFIDENT') {
      const patientId = body.patientId;
      const minConfidence = body.minConfidence || 0.95;

      if (!patientId) {
        return NextResponse.json(
          { success: false, error: 'patientId is required for bulk verification' },
          { status: 400 }
        );
      }

      const bulkResult = await store.verifyAllHighConfidence(patientId, minConfidence);

      return NextResponse.json({
        success: true,
        data: bulkResult,
        message: `Successfully bulk-verified ${bulkResult.verifiedCount} high-confidence entities.`,
      });
    }

    // 2. Single Action Verification (Direct or by ID)
    const validated = VerificationActionSchema.parse(body);

    const result = await store.verifyEntity(
      validated.patientId,
      validated.entityType,
      validated.entityId,
      validated.action,
      validated.editedValues,
      validated.reason
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Entity or record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Entity successfully marked as ${
        validated.action === 'ACCEPT'
          ? 'VERIFIED'
          : validated.action === 'REJECT'
          ? 'REJECTED'
          : 'EDITED'
      }`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Verification error' }, { status: 400 });
  }
}
