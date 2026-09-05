import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { PatientCreateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const store = getStore();
    const patients = await store.getPatients();

    // Attach summary counts for quick card badges
    const enriched = await Promise.all(
      patients.map(async (p) => {
        const full = await store.getPatientById(p.id);
        const labs = full?.labResults || [];
        const unverifiedCount = labs.filter(l => l.verificationStatus === 'UNVERIFIED').length;
        const lowOrHighCount = labs.filter(l => l.interpretation === 'LOW' || l.interpretation === 'HIGH').length;
        const conflictsCount = (full?.conflicts || []).filter(c => c.resolutionStatus === 'DETECTED').length;

        return {
          ...p,
          documentsCount: (full?.documents || []).length,
          labsCount: labs.length,
          medsCount: (full?.medications || []).length,
          unverifiedCount,
          lowOrHighCount,
          conflictsCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = PatientCreateSchema.parse(body);
    const store = getStore();
    const newPatient = await store.createPatient(validated);

    return NextResponse.json({ success: true, data: newPatient }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Validation error' }, { status: 400 });
  }
}
