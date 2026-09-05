import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { VerificationActionSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = getStore();

    // 1. Check for Bulk Verification Action
    if (body.action === 'BULK_ACCEPT_CONFIDENT') {
      const patientId = body.patientId;
      const minConfidence = body.minConfidence || 0.95;

      if (!patientId) {
        return NextResponse.json({ success: false, error: 'patientId is required for bulk verification' }, { status: 400 });
      }

      const bulkResult = await store.verifyAllHighConfidence(patientId, minConfidence);

      return NextResponse.json({
        success: true,
        data: bulkResult,
        message: `Successfully bulk-verified ${bulkResult.verifiedCount} high-confidence entities.`,
      });
    }

    // 2. Standard Single Entity Verification
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
      message: `Entity successfully marked as ${validated.action === 'ACCEPT' ? 'VERIFIED' : validated.action === 'REJECT' ? 'REJECTED' : 'EDITED'}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Verification error' }, { status: 400 });
  }
}
