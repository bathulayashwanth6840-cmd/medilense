import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { VerificationActionSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const store = getStore();

    // Gather all unverified items across all patients or specific patient
    const unverifiedItems: any[] = [];

    const labs = Array.from(store.labResults.values()).filter(
      l => (!patientId || l.patientId === patientId) && l.verificationStatus === 'UNVERIFIED'
    );
    labs.forEach(l => unverifiedItems.push({ ...l, entityType: 'LAB_RESULT' }));

    const meds = Array.from(store.medications.values()).filter(
      m => (!patientId || m.patientId === patientId) && m.verificationStatus === 'UNVERIFIED'
    );
    meds.forEach(m => unverifiedItems.push({ ...m, entityType: 'MEDICATION' }));

    const allergies = Array.from(store.allergies.values()).filter(
      a => (!patientId || a.patientId === patientId) && a.verificationStatus === 'UNVERIFIED'
    );
    allergies.forEach(a => unverifiedItems.push({ ...a, entityType: 'ALLERGY' }));

    const conditions = Array.from(store.conditions.values()).filter(
      c => (!patientId || c.patientId === patientId) && c.verificationStatus === 'UNVERIFIED'
    );
    conditions.forEach(c => unverifiedItems.push({ ...c, entityType: 'CONDITION' }));

    return NextResponse.json({
      success: true,
      count: unverifiedItems.length,
      items: unverifiedItems,
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
    const body = await req.json();
    const store = getStore();

    // 1. Check for Bulk Verification Action
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
