import { NextRequest, NextResponse } from 'next/server';
import { MedLensIngestionEngine } from '@/lib/ingestion/ingestionEngine';
import { PatientIntakeFormSchema } from '@/lib/validation/schemas';
import { sanitizeClinicalText } from '@/lib/security/auth';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // Sanitize string inputs to prevent script injection
    const sanitizedBody = {
      ...rawBody,
      identifier: rawBody.identifier?.trim(),
      fullName: rawBody.fullName?.trim(),
      symptoms: rawBody.symptoms ? sanitizeClinicalText(rawBody.symptoms) : undefined,
      existingConditions: rawBody.existingConditions ? sanitizeClinicalText(rawBody.existingConditions) : undefined,
      allergies: rawBody.allergies ? sanitizeClinicalText(rawBody.allergies) : undefined,
      medications: rawBody.medications ? sanitizeClinicalText(rawBody.medications) : undefined,
      medicalHistory: rawBody.medicalHistory ? sanitizeClinicalText(rawBody.medicalHistory) : undefined,
      additionalNotes: rawBody.additionalNotes ? sanitizeClinicalText(rawBody.additionalNotes) : undefined,
    };

    // Validate with Zod schema
    const validationResult = PatientIntakeFormSchema.safeParse(sanitizedBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient intake form validation failed',
          issues: validationResult.error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Ingest structured patient intake
    const { patient, ingestionResult } = await MedLensIngestionEngine.ingestStructuredPatientForm(
      validationResult.data
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          patient,
          ingestionResult,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Patient intake error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process structured patient intake.' },
      { status: 500 }
    );
  }
}
