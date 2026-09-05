// MedLens Entity Matching Service
// Provides exact, normalized, and controlled fuzzy matching for clinical entities while preventing false positive cross-drug/cross-test conflicts.

export interface ClinicalEntity {
  name: string;
  category?: string;
  type?: 'MEDICATION' | 'LAB_TEST' | 'ALLERGY' | 'CONDITION' | 'PATIENT' | string;
}

export interface MatchResult {
  isMatch: boolean;
  matchType: 'EXACT' | 'NORMALIZED' | 'SYNONYM' | 'FUZZY' | 'NONE';
  confidence: number;
}

export interface IEntityMatchingService {
  areSameEntity(entityA: string | ClinicalEntity, entityB: string | ClinicalEntity, type?: string): boolean;
  matchEntities(entityA: string | ClinicalEntity, entityB: string | ClinicalEntity, type?: string): MatchResult;
  normalizeEntityName(name: string): string;
}

// Controlled Medical Synonyms Mapping
const CLINICAL_SYNONYMS: Record<string, string> = {
  // Labs
  hgb: 'hemoglobin',
  hb: 'hemoglobin',
  hemoglobin: 'hemoglobin',
  wbc: 'wbc count',
  'white blood cell count': 'wbc count',
  'white blood cells': 'wbc count',
  'wbc count': 'wbc count',
  plt: 'platelets',
  platelet: 'platelets',
  platelets: 'platelets',
  glucose: 'glucose, fasting',
  'fasting glucose': 'glucose, fasting',
  'glucose, fasting': 'glucose, fasting',
  'blood glucose': 'glucose, fasting',
  cholesterol: 'total cholesterol',
  'total cholesterol': 'total cholesterol',
  chol: 'total cholesterol',
  ferritin: 'ferritin',
  'serum ferritin': 'ferritin',
  tsh: 'tsh',
  'thyroid stimulating hormone': 'tsh',
  'vitamin d': 'vitamin d, 25-oh',
  'vit d': 'vitamin d, 25-oh',
  'vitamin d, 25-oh': 'vitamin d, 25-oh',
  '25-hydroxyvitamin d': 'vitamin d, 25-oh',

  // Medications
  metformin: 'metformin',
  'metformin hcl': 'metformin',
  'metformin hydrochloride': 'metformin',
  glucophage: 'metformin',
  lisinopril: 'lisinopril',
  prinivil: 'lisinopril',
  zestril: 'lisinopril',
  atorvastatin: 'atorvastatin',
  lipitor: 'atorvastatin',
  levothyroxine: 'levothyroxine',
  synthroid: 'levothyroxine',
  amoxicillin: 'amoxicillin',
  amoxil: 'amoxicillin',
  penicillin: 'penicillin',
  'penicillin v': 'penicillin',
  'penicillin vk': 'penicillin',

  // Conditions
  diabetes: 'diabetes mellitus',
  'type 2 diabetes': 'type 2 diabetes mellitus',
  't2dm': 'type 2 diabetes mellitus',
  'diabetes mellitus': 'diabetes mellitus',
  hypertension: 'essential hypertension',
  htn: 'essential hypertension',
  'high blood pressure': 'essential hypertension',
  anemia: 'anemia',
  'iron deficiency anemia': 'iron deficiency anemia',
};

// Dangerous Look-Alike / Sound-Alike (LASA) pairs that MUST NEVER match
const DISTINCT_LOOKALIKE_PAIRS: [string, string][] = [
  ['metformin', 'metoprolol'],
  ['amoxicillin', 'ampicillin'],
  ['prednisone', 'prednisolone'],
  ['celebrex', 'celexa'],
  ['clonidine', 'klonopin'],
  ['hydroxyzine', 'hydralazine'],
  ['lamictal', 'lamisil'],
  ['seroquel', 'serzone'],
  ['zyprexa', 'zyrtec'],
  ['heparin', 'hesspan'],
  ['duloxetine', 'fluoxetine'],
];

export class EntityMatchingService implements IEntityMatchingService {
  private static instance: EntityMatchingService;

  public static getInstance(): EntityMatchingService {
    if (!EntityMatchingService.instance) {
      EntityMatchingService.instance = new EntityMatchingService();
    }
    return EntityMatchingService.instance;
  }

  normalizeEntityName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s,\-]/g, '') // remove special symbols but keep comma/hyphen
      .replace(/\s+/g, ' ');
  }

  private extractName(entity: string | ClinicalEntity): string {
    if (typeof entity === 'string') return entity;
    return entity.name || '';
  }

  areSameEntity(
    entityA: string | ClinicalEntity,
    entityB: string | ClinicalEntity,
    type?: string
  ): boolean {
    const res = this.matchEntities(entityA, entityB, type);
    return res.isMatch;
  }

  matchEntities(
    entityA: string | ClinicalEntity,
    entityB: string | ClinicalEntity,
    type?: string
  ): MatchResult {
    const rawA = this.extractName(entityA);
    const rawB = this.extractName(entityB);

    if (!rawA || !rawB) {
      return { isMatch: false, matchType: 'NONE', confidence: 0 };
    }

    // 1. Exact Match
    if (rawA === rawB) {
      return { isMatch: true, matchType: 'EXACT', confidence: 1.0 };
    }

    // 2. Normalized Match
    const normA = this.normalizeEntityName(rawA);
    const normB = this.normalizeEntityName(rawB);

    if (normA === normB) {
      return { isMatch: true, matchType: 'NORMALIZED', confidence: 0.99 };
    }

    // Check Look-Alike / Sound-Alike blocklist
    for (const [pair1, pair2] of DISTINCT_LOOKALIKE_PAIRS) {
      if (
        (normA.includes(pair1) && normB.includes(pair2)) ||
        (normA.includes(pair2) && normB.includes(pair1))
      ) {
        return { isMatch: false, matchType: 'NONE', confidence: 0 };
      }
    }

    // 3. Synonym Match
    const synA = CLINICAL_SYNONYMS[normA] || normA;
    const synB = CLINICAL_SYNONYMS[normB] || normB;

    if (synA === synB) {
      return { isMatch: true, matchType: 'SYNONYM', confidence: 0.95 };
    }

    // Also check if one is prefix / substring with word boundaries (e.g. "Metformin 500mg" vs "Metformin")
    if (type !== 'PATIENT' && (normA.startsWith(normB) || normB.startsWith(normA))) {
      // Ensure it's not a different drug prefix like "Amoxi..."
      const shorter = normA.length < normB.length ? normA : normB;
      const longer = normA.length < normB.length ? normB : normA;
      if (longer.startsWith(shorter + ' ') || longer.startsWith(shorter + ',')) {
        return { isMatch: true, matchType: 'NORMALIZED', confidence: 0.92 };
      }
    }

    // 4. Controlled Fuzzy Match (Strict Levenshtein distance <= 1 for typo tolerance on names >= 6 chars)
    if (normA.length >= 6 && normB.length >= 6) {
      const dist = this.levenshteinDistance(normA, normB);
      if (dist <= 1) {
        return { isMatch: true, matchType: 'FUZZY', confidence: 0.88 };
      }
    }

    return { isMatch: false, matchType: 'NONE', confidence: 0 };
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

export const entityMatchingService = EntityMatchingService.getInstance();
