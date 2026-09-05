import { ReferenceInterpretation, ProvenanceSource, VerificationStatus } from '@/types/clinical';

export function formatDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return 'Not recorded';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

export function formatDateTime(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return 'Not recorded';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateVal);
  }
}

/**
 * Returns accessible, theme-aware badge styling & accessibility metadata for medical interpretations.
 * Does not rely on color alone — provides distinct icons, labels, and tooltips.
 */
export function getInterpretationBadgeProps(status: ReferenceInterpretation | string) {
  switch (status) {
    case 'LOW':
      return {
        label: 'LOW',
        symbol: '▼',
        bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40',
        dot: 'bg-amber-500',
        tooltip: 'Below source report reference range lower limit',
      };
    case 'HIGH':
      return {
        label: 'HIGH',
        symbol: '▲',
        bg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30 dark:border-orange-500/40',
        dot: 'bg-orange-500',
        tooltip: 'Above source report reference range upper limit',
      };
    case 'NORMAL':
      return {
        label: 'NORMAL',
        symbol: '✓',
        bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40',
        dot: 'bg-emerald-500',
        tooltip: 'Within source report provided reference range',
      };
    case 'CRITICAL_LOW':
      return {
        label: 'CRITICAL LOW',
        symbol: '▼▼',
        bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold',
        dot: 'bg-rose-600',
        tooltip: 'Critically low per source documentation',
      };
    case 'CRITICAL_HIGH':
      return {
        label: 'CRITICAL HIGH',
        symbol: '▲▲',
        bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold',
        dot: 'bg-rose-600',
        tooltip: 'Critically high per source documentation',
      };
    case 'UNDETERMINED':
      return {
        label: 'UNDETERMINED',
        symbol: '—',
        bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25 dark:border-slate-600/40',
        dot: 'bg-slate-400',
        tooltip: 'Quantitative value or qualitative outcome could not be determined',
      };
    case 'REFERENCE_UNAVAILABLE':
    default:
      return {
        label: 'REF UNAVAILABLE',
        symbol: '?',
        bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25 dark:border-slate-600/40',
        dot: 'bg-slate-400',
        tooltip: 'Source report did not specify a reference range (never guessed)',
      };
  }
}

export function getProvenanceBadgeProps(source: ProvenanceSource | string) {
  switch (source) {
    case 'USER_PROVIDED':
      return {
        label: 'Intake / User',
        bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 dark:border-blue-500/35',
        icon: 'User',
      };
    case 'DOCUMENT_EXTRACTED':
      return {
        label: 'Extracted Doc',
        bg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 dark:border-teal-500/35',
        icon: 'FileText',
      };
    case 'USER_EDITED':
      return {
        label: 'Clinician Edited',
        bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 dark:border-purple-500/35',
        icon: 'Edit3',
      };
    case 'AI_GENERATED':
    default:
      return {
        label: 'AI Synthesized',
        bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 dark:border-indigo-500/35',
        icon: 'Sparkles',
      };
  }
}

export function getVerificationBadgeProps(status: VerificationStatus | string) {
  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Verified',
        symbol: '✓',
        bg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40',
      };
    case 'EDITED':
      return {
        label: 'Edited & Verified',
        symbol: '✎',
        bg: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 dark:border-purple-500/40',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        symbol: '✗',
        bg: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30 dark:border-rose-500/40',
      };
    case 'PENDING_REVIEW':
      return {
        label: 'Pending Review',
        symbol: '⏳',
        bg: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/40',
      };
    case 'UNVERIFIED':
    default:
      return {
        label: 'Needs Verification',
        symbol: '!',
        bg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40',
      };
  }
}
