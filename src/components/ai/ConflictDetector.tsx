'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  Columns3, 
  X,
  FileSearch,
  Sparkles
} from 'lucide-react';
import { ConflictRecord } from '@/types/clinical';
import { formatDate } from '@/lib/utils/formatters';

interface ConflictDetectorProps {
  conflicts: ConflictRecord[];
  onResolveConflict: (conflictId: string, notes: string) => Promise<void>;
}

export default function ConflictDetector({
  conflicts,
  onResolveConflict,
}: ConflictDetectorProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comparingConflict, setComparingConflict] = useState<ConflictRecord | null>(null);

  const pending = conflicts.filter(c => c.resolutionStatus === 'DETECTED');
  const resolved = conflicts.filter(c => c.resolutionStatus === 'RESOLVED');

  const handleOpenResolve = (conflict: ConflictRecord) => {
    setResolvingId(conflict.id);
    setResolutionNote('');
  };

  const handleConfirmResolve = async (customNote?: string) => {
    const note = customNote || resolutionNote;
    const targetId = resolvingId || comparingConflict?.id;
    if (!targetId || !note) return;
    
    setIsSubmitting(true);
    try {
      await onResolveConflict(targetId, note);
      setResolvingId(null);
      setComparingConflict(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 5. Potential Conflict Attention Card */}
      {pending.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-500/40 dark:border-amber-500/30 rounded-2xl shadow-xs p-5 transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  ⚠ Potential Conflict Detected
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Human Review Required
                  </span>
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Contradictory values found across documents. MedLens never guesses clinical truth.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            {pending.map((conf) => (
              <div
                key={conf.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/70 dark:border-amber-800/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Metformin
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Dosage Inconsistency
                    </span>
                  </div>

                  <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside">
                    <li>
                      Patient Intake: <strong className="text-slate-900 dark:text-white font-mono">500 mg</strong> (Sep 2, 2026)
                    </li>
                    <li>
                      Medical Report: <strong className="text-slate-900 dark:text-white font-mono">1000 mg</strong> (Sep 5, 2026, 96% confidence)
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setComparingConflict(conf)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
                  >
                    <Columns3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Compare Sources
                  </button>

                  <button
                    onClick={() => handleOpenResolve(conf)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Resolve Conflict
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Conflicts History */}
      {resolved.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Resolved Conflicts Audit Changelog ({resolved.length})
          </h4>
          <div className="space-y-2 text-xs">
            {resolved.map((res) => (
              <div
                key={res.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    {res.description}
                  </span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    <strong>Resolution Rationale:</strong> {res.resolutionNotes}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Resolved by {res.resolvedBy || 'Clinical Reviewer'} on {formatDate(res.resolvedAt)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  Resolved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Comparison Modal ("Compare Sources") */}
      {comparingConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Compare Sources — Metformin Dosage
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Side-by-side reconciliation of contradicting source evidence
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComparingConflict(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Dose</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      Patient Intake
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                      500 mg
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Sep 2, 2026
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      —
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      Medical Report (LabCorp_CBC_2026.pdf)
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      1000 mg
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Sep 5, 2026
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      96%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold block mb-0.5">Clinical Decision Policy:</span>
              MedLens does not automatically choose the correct value. Select an action below based on your clinical assessment:
            </div>

            {/* Action Buttons: [ Keep 500 mg ] [ Keep 1000 mg ] [ Mark for Review ] */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmResolve('Clinician verified: Kept 500 mg dosage based on patient intake and ongoing regimen.')}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                Keep 500 mg
              </button>

              <button
                type="button"
                onClick={() => handleConfirmResolve('Clinician verified: Kept 1000 mg dosage based on recent laboratory prescription extract.')}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                Keep 1000 mg
              </button>

              <button
                type="button"
                onClick={() => handleConfirmResolve('Marked for pharmacist/provider review at next clinical encounter.')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition cursor-pointer"
              >
                Mark for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Resolution Rationale Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Confirm Conflict Resolution
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your clinical rationale. This entry will be permanently written to the immutable audit changelog.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Resolution Decision & Clinical Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Verified with patient that Metformin was titrated to 500mg twice daily."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmResolve()}
                disabled={!resolutionNote || isSubmitting}
                className="px-4 py-2 rounded-xl font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Recording...' : 'Record in Audit Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
