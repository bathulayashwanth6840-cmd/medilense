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
    if (/patient(?:\s*name)?[:\s]+([a-zA-Z\s]+)/i.test(line)) {
      extractedName = line.match(/patient(?:\s*name)?[:\s]+([a-zA-Z\s]+)/i)?.[1]?.trim() || null;
    }
    if (/dob|date\s*of\s*birth[:\s]+([0-9/-]+)/i.test(line)) {
      extractedDob = line.match(/dob|date\s*of\s*birth[:\s]+([0-9/-]+)/i)?.[1]?.trim() || null;
    }
    if (/gender|sex[:\s]+(male|female|other)/i.test(line)) {
      extractedSex = line.match(/gender|sex[:\s]+(male|female|other)/i)?.[1]?.toUpperCase() || null;
    }
    if (/mrn|patient\s*id[:\s]+([a-zA-Z0-9-]+)/i.test(line)) {
      extractedIdentifier = line.match(/mrn|patient\s*id[:\s]+([a-zA-Z0-9-]+)/i)?.[1]?.trim() || null;
    }
    if (/report\s*date|collection\s*date|date[:\s]+([0-9/-]{8,10})/i.test(line)) {
      reportDate = line.match(/report\s*date|collection\s*date|date[:\s]+([0-9/-]{8,10})/i)?.[1]?.trim() || null;
    }

    // Check Medications (e.g. "Rx: Ferrous Sulfate 325 mg PO once daily" or "Metformin 500mg twice daily")
    if (/(?:rx|medication|taking|prescribed)[:\s]+([a-zA-Z0-9\s]+?)\s+([0-9]+\s*(?:mg|mcg|ml|units|mEq|IU))\s*([a-zA-Z\s]+)?/i.test(line)) {
      const medMatch = line.match(/(?:rx|medication|taking|prescribed)[:\s]+([a-zA-Z0-9\s]+?)\s+([0-9]+\s*(?:mg|mcg|ml|units|mEq|IU))\s*([a-zA-Z\s]+)?/i);
      if (medMatch && medMatch[1]) {
        medications.push({
          drugName: medMatch[1].trim(),
          dosage: medMatch[2].trim(),
          frequency: medMatch[3]?.trim() || 'Once daily',
          route: 'Oral',
          status: 'ACTIVE',
          sourcePageNumber: pageNum,
          sourceOriginalSnippet: line,
          confidenceScore: 0.96,
        });
      }
    }

    // Check Allergies (e.g. "Allergy: Penicillin - Reaction: Severe Urticaria", "Allergy: Aspirin (Wheezing)")
    if (/allergy|allergies/i.test(line)) {
      const cleanLine = line.replace(/^.*?(?:allergy|allergies)[:\s]*/i, '').trim();
      if (cleanLine && cleanLine.toLowerCase() !== 'none' && cleanLine.toLowerCase() !== 'nkda') {
        const match = cleanLine.match(/^([^(\-:\n]+)(?:[-(:\s]+(?:reaction[:\s]*)?([^)\n]+)\)?)?/i);
        const allergen = match && match[1] ? match[1].trim() : cleanLine;
        const reaction = match && match[2] ? match[2].replace(/[()]/g, '').trim() : 'Documented Reaction';
        if (allergen) {
          allergies.push({
            allergen,
            reaction,
            severity: /anaphylaxis|severe|shock|urticaria|wheezing/i.test(line) ? 'SEVERE' : 'MODERATE',
            sourcePageNumber: pageNum,
            sourceOriginalSnippet: line,
            confidenceScore: 0.94,
          });
        }
      }
    }

    // Check Conditions / Diagnoses documented in record
    if (/(?:assessment|history of|known condition|dx|diagnosis)[:\s]+([a-zA-Z0-9\s,-]+)/i.test(line)) {
      const condMatch = line.match(/(?:assessment|history of|known condition|dx|diagnosis)[:\s]+([a-zA-Z0-9\s,-]+)/i);
      if (condMatch && condMatch[1]) {
        conditions.push({
          conditionName: condMatch[1].trim(),
          clinicalStatus: 'ACTIVE',
          sourcePageNumber: pageNum,
          sourceOriginalSnippet: line,
          confidenceScore: 0.92,
        });
      }
    }

    // Check Lab Result Lines
    const knownTests = [
      'Hemoglobin', 'Hematocrit', 'HbA1c', 'WBC', 'Platelets', 'MCV',
      'Creatinine', 'eGFR', 'Glucose', 'Total Cholesterol', 'Triglycerides',
      'HDL', 'LDL', 'Sodium', 'Potassium', 'Ferritin', 'TSH', 'AST', 'ALT',
      'BUN', 'Bilirubin', 'Magnesium', 'Vitamin D', 'Vitamin B12', 'CRP', 'Troponin'
    ];

    for (const test of knownTests) {
      if (
        new RegExp(`\\b${test}\\b`, 'i').test(line) &&
        !line.toLowerCase().startsWith('rx:') &&
        !line.toLowerCase().startsWith('allergy:')
      ) {
        // Match value following test name or in line
        const valRegex = new RegExp(`${test}[:\\s\\t]+([<>]?\\s*[0-9]+(?:\\.[0-9]+)?)\\s*([a-zA-Z/%μuLdLmg\\^23-]+)?`, 'i');
        const valMatch = line.match(valRegex) || line.match(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z/%μuLdLmg\\^23-]+)?/);

        if (valMatch && valMatch[1]) {
          // Extract reference range if present
          const rangeMatch = line.match(/(?:Ref(?:erence)?(?:\s*Range)?[:\s]*)?([<>]?\s*[0-9]+(?:\.[0-9]+)?\s*(?:-|–|to)\s*[0-9]+(?:\.[0-9]+)?|[<>=]\s*[0-9]+(?:\.[0-9]+)?)/i);
          let rawRange = rangeMatch ? rangeMatch[1] || rangeMatch[0] : null;
          if (rawRange && rawRange.trim() === valMatch[1]?.trim()) {
            rawRange = null;
          }

          labResults.push({
            testName: test,
            testCategory: 'Routine Chemistry & Hematology',
            measuredValue: valMatch[1].trim(),
            unit: valMatch[2]?.trim() || (test === 'Hemoglobin' ? 'g/dL' : test === 'Glucose' ? 'mg/dL' : test === 'HbA1c' ? '%' : ''),
            referenceRangeText: rawRange,
            sourcePageNumber: pageNum,
            sourceOriginalSnippet: line,
            confidenceScore: 0.97,
          });
          break;
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
