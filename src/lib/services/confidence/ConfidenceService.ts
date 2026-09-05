import { LaboratoryResult, Medication, Allergy, Condition, Symptom } from '../validation/schemas';

export class ConfidenceService {
  /**
   * Calculates extraction confidence from OCR quality, source text coverage, and parsing integrity.
   * NOTE: Represents extraction fidelity, NEVER medical certainty or disease diagnosis probability.
   */
  static calculateLabConfidence(lab: Partial<LaboratoryResult>, ocrConfidence = 0.98): number {
    let score = 0;

    // 1. OCR baseline quality (Weight: 30%)
    score += (ocrConfidence || 0.95) * 0.3;

    // 2. Source text evidence presence and alignment (Weight: 30%)
    if (lab.sourceText && lab.sourceText.length > 3) {
      const lowerSource = lab.sourceText.toLowerCase();
      const lowerName = (lab.testName || '').toLowerCase();
      const hasName =
        lowerName.length > 0 &&
        (lowerSource.includes(lowerName.slice(0, 4)) ||
          lowerSource.includes(lowerName) ||
          (lowerName === 'hemoglobin' && lowerSource.includes('hgb')) ||
          (lowerName.includes('white blood cell') && lowerSource.includes('wbc')) ||
          (lowerName === 'hematocrit' && lowerSource.includes('hct')) ||
          (lowerName.includes('platelet') && (lowerSource.includes('plt') || lowerSource.includes('platelet'))));
      const hasVal = lab.value ? lowerSource.includes(lab.value.toString()) : false;

      if (hasName && hasVal) {
        score += 0.3;
      } else if (hasName || hasVal) {
        score += 0.28;
      } else {
        score += 0.15;
      }
    } else {
      score += 0.25;
    }

    // 3. Numeric Parsing & Unit Completeness (Weight: 25%)
    if (lab.numericValue !== null && lab.numericValue !== undefined && !isNaN(lab.numericValue)) {
      score += 0.15;
    }
    if (lab.unit && lab.unit.length > 0) {
      score += 0.1;
    }

    // 4. Reference Range Parsing Validity (Weight: 15%)
    if (lab.referenceRange) {
      if (lab.referenceLow !== null || lab.referenceHigh !== null) {
        score += 0.15;
      } else {
        score += 0.08;
      }
    } else {
      // If reference range unavailable, no penalty if properly classified as REFERENCE_UNAVAILABLE
      score += 0.15;
    }

    return Math.min(0.999, Math.max(0.5, Math.round(score * 1000) / 1000));
  }

  static calculateMedicationConfidence(med: Partial<Medication>, ocrConfidence = 0.98): number {
    let score = (ocrConfidence || 0.95) * 0.4;

    if (med.drugName && med.drugName.length >= 2) score += 0.25;
    if (med.dose) score += 0.15;
    if (med.frequency) score += 0.1;
    if (med.sourceText) score += 0.1;

    return Math.min(0.999, Math.max(0.5, Math.round(score * 1000) / 1000));
  }

  static calculateAllergyConfidence(all: Partial<Allergy>, ocrConfidence = 0.98): number {
    let score = (ocrConfidence || 0.95) * 0.4;
    if (all.allergen && all.allergen.length >= 2) score += 0.3;
    if (all.reaction) score += 0.15;
    if (all.sourceText) score += 0.15;

    return Math.min(0.999, Math.max(0.5, Math.round(score * 1000) / 1000));
  }
}
