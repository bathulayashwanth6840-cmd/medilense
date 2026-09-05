import { ClinicalExtraction, LaboratoryResult, Medication, Allergy, Condition, Symptom } from '../validation/schemas';
import { ReferenceRangeClassifier } from '../classification/ReferenceRangeClassifier';

// Canonical Standard Lab Test Name Dictionary
const STANDARD_LAB_NAMES: Record<string, string> = {
  hgb: 'Hemoglobin',
  hemoglobin: 'Hemoglobin',
  hct: 'Hematocrit',
  hematocrit: 'Hematocrit',
  wbc: 'White Blood Cell Count',
  'wbc count': 'White Blood Cell Count',
  plt: 'Platelets',
  platelet: 'Platelets',
  platelets: 'Platelets',
  mcv: 'Mean Corpuscular Volume (MCV)',
  mch: 'Mean Corpuscular Hemoglobin (MCH)',
  mchc: 'Mean Corpuscular Hemoglobin Concentration (MCHC)',
  ferritin: 'Ferritin',
  'serum iron': 'Total Iron',
  iron: 'Total Iron',
  tibc: 'Total Iron Binding Capacity (TIBC)',
  'vit d': 'Vitamin D, 25-Hydroxy',
  'vitamin d': 'Vitamin D, 25-Hydroxy',
  'vitamin d, 25-oh': 'Vitamin D, 25-Hydroxy',
  'vit b12': 'Vitamin B12',
  'vitamin b12': 'Vitamin B12',
  cholesterol: 'Total Cholesterol',
  'total cholesterol': 'Total Cholesterol',
  triglycerides: 'Triglycerides',
  hdl: 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  ldl: 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  glucose: 'Glucose, Fasting',
  'fasting glucose': 'Glucose, Fasting',
  'blood glucose': 'Glucose, Fasting',
  hba1c: 'Hemoglobin A1c',
  'a1c': 'Hemoglobin A1c',
  creatinine: 'Serum Creatinine',
  'serum creatinine': 'Serum Creatinine',
  egfr: 'eGFR',
  bun: 'Blood Urea Nitrogen (BUN)',
  sodium: 'Sodium',
  potassium: 'Potassium',
  'serum potassium': 'Potassium',
  chloride: 'Chloride',
  calcium: 'Calcium',
  magnesium: 'Magnesium',
  tsh: 'Thyroid Stimulating Hormone (TSH)',
  ast: 'Aspartate Aminotransferase (AST)',
  alt: 'Alanine Aminotransferase (ALT)',
  crp: 'C-Reactive Protein (CRP)',
  'c-reactive protein': 'C-Reactive Protein (CRP)',
  troponin: 'Troponin I',
  'troponin i': 'Troponin I',
};

// Canonical Standard Units Dictionary
const STANDARD_UNITS: Record<string, string> = {
  'g/dl': 'g/dL',
  'g/l': 'g/L',
  'mg/dl': 'mg/dL',
  'mg/l': 'mg/L',
  'ug/dl': 'ug/dL',
  'mcg/dl': 'mcg/dL',
  'ng/ml': 'ng/mL',
  'pg/ml': 'pg/mL',
  'k/ul': 'k/uL',
  '10*3/ul': 'k/uL',
  'x10^3/ul': 'k/uL',
  '10^3/ul': 'k/uL',
  'meq/l': 'mEq/L',
  'mmol/l': 'mmol/L',
  'umol/l': 'umol/L',
  'iu/l': 'IU/L',
  'u/l': 'U/L',
  'fl': 'fL',
  '%': '%',
  'ml/min/1.73m2': 'mL/min/1.73m²',
  'ml/min': 'mL/min',
};

export class NormalizationService {
  /**
   * Normalizes entire clinical extraction while strictly preserving original source texts and raw values.
   */
  static normalizeClinicalData(data: ClinicalExtraction): ClinicalExtraction {
    return {
      ...data,
      patient: data.patient ? this.normalizePatient(data.patient) : undefined,
      laboratoryResults: (data.laboratoryResults || []).map(l => this.normalizeLabResult(l)),
      medications: (data.medications || []).map(m => this.normalizeMedication(m)),
      allergies: (data.allergies || []).map(a => this.normalizeAllergy(a)),
      conditions: (data.conditions || []).map(c => this.normalizeCondition(c)),
      symptoms: (data.symptoms || []).map(s => this.normalizeSymptom(s)),
      observations: data.observations || [],
    };
  }

  static normalizeLabResult(lab: LaboratoryResult): LaboratoryResult {
    // 1. Normalize Test Name
    const cleanTestNameKey = lab.testName.trim().toLowerCase().replace(/[,:]/g, '');
    const normalizedName = STANDARD_LAB_NAMES[cleanTestNameKey] || this.toTitleCase(lab.testName.trim());

    // 2. Normalize Unit
    let normalizedUnit = lab.unit ? lab.unit.trim() : null;
    if (normalizedUnit) {
      const unitKey = normalizedUnit.toLowerCase();
      normalizedUnit = STANDARD_UNITS[unitKey] || normalizedUnit;
    }

    const rawRange = lab.sourceReferenceRange ?? lab.referenceRange ?? null;

    // 3. Classify reference range deterministically
    const evaluated = ReferenceRangeClassifier.classifyLabResult({
      ...lab,
      testName: normalizedName,
      unit: normalizedUnit,
      sourceReferenceRange: rawRange,
      referenceRange: rawRange,
    });

    return {
      ...lab,
      testName: normalizedName,
      unit: normalizedUnit,
      sourceReferenceRange: rawRange,
      referenceRange: rawRange,
      numericValue: evaluated.numericValue,
      referenceLow: evaluated.referenceLow,
      referenceHigh: evaluated.referenceHigh,
      status: evaluated.status,
      referenceSource: evaluated.referenceSource,
      // Source text is PRESERVED unchanged
      sourceText: lab.sourceText,
    };
  }

  static normalizeMedication(med: Medication): Medication {
    let cleanDrug = med.drugName.trim();
    // Strip common dosage forms from title (e.g. 'Metformin HCl Tab' -> 'Metformin')
    cleanDrug = cleanDrug.replace(/\b(hcl|hydrochloride|tab|tablet|cap|capsule|er|xr|sr|po)\b/gi, '').trim();
    cleanDrug = this.toTitleCase(cleanDrug);

    return {
      ...med,
      drugName: cleanDrug,
      dose: med.dose ? med.dose.trim() : null,
      frequency: med.frequency ? this.normalizeFrequency(med.frequency.trim()) : null,
      route: med.route ? this.toTitleCase(med.route.trim()) : 'Oral',
      sourceText: med.sourceText,
    };
  }

  static normalizeAllergy(all: Allergy): Allergy {
    return {
      ...all,
      allergen: this.toTitleCase(all.allergen.trim()),
      reaction: all.reaction ? this.toTitleCase(all.reaction.trim()) : null,
      sourceText: all.sourceText,
    };
  }

  static normalizeCondition(cond: Condition): Condition {
    return {
      ...cond,
      condition: this.toTitleCase(cond.condition.trim()),
      sourceText: cond.sourceText,
    };
  }

  static normalizeSymptom(sym: Symptom): Symptom {
    return {
      ...sym,
      symptom: this.toTitleCase(sym.symptom.trim()),
      sourceText: sym.sourceText,
    };
  }

  static normalizePatient(pat: any): any {
    return {
      ...pat,
      fullName: pat.fullName ? this.toTitleCase(pat.fullName.trim()) : pat.fullName,
      mrn: pat.mrn ? pat.mrn.trim().toUpperCase() : pat.mrn,
    };
  }

  private static normalizeFrequency(freq: string): string {
    const f = freq.toLowerCase();
    if (f.includes('once daily') || f === 'qd' || f === 'qday') return 'Once daily';
    if (f.includes('twice daily') || f === 'bid') return 'Twice daily';
    if (f.includes('three times') || f === 'tid') return 'Three times daily';
    if (f.includes('four times') || f === 'qid') return 'Four times daily';
    if (f.includes('at bedtime') || f === 'qhs') return 'Once daily at bedtime';
    if (f.includes('weekly')) return 'Weekly';
    if (f.includes('as needed') || f === 'prn') return 'As needed (PRN)';
    return this.toTitleCase(freq);
  }

  private static toTitleCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
