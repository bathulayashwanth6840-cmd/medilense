import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { formatDate } from '@/lib/utils/formatters';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return new NextResponse('patientId is required', { status: 400 });
    }

    const store = getStore();
    const patient = await store.getPatientById(patientId);
    if (!patient) {
      return new NextResponse('Patient not found', { status: 404 });
    }

    const labs = patient.labResults || [];
    const meds = patient.medications || [];
    const allergies = patient.allergies || [];
    const summary = patient.summaries?.[0] || null;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MedLens Clinical Report - ${patient.fullName} (${patient.identifier})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 32px; font-size: 13px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: bold; color: #0f766e; margin: 0; }
    .subtitle { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .disclaimer { background: #f0fdfa; border: 1px solid #99f6e4; padding: 10px 14px; border-radius: 8px; font-size: 11px; color: #115e59; margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 12px; }
    .meta-item strong { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .badge-low { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-high { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
    .badge-normal { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-unavail { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .summary-box { background: #faf5ff; border: 1px solid #e9d5ff; padding: 14px; border-radius: 8px; font-size: 12px; color: #581c87; margin-bottom: 20px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">MedLens Clinical Health Record</h1>
      <div class="subtitle">AI-Powered Structured Clinical Information Intelligence</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      Generated: ${new Date().toLocaleString()}<br />
      Record ID: ${patient.id}
    </div>
  </div>

  <div class="disclaimer">
    <strong>Mandatory Non-Diagnostic Disclaimer:</strong> This clinical record is an organizational synthesis of patient-provided narratives and uploaded medical documents. MedLens does not diagnose illnesses, prescribe medication, or formulate treatment recommendations.
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <strong>Patient Name</strong>
      ${patient.fullName}
    </div>
    <div class="meta-item">
      <strong>MRN / Identifier</strong>
      ${patient.identifier}
    </div>
    <div class="meta-item">
      <strong>Date of Birth</strong>
      ${formatDate(patient.dateOfBirth)} (${patient.sex})
    </div>
    <div class="meta-item">
      <strong>Blood Type</strong>
      ${patient.bloodType || 'Not specified'}
    </div>
  </div>

  ${
    summary
      ? `
  <div class="section-title">Objective Clinical Information Digest</div>
  <div class="summary-box">
    ${summary.summaryText}
  </div>
  `
      : ''
  }

  <div class="section-title">Laboratory Results & Reference Ranges</div>
  <table>
    <thead>
      <tr>
        <th>Test Name</th>
        <th>Measured Value</th>
        <th>Source Reference Range</th>
        <th>Interpretation</th>
        <th>Provenance</th>
        <th>Verification</th>
      </tr>
    </thead>
    <tbody>
      ${
        labs.length === 0
          ? '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No laboratory results recorded.</td></tr>'
          : labs
              .map(
                (l) => `
        <tr>
          <td><strong>${l.testName}</strong><br/><small style="color:#64748b;">${l.testCategory || ''}</small></td>
          <td><strong>${l.measuredValue}</strong> ${l.unit || ''}</td>
          <td>${l.referenceRangeText || '<em>Reference range unavailable</em>'}</td>
          <td>
            <span class="badge ${
              l.interpretation === 'LOW'
                ? 'badge-low'
                : l.interpretation === 'HIGH'
                ? 'badge-high'
                : l.interpretation === 'NORMAL'
                ? 'badge-normal'
                : 'badge-unavail'
            }">
              ${l.interpretation}
            </span>
          </td>
          <td>${l.provenanceSource}</td>
          <td>${l.verificationStatus}</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="section-title">Active Medications</div>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Dosage & Frequency</th>
        <th>Route</th>
        <th>Status</th>
        <th>Provenance</th>
      </tr>
    </thead>
    <tbody>
      ${
        meds.length === 0
          ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No medications documented.</td></tr>'
          : meds
              .map(
                (m) => `
        <tr>
          <td><strong>${m.drugName}</strong></td>
          <td>${m.dosage || 'Unspecified'} • ${m.frequency || 'Unspecified'}</td>
          <td>${m.route || 'Oral'}</td>
          <td>${m.status}</td>
          <td>${m.provenanceSource}</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="section-title">Documented Allergies</div>
  <table>
    <thead>
      <tr>
        <th>Allergen</th>
        <th>Reaction</th>
        <th>Severity</th>
        <th>Provenance</th>
      </tr>
    </thead>
    <tbody>
      ${
        allergies.length === 0
          ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No known allergies documented.</td></tr>'
          : allergies
              .map(
                (a) => `
        <tr>
          <td><strong>${a.allergen}</strong></td>
          <td>${a.reaction || 'None recorded'}</td>
          <td>${a.severity}</td>
          <td>${a.provenanceSource}</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    MedLens Clinical Intelligence Platform • Provenance Verified • End of Report
  </div>
  <script>window.print();</script>
</body>
</html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
