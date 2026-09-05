import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { generateClinicalSummary } from '@/lib/ai/gemini';

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

    const summaryResult = await generateClinicalSummary(
      patient.fullName,
      {
        dob: patient.dateOfBirth,
        sex: patient.sex,
        bloodType: patient.bloodType,
        emergencyContact: patient.emergencyContact,
        notes: patient.notes,
      },
      patient.labResults || [],
      patient.medications || [],
      patient.allergies || [],
      patient.conditions || [],
      patient.documents || []
    );

    // Save summary record
    const savedSummary = {
      id: `sum-${Date.now()}`,
      patientId,
      summaryText: summaryResult.summaryText,
      keyFindingsJson: JSON.stringify(summaryResult.keyFindings),
      notableChangesJson: JSON.stringify(summaryResult.notableChanges),
      missingInformationJson: JSON.stringify(summaryResult.missingInformation),
      guardrailValidation: summaryResult.guardrailStatus,
      generatedAt: new Date(),
    };

    store.summaries.set(savedSummary.id, savedSummary);
    await store.logAudit(patientId, 'CLINICAL_SUMMARY', savedSummary.id, 'AI_EXTRACTED', null, savedSummary, 'AI_ENGINE', 'Non-diagnostic factual clinical summary generated');

    return NextResponse.json({
      success: true,
      data: {
        ...savedSummary,
        keyFindings: summaryResult.keyFindings,
        notableChanges: summaryResult.notableChanges,
        missingInformation: summaryResult.missingInformation,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
