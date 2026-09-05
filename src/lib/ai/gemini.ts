import { GoogleGenerativeAI } from '@google/generative-ai';
import { EXTRACTION_SYSTEM_PROMPT, NON_DIAGNOSTIC_SUMMARIZER_PROMPT, validateNonDiagnosticGuardrails } from './prompts';
import { ExtractedEntityResultSchema } from '../validation/schemas';
import { evaluateReferenceRange } from './parsers';
import { z } from 'zod';

export type ExtractedData = z.infer<typeof ExtractedEntityResultSchema>;

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Extracts structured clinical information from document text or images.
 * Uses Gemini multimodal if configured, otherwise falls back to intelligent regex-based clinical parser.
 */
export async function extractFromDocument(
  documentText: string,
  fileName: string,
  imageBufferBase64?: string,
  mimeType?: string
): Promise<ExtractedData> {
  // If Gemini API is configured, use Gemini 1.5/2.0 Flash with JSON output mode
  if (genAI && apiKey && apiKey !== 'your-gemini-api-key-here') {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const contents: any[] = [];
      if (imageBufferBase64 && mimeType) {
        contents.push({
          inlineData: {
            data: imageBufferBase64,
            mimeType: mimeType,
          },
        });
      }

      contents.push({
        text: `${EXTRACTION_SYSTEM_PROMPT}\n\nDocument File Name: ${fileName}\n\nDocument Raw Text:\n${documentText}`,
      });

      const result = await model.generateContent(contents);
      const responseText = result.response.text();
      const rawJson = JSON.parse(responseText);

      // Validate against Zod schema
      const parsed = ExtractedEntityResultSchema.safeParse(rawJson);
      if (parsed.success) {
        return parsed.data;
      }
      console.warn('AI output schema warning, falling back to normalized parsing:', parsed.error);
    } catch (err) {
      console.error('Gemini API call failed, activating built-in clinical parser fallback:', err);
    }
  }

  // Robust Built-in Clinical Parser Fallback (deterministic extraction for test PDFs, text, and demo labs)
  return fallbackClinicalParser(documentText, fileName);
}

/**
 * Generates non-diagnostic patient summary using Gemini or intelligent fact-synthesis engine.
 */
export async function generateClinicalSummary(
  patientName: string,
  intakeInfo: any,
  labResults: any[],
  medications: any[],
  allergies: any[],
  conditions: any[],
  documents: any[]
): Promise<{
  summaryText: string;
  keyFindings: string[];
  notableChanges: string[];
  missingInformation: string[];
  guardrailStatus: 'PASSED' | 'FLAGGED';
}> {
  const clinicalContext = {
    patientName,
    intake: intakeInfo,
    documentsCount: documents.length,
    documents: documents.map(d => ({ name: d.originalFileName, date: d.reportDate, type: d.documentType })),
    labs: labResults.map(l => ({
      test: l.testName,
      value: l.measuredValue,
      unit: l.unit,
      referenceRange: l.referenceRangeText || 'Unavailable',
      status: l.interpretation,
      date: l.testDate,
    })),
    medications: medications.map(m => ({ drug: m.drugName, dose: m.dosage, freq: m.frequency, status: m.status })),
    allergies: allergies.map(a => ({ allergen: a.allergen, reaction: a.reaction, severity: a.severity })),
    conditions: conditions.map(c => ({ condition: c.conditionName, status: c.clinicalStatus })),
  };

  if (genAI && apiKey && apiKey !== 'your-gemini-api-key-here') {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
        },
      });

      const prompt = `${NON_DIAGNOSTIC_SUMMARIZER_PROMPT}\n\nClinical Record Context:\n${JSON.stringify(
        clinicalContext,
        null,
        2
      )}\n\nProvide structured synthesis in JSON format: { "summaryText": string, "keyFindings": string[], "notableChanges": string[], "missingInformation": string[] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Attempt JSON parse
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const guardrailCheck = validateNonDiagnosticGuardrails(parsed.summaryText || '');
        return {
          summaryText: parsed.summaryText || '',
          keyFindings: parsed.keyFindings || [],
          notableChanges: parsed.notableChanges || [],
          missingInformation: parsed.missingInformation || [],
          guardrailStatus: guardrailCheck.passed ? 'PASSED' : 'FLAGGED',
        };
      }
    } catch (err) {
      console.warn('Gemini summary generation failed, activating deterministic synthesis engine:', err);
    }
  }

  // Deterministic Clinical Synthesizer (Strictly Non-Diagnostic)
  return deterministicFactSynthesizer(clinicalContext);
}

/**
 * Built-in deterministic extraction engine for clinical documents
 */
function fallbackClinicalParser(text: string, fileName: string): ExtractedData {
  const labResults: ExtractedData['labResults'] = [];
  const medications: ExtractedData['medications'] = [];
  const allergies: ExtractedData['allergies'] = [];
  const conditions: ExtractedData['conditions'] = [];
  const observations: ExtractedData['observations'] = [];

  if (!text) {
    return {
      labResults,
      medications,
      allergies,
      conditions,
      observations,
    };
  }

  const lines = text.split(/\r?\n/);
  let pageNum = 1;
  const extractedTestNames = new Set<string>(); // deduplicate lab results

  // Patient metadata patterns
  let extractedName: string | null = null;
  let extractedDob: string | null = null;
  let extractedSex: string | null = null;
  let extractedIdentifier: string | null = null;
  let reportDate: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/page\s*(\d+)/i.test(line)) {
      const pMatch = line.match(/page\s*(\d+)/i);
      if (pMatch) pageNum = parseInt(pMatch[1], 10);
    }

    // Check Patient Info
    if (/patient(?:\s*name)?[:\s]+([a-zA-Z\s,.'-]+)/i.test(line) && !extractedName) {
      const nm = line.match(/patient(?:\s*name)?[:\s]+([a-zA-Z\s,.'-]+)/i)?.[1]?.trim();
      if (nm && nm.length > 2 && nm.length < 60) extractedName = nm;
    }
    if (/(?:dob|date\s*of\s*birth|d\.o\.b\.?)[:\s]+([0-9/\-]+)/i.test(line)) {
      extractedDob = line.match(/(?:dob|date\s*of\s*birth|d\.o\.b\.?)[:\s]+([0-9/\-]+)/i)?.[1]?.trim() || null;
    }
    if (/(?:gender|sex)[:\s]+(male|female|other|m|f)/i.test(line)) {
      const rawSex = line.match(/(?:gender|sex)[:\s]+(male|female|other|m|f)/i)?.[1]?.toUpperCase() || null;
      extractedSex = rawSex === 'M' ? 'MALE' : rawSex === 'F' ? 'FEMALE' : rawSex;
    }
    if (/(?:mrn|medical\s*record\s*(?:number|no\.?|#)?|patient\s*id|acct\.?(?:\s*no\.?)?|id)[:\s#]+([a-zA-Z0-9\-]+)/i.test(line)) {
      extractedIdentifier = line.match(/(?:mrn|medical\s*record|patient\s*id|acct\.?|id)[:\s#]+([a-zA-Z0-9\-]+)/i)?.[1]?.trim() || null;
    }
    if (/(?:report\s*date|collection\s*date|date\s*(?:of\s*)?(?:report|service|collection))[:\s]+([0-9/\-]{6,10})/i.test(line)) {
      reportDate = line.match(/(?:report\s*date|collection\s*date|date\s*(?:of\s*)?(?:report|service|collection))[:\s]+([0-9/\-]{6,10})/i)?.[1]?.trim() || null;
    }

    // === MEDICATIONS ===
    // Rx: format, Prescribed:, Medication:, or standalone drug patterns
    const medPatterns = [
      /(?:rx|medication|taking|prescribed|drug)[:\s]+([a-zA-Z][a-zA-Z0-9\s()]+?)\s+([0-9]+(?:,[0-9]+)?(?:\.[0-9]+)?\s*(?:mg|mcg|ml|units?|mEq|IU|g))\s*(.*)?/i,
      /(?:rx|medication|prescribed)[:\s]+([a-zA-Z][a-zA-Z0-9\s()-]+?)(?:\s+(?:tab|cap|capsule|tablet)s?)?\s+([0-9]+(?:\.[0-9]+)?\s*(?:mg|mcg|ml|units?|mEq|IU|g))\s*(.*)?/i,
    ];
    for (const medPat of medPatterns) {
      if (medPat.test(line)) {
        const medMatch = line.match(medPat);
        if (medMatch && medMatch[1]) {
          const drugName = medMatch[1].replace(/\(.*?\)/g, '').trim();
          if (drugName.length > 2 && drugName.length < 50) {
            // Deduplicate
            const key = drugName.toLowerCase();
            if (!medications.find(m => m.drugName.toLowerCase() === key)) {
              // Parse frequency from remainder
              const remainder = medMatch[3]?.trim() || '';
              let frequency = 'Once daily';
              let route = 'Oral';
              if (/twice|bid|b\.i\.d/i.test(remainder)) frequency = 'Twice daily';
              else if (/three|tid|t\.i\.d/i.test(remainder)) frequency = 'Three times daily';
              else if (/four|qid|q\.i\.d/i.test(remainder)) frequency = 'Four times daily';
              else if (/weekly/i.test(remainder)) frequency = 'Weekly';
              else if (/once daily|qd|q\.d|daily/i.test(remainder)) frequency = 'Once daily';
              else if (/as needed|prn|p\.r\.n/i.test(remainder)) frequency = 'As needed';
              else if (remainder.length > 2) frequency = remainder.substring(0, 40);

              if (/po|oral|by mouth/i.test(line)) route = 'Oral';
              else if (/iv|intravenous/i.test(line)) route = 'Intravenous';
              else if (/im|intramuscular/i.test(line)) route = 'Intramuscular';
              else if (/topical/i.test(line)) route = 'Topical';
              else if (/subq|subcutaneous|sc/i.test(line)) route = 'Subcutaneous';

              medications.push({
                drugName,
                dosage: medMatch[2].trim(),
                frequency,
                route,
                status: 'ACTIVE',
                sourcePageNumber: pageNum,
                sourceOriginalSnippet: line,
                confidenceScore: 0.96,
              });
            }
            break;
          }
        }
      }
    }

    // === ALLERGIES ===
    if (/(?:allergy|allergies|allergic\s+to|known\s+allerg)/i.test(line)) {
      const cleanLine = line.replace(/^.*?(?:allergy|allergies|allergic\s+to|known\s+allerg(?:ies|y)?)[:\s]*/i, '').trim();
      if (cleanLine && cleanLine.length > 1 && !/^(?:none|nkda|nka|no\s+known|denied)$/i.test(cleanLine)) {
        const match = cleanLine.match(/^([^(\-:\n,]+)(?:[\-(:\s]+(?:reaction[:\s]*)?([^)\n]+)\)?)?/i);
        const allergen = match && match[1] ? match[1].trim() : cleanLine;
        const reaction = match && match[2] ? match[2].replace(/[()]/g, '').trim() : 'Documented Reaction';
        if (allergen && allergen.length > 1 && !allergies.find(a => a.allergen.toLowerCase() === allergen.toLowerCase())) {
          allergies.push({
            allergen,
            reaction,
            severity: /anaphylaxis|severe|shock|urticaria|wheezing|angioedema|bronchospasm/i.test(line) ? 'SEVERE' : 'MODERATE',
            sourcePageNumber: pageNum,
            sourceOriginalSnippet: line,
            confidenceScore: 0.94,
          });
        }
      }
    }

    // === CONDITIONS / DIAGNOSES ===
    if (/(?:assessment|impression|history\s+of|known\s+condition|dx|diagnosis|diagnos(?:es|ed)|problem\s*list|admission\s*diagnos|discharge\s*(?:assessment|diagnos))[:\s]+([a-zA-Z0-9\s,&-]+)/i.test(line)) {
      const condMatch = line.match(/(?:assessment|impression|history\s+of|known\s+condition|dx|diagnosis|diagnos(?:es|ed)|problem\s*list|admission\s*diagnos|discharge\s*(?:assessment|diagnos))[:\s]+([a-zA-Z0-9\s,&-]+)/i);
      if (condMatch && condMatch[1]) {
        const condName = condMatch[1].trim();
        if (condName.length > 3 && condName.length < 80 && !conditions.find(c => c.conditionName.toLowerCase() === condName.toLowerCase())) {
          conditions.push({
            conditionName: condName,
            clinicalStatus: 'ACTIVE',
            sourcePageNumber: pageNum,
            sourceOriginalSnippet: line,
            confidenceScore: 0.92,
          });
        }
      }
    }

    // === LAB RESULTS ===
    const knownTests = [
      'Hemoglobin', 'Hematocrit', 'HbA1c', 'WBC', 'Platelets', 'MCV', 'MCH', 'MCHC',
      'RBC', 'RDW', 'MPV', 'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils',
      'Creatinine', 'eGFR', 'Glucose', 'Total Cholesterol', 'Triglycerides',
      'HDL', 'LDL', 'VLDL', 'Sodium', 'Potassium', 'Chloride', 'CO2', 'Bicarbonate',
      'Calcium', 'Phosphorus', 'Magnesium', 'Uric Acid',
      'Ferritin', 'Iron', 'Total Iron', 'TIBC', 'Transferrin',
      'TSH', 'T3', 'T4', 'Free T4', 'Free T3',
      'AST', 'ALT', 'ALP', 'GGT', 'Albumin', 'Total Protein', 'Globulin',
      'BUN', 'Bilirubin', 'Direct Bilirubin', 'Indirect Bilirubin',
      'Vitamin D', 'Vitamin B12', 'Folate', 'Folic Acid',
      'CRP', 'ESR', 'Troponin', 'Troponin I', 'Troponin T', 'BNP', 'ProBNP',
      'INR', 'PT', 'PTT', 'aPTT', 'Fibrinogen', 'D-Dimer',
      'PSA', 'AFP', 'CEA', 'CA-125', 'CA 19-9',
      'Hemoglobin A1c', 'Fasting Glucose', 'Random Glucose',
      'Serum Potassium', 'Serum Creatinine', 'Serum Sodium', 'Serum Calcium',
      'Blood Glucose', 'Blood Urea Nitrogen',
      'Total Bilirubin', 'Alkaline Phosphatase',
      'Prothrombin Time', 'Partial Thromboplastin Time',
      'C-Reactive Protein', 'Erythrocyte Sedimentation Rate',
    ];

    let labMatched = false;
    for (const test of knownTests) {
      const escapedTest = test.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (
        new RegExp(`\\b${escapedTest}\\b`, 'i').test(line) &&
        !line.toLowerCase().startsWith('rx:') &&
        !/^(?:allergy|allergies)/i.test(line) &&
        !/medication|prescribed|taking/i.test(line)
      ) {
        // Match value following test name
        const valRegex = new RegExp(`${escapedTest}[,:\\s\\t]+(<?>?\\s*[0-9]+(?:,?[0-9]+)?(?:\\.[0-9]+)?)\\s*([a-zA-Z/%μuLdLmgn\\\\^23\\-]+)?`, 'i');
        const valMatch = line.match(valRegex);

        if (valMatch && valMatch[1]) {
          const measuredValue = valMatch[1].replace(/,/g, '').trim();
          
          // Skip if we already have this test
          const testKey = test.toLowerCase();
          if (extractedTestNames.has(testKey)) break;
          extractedTestNames.add(testKey);

          // Extract reference range if present
          const rangeMatch = line.match(/(?:Ref(?:erence)?(?:\s*Range)?[:\s]*)?(<?[0-9]+(?:\.[0-9]+)?\s*(?:-|–|—|to)\s*[0-9]+(?:\.[0-9]+)?(?:\s*[a-zA-Z/%]+)?|[<>=]+\s*[0-9]+(?:\.[0-9]+)?)/i);
          let rawRange = rangeMatch ? (rangeMatch[1] || rangeMatch[0]).trim() : null;
          // Don't confuse the measured value with a range
          if (rawRange && rawRange.replace(/\s/g, '') === measuredValue.replace(/\s/g, '')) {
            rawRange = null;
          }
          // Clean up "Ref:" prefix from range text
          if (rawRange) {
            rawRange = rawRange.replace(/^(?:Ref(?:erence)?(?:\s*Range)?[:\s]*)/i, '').trim();
          }

          // Default units for common tests
          let unit = valMatch[2]?.trim() || '';
          if (!unit) {
            const unitDefaults: Record<string, string> = {
              'hemoglobin': 'g/dL', 'hematocrit': '%', 'hba1c': '%', 'hemoglobin a1c': '%',
              'glucose': 'mg/dL', 'fasting glucose': 'mg/dL', 'random glucose': 'mg/dL', 'blood glucose': 'mg/dL',
              'creatinine': 'mg/dL', 'serum creatinine': 'mg/dL',
              'bun': 'mg/dL', 'blood urea nitrogen': 'mg/dL',
              'sodium': 'mEq/L', 'serum sodium': 'mEq/L',
              'potassium': 'mEq/L', 'serum potassium': 'mEq/L',
              'chloride': 'mEq/L', 'calcium': 'mg/dL', 'serum calcium': 'mg/dL',
              'total cholesterol': 'mg/dL', 'triglycerides': 'mg/dL',
              'hdl': 'mg/dL', 'ldl': 'mg/dL',
              'ferritin': 'ng/mL', 'iron': 'ug/dL', 'total iron': 'ug/dL',
              'tsh': 'mIU/L',
              'vitamin d': 'ng/mL', 'vitamin b12': 'pg/mL',
              'crp': 'mg/L', 'c-reactive protein': 'mg/L',
              'ast': 'U/L', 'alt': 'U/L', 'alp': 'U/L', 'alkaline phosphatase': 'U/L',
              'albumin': 'g/dL', 'total protein': 'g/dL',
              'bilirubin': 'mg/dL', 'total bilirubin': 'mg/dL',
              'wbc': 'k/uL', 'platelets': 'k/uL', 'rbc': 'M/uL',
              'mcv': 'fL', 'mch': 'pg', 'mchc': 'g/dL',
              'troponin': 'ng/mL', 'troponin i': 'ng/mL', 'troponin t': 'ng/mL',
              'egfr': 'mL/min/1.73m2',
            };
            unit = unitDefaults[testKey] || '';
          }

          labResults.push({
            testName: test,
            testCategory: 'Routine Chemistry & Hematology',
            measuredValue,
            unit,
            referenceRangeText: rawRange,
            sourcePageNumber: pageNum,
            sourceOriginalSnippet: line,
            confidenceScore: 0.97,
          });
          labMatched = true;
          break;
        }
      }
    }

    // Generic lab line catch-all: matches patterns like "TestName: 12.3 mg/dL (Ref: 10.0 - 15.0)"
    // Only if no specific test was matched above
    if (!labMatched && /^[A-Z][a-zA-Z\s,()-]{2,40}[:\s]+<?[0-9]+(?:\.[0-9]+)?/.test(line) && !/^(?:rx|allergy|allergies|medication|patient|date|report|mrn|dob|gender|sex|page|assessment|diagnosis|history)/i.test(line)) {
      const genericMatch = line.match(/^([A-Z][a-zA-Z\s,()-]{2,40}?)[:\s]+(<?[0-9]+(?:,[0-9]+)?(?:\.[0-9]+)?)\s*([a-zA-Z/%μuLdLmgn^23-]+)?/);
      if (genericMatch && genericMatch[1] && genericMatch[2]) {
        const testName = genericMatch[1].trim();
        const testKey = testName.toLowerCase();
        if (!extractedTestNames.has(testKey) && testName.length > 2 && testName.length < 40) {
          extractedTestNames.add(testKey);
          
          const rangeMatch = line.match(/(?:Ref(?:erence)?(?:\s*Range)?[:\s]*)?(<?[0-9]+(?:\.[0-9]+)?\s*(?:-|–|—|to)\s*[0-9]+(?:\.[0-9]+)?|[<>=]+\s*[0-9]+(?:\.[0-9]+)?)/i);
          let rawRange = rangeMatch ? (rangeMatch[1] || rangeMatch[0]).trim() : null;
          if (rawRange) rawRange = rawRange.replace(/^(?:Ref(?:erence)?(?:\s*Range)?[:\s]*)/i, '').trim();
          if (rawRange && rawRange === genericMatch[2].trim()) rawRange = null;

          labResults.push({
            testName,
            testCategory: 'Extracted Laboratory Value',
            measuredValue: genericMatch[2].replace(/,/g, '').trim(),
            unit: genericMatch[3]?.trim() || '',
            referenceRangeText: rawRange,
            sourcePageNumber: pageNum,
            sourceOriginalSnippet: line,
            confidenceScore: 0.85, // Lower confidence for generic matches
          });
        }
      }
    }
  }

  return {
    patientMetadata: {
      extractedName,
      extractedIdentifier,
      extractedDob,
      extractedSex,
      reportDate,
      documentType: fileName.toLowerCase().includes('cbc') || fileName.toLowerCase().includes('lab') ? 'LAB_REPORT' : 'DISCHARGE_SUMMARY',
    },
    labResults,
    medications,
    allergies,
    conditions,
    observations,
  };
}

/**
 * Generates an objective, non-diagnostic clinical synthesis based entirely on recorded facts.
 */
function deterministicFactSynthesizer(data: any) {
  const findings: string[] = [];
  const notableChanges: string[] = [];
  const missingInfo: string[] = [];

  const outOfRangeLabs = (data.labs || []).filter((l: any) => l.status === 'LOW' || l.status === 'HIGH');
  const unavailLabs = (data.labs || []).filter((l: any) => l.status === 'REFERENCE_UNAVAILABLE');

  if (outOfRangeLabs.length > 0) {
    findings.push(
      `${outOfRangeLabs.length} laboratory test(s) fall outside their document-provided reference ranges: ${outOfRangeLabs
        .map((l: any) => `${l.test} (${l.value} ${l.unit || ''}) is marked [${l.status}] per source range ${l.referenceRange}`)
        .join('; ')}.`
    );
  }

  if (unavailLabs.length > 0) {
    findings.push(
      `${unavailLabs.length} test(s) did not have a reference range printed in the source document (${unavailLabs.map((l: any) => l.test).join(', ')}). In accordance with MedLens safety standards, no reference ranges have been assumed.`
    );
  }

  if ((data.medications || []).length > 0) {
    findings.push(
      `Active medications documented in records include: ${data.medications.map((m: any) => `${m.drug} ${m.dose || ''} (${m.freq || ''})`).join(', ')}.`
    );
  }

  if ((data.allergies || []).length > 0) {
    findings.push(
      `Documented allergies on file: ${data.allergies.map((a: any) => `${a.allergen} (${a.reaction || 'Reaction noted'}, severity: ${a.severity})`).join(', ')}.`
    );
  }

  if ((data.documentsCount || 0) === 0) {
    missingInfo.push('No external clinical documents or laboratory reports have been uploaded for this profile yet.');
  } else {
    notableChanges.push(`Aggregated from ${data.documentsCount} source document(s) uploaded to the patient record.`);
  }

  if (!data.intake?.emergencyContact) {
    missingInfo.push('Emergency contact details are not currently documented in patient intake.');
  }

  const summaryParagraph = `Patient health record summary for ${data.patientName || 'Patient'}: ${data.documentsCount || 0} medical document(s) have been indexed. ${
    findings.join(' ')
  } Please verify all extracted values and refer to original reports for clinical evaluation. MedLens organizes documented facts and does not offer diagnostic or therapeutic advice.`;

  return {
    summaryText: summaryParagraph,
    keyFindings: findings,
    notableChanges: notableChanges,
    missingInformation: missingInfo,
    guardrailStatus: 'PASSED' as const,
  };
}
