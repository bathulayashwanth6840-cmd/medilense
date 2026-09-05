import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { detectClinicalConflicts } from '@/lib/ai/conflictEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'patientId is required' }, { status: 400 });
    }

    const store = getStore();
    const patient = await store.getPatientById(patientId);
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: patient.conflicts || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const patientId = body.patientId;

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'patientId is required' }, { status: 400 });
    }

    const store = getStore();
    const patient = await store.getPatientById(patientId);
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const detected = detectClinicalConflicts(patient);
    const added = [];

    for (const d of detected) {
      const existing = (patient.conflicts || []).find(
        c => c.conflictType === d.conflictType && c.description === d.description
      );
      if (!existing) {
        const conf = await store.addConflict({
          patientId,
          conflictType: d.conflictType,
          entityType: d.entityType,
          description: d.description,
          conflictingRecordsJson: JSON.stringify(d.conflictingRecords),
          resolutionStatus: 'DETECTED',
        });
        added.push(conf);
      }
    }

    const updated = await store.getPatientById(patientId);
    return NextResponse.json({ success: true, data: updated?.conflicts || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
