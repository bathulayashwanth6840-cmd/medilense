async function testLiveServer() {
  console.log('\n===============================================================');
  console.log('  TESTING LIVE MEDLENS RUNTIME & HTTP API ENDPOINTS');
  console.log('===============================================================\n');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let total = 0;

  async function checkRoute(url: string, method = 'GET', body?: any, expectedStatus = 200) {
    total++;
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.status === expectedStatus) {
        console.log(`  [PASS] ${method} ${url} -> HTTP ${res.status}`);
        passed++;
        return await res.json().catch(() => null);
      } else {
        console.error(`  [FAIL] ${method} ${url} -> Expected HTTP ${expectedStatus}, Got ${res.status}`);
        return null;
      }
    } catch (err: any) {
      console.error(`  [FAIL] ${method} ${url} -> Network Error: ${err.message}`);
      return null;
    }
  }

  // 1. Check Root & Dashboard Pages
  console.log('  --- Testing Navigation & Dashboard Pages ---');
  await checkRoute('/', 'GET');
  await checkRoute('/dashboard', 'GET');
  await checkRoute('/patients', 'GET');
  await checkRoute('/patients/new', 'GET');
  await checkRoute('/documents', 'GET');
  await checkRoute('/conflicts', 'GET');
  await checkRoute('/verification', 'GET');
  await checkRoute('/trends', 'GET');
  await checkRoute('/records', 'GET');
  await checkRoute('/evidence', 'GET');
  await checkRoute('/extractions', 'GET');
  await checkRoute('/audit', 'GET');
  await checkRoute('/settings', 'GET');

  // 2. Check Global Stats API & Documents API
  console.log('\n  --- Testing Global Dashboard APIs ---');
  const statsRes = await checkRoute('/api/stats', 'GET');
  console.log(`         Live Stats -> Patients: ${statsRes?.data?.totalPatients}, Documents: ${statsRes?.data?.totalDocuments}, Conflicts: ${statsRes?.data?.activeConflicts}, Pending Verification: ${statsRes?.data?.pendingVerification}`);

  const docsRes = await checkRoute('/api/documents', 'GET');
  console.log(`         Global Documents Registry -> ${docsRes?.data?.length || 0} total documents`);

  // 3. Check Patients API
  const patientsJson = await checkRoute('/api/patients', 'GET');
  console.log(`         Loaded ${patientsJson?.data?.length || 0} active patient records.`);

  // 4. Check Live Structured Patient Intake Form
  const intakePayload = {
    identifier: `MRN-LIVE-${Date.now().toString().slice(-5)}`,
    fullName: 'David K. Richardson',
    dateOfBirth: '1979-11-04',
    age: 47,
    sex: 'MALE',
    contactNumber: '+1 (555) 304-9988',
    bloodType: 'B+',
    emergencyContact: 'Karen Richardson (Wife) - +1 (555) 304-9987',
    symptoms: 'Mild exercise intolerance and shortness of breath',
    existingConditions: 'Hyperlipidemia, Chronic Rhinitis',
    allergies: 'Sulfa Drugs (Maculopapular rash)',
    medications: 'Atorvastatin 20mg daily at bedtime',
    medicalHistory: 'Tonsillectomy (1992)',
    additionalNotes: 'Live API integration test intake.',
  };

  const createdIntake = await checkRoute('/api/patients/intake', 'POST', intakePayload, 201);
  const createdPatientId = createdIntake?.data?.patient?.id;

  if (createdPatientId) {
    console.log(`         Successfully registered patient with ID: ${createdPatientId}`);

    // Check newly registered patient page
    await checkRoute(`/patients/${createdPatientId}`, 'GET');

    // 5. Check Document Ingestion
    const uploadPayload = {
      patientId: createdPatientId,
      originalFileName: 'Live_CBC_Metabolic_Report.txt',
      documentType: 'LAB_REPORT',
      rawText: `LabCorp Diagnostic Report\nPatient: David K. Richardson | MRN: ${intakePayload.identifier}\nHemoglobin: 11.4 g/dL (Ref: 13.0 - 17.0 g/dL) [L]\nTotal Cholesterol: 218 mg/dL (Ref: < 200 mg/dL) [H]\nFerritin: 15 ng/mL (Ref: 20 - 200 ng/mL) [L]\nRx: Ferrous Sulfate 325 mg PO daily\nAllergy: Sulfa Drugs - Reaction: Maculopapular rash`,
    };

    const uploadRes = await checkRoute('/api/documents/upload', 'POST', uploadPayload, 200);
    const docId = uploadRes?.data?.documentId;

    if (docId) {
      console.log(`         Successfully ingested document with ID: ${docId}`);

      // 6. Query Document Details & Extractions
      await checkRoute(`/api/documents/${docId}`, 'GET');
      await checkRoute(`/api/documents/${docId}/pages`, 'GET');
      const extractions = await checkRoute(`/api/documents/${docId}/extractions`, 'GET');
      console.log(`         Retrieved ${extractions?.data?.labResults?.length || 0} labs, ${extractions?.data?.medications?.length || 0} meds.`);

      // 7. Query Provenance Chain & Conflicts & Audit
      await checkRoute(`/api/documents/${docId}/provenance`, 'GET');
      await checkRoute(`/api/documents/${docId}/conflicts`, 'GET');
      await checkRoute(`/api/documents/${docId}/audit`, 'GET');

      // 8. Provenance System Specific Endpoints
      console.log('\n  --- Testing Provenance System Endpoints ---');
      await checkRoute(`/api/documents/${docId}/source/1`, 'GET');

      if (extractions?.data?.labResults?.length > 0) {
        const testLab = extractions.data.labResults[0];
        const provRes = await checkRoute(`/api/records/${testLab.id}/provenance`, 'GET');
        await checkRoute(`/api/records/${testLab.id}/provenance/history`, 'GET');

        if (provRes?.data?.id || provRes?.data?.provenanceId) {
          const pId = provRes.data.id || provRes.data.provenanceId;
          await checkRoute(`/api/provenance/${pId}`, 'GET');
        }
      }

      // 9. Verification Queue & Action Endpoints
      await checkRoute('/api/verification', 'GET');

      if (extractions?.data?.labResults?.length >= 2) {
        const lab1Id = extractions.data.labResults[0].id;
        const lab2Id = extractions.data.labResults[1].id;

        // Accept verification
        await checkRoute(`/api/verification/${lab1Id}/accept`, 'POST', {
          patientId: createdPatientId,
          entityType: 'LAB_RESULT',
          verifiedBy: 'Dr. Sarah Jenkins, MD',
          notes: 'Clinician accepted during live integration test',
        });

        // Edit verification
        await checkRoute(`/api/verification/${lab2Id}`, 'PATCH', {
          patientId: createdPatientId,
          entityType: 'LAB_RESULT',
          editedValues: { measuredValue: '215', notes: 'Clinician corrected value' },
          editedBy: 'Dr. Sarah Jenkins, MD',
          reason: 'Manual adjustment of borderline lab value',
        });

        // Check that verification added immutable history events
        const updatedHistory = await checkRoute(`/api/records/${lab2Id}/provenance/history`, 'GET');
        const hLen = updatedHistory?.history?.length || updatedHistory?.data?.length || 0;
        if (hLen > 1) {
          console.log(`         Verified provenance history appended immutable version (History Length: ${hLen}).`);
        }
      }

      // 10. Conflict Detection Engine Endpoints
      console.log('\n  --- Testing Conflict Detection Engine Endpoints ---');
      const allConflicts = await checkRoute('/api/conflicts', 'GET');
      console.log(`         Loaded ${allConflicts?.data?.length || 0} active conflicts.`);
      await checkRoute('/api/conflicts?status=UNREVIEWED', 'GET');
      await checkRoute('/api/conflicts?type=MEDICATION', 'GET');
      await checkRoute('/api/conflicts?severity=HIGH', 'GET');

      if (allConflicts?.data?.length > 0) {
        const cId = allConflicts.data[0].id;
        await checkRoute(`/api/conflicts/${cId}`, 'GET');
        await checkRoute(`/api/conflicts/${cId}/review`, 'POST', { reviewerId: 'rev-dr-jenkins' });
        await checkRoute(`/api/conflicts/${cId}/resolve`, 'POST', {
          reviewerId: 'rev-dr-jenkins',
          decision: 'CORRECT_VALUE',
          correctedValue: 'Metformin 750 mg PO BID with meals',
          reason: 'Adjusted dosage reconciled between clinic and hospital records',
        });
        await checkRoute(`/api/conflicts/${cId}/reopen`, 'POST', {
          reviewerId: 'rev-dr-jenkins',
          reason: 'New laboratory data received, re-evaluating dosage',
        });
        await checkRoute(`/api/conflicts/${cId}/dismiss`, 'POST', {
          reviewerId: 'rev-dr-jenkins',
          reason: 'Confirmed temporal medication step-up therapy',
        });
      }
    }
  }

  console.log('\n===============================================================');
  console.log(`  LIVE SERVER TEST: ${passed} / ${total} ROUTES PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================\n');

  if (passed === total) {
    console.log('🎉 ALL LIVE ENDPOINTS & INTERFACES ARE FULLY OPERATIONAL!\n');
  } else {
    process.exit(1);
  }
}

testLiveServer().catch(err => {
  console.error('Live server test failure:', err);
  process.exit(1);
});
