'use client';

import React from 'react';
import { BookmarkCheck, FileText, Check, X } from 'lucide-react';
import { ConditionRecord } from '@/types/clinical';
import { getVerificationBadgeProps, formatDate } from '@/lib/utils/formatters';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';

interface ConditionsListProps {
  conditions: ConditionRecord[];
  onVerify: (conditionId: string, action: 'ACCEPT' | 'EDIT' | 'REJECT', editedValues?: any, reason?: string) => Promise<void>;
  onSelectSnippet: (condition: ConditionRecord) => void;
}

export default function ConditionsList({
  conditions,
  onVerify,
  onSelectSnippet,
}: ConditionsListProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <BookmarkCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Documented Clinical Conditions
          </h3>
          <span className="text-[11px] text-slate-500">
            Extracted from past clinic notes & discharge records
          </span>
        </div>
      </div>

      <div className="space-y-2.5 mt-4">
        {conditions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No past medical conditions documented.
          </div>
        ) : (
          conditions.map((cond) => {
            const verif = getVerificationBadgeProps(cond.verificationStatus);

            return (
              <div
                key={cond.id}
                onClick={() => onSelectSnippet(cond)}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {cond.conditionName}
                    </span>
                    {cond.icd10Code && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono">
                        {cond.icd10Code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="uppercase font-medium text-teal-600 dark:text-teal-400">
                      Status: {cond.clinicalStatus}
                    </span>
                    {cond.diagnosedDate && (
                      <span>• Diagnosed: {formatDate(cond.diagnosedDate)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <ProvenanceBadge
                    provenanceType={cond.provenanceSource}
                    provenanceId={cond.provenanceId}
                    sourceDocumentName="LabCorp_CBC_2026.pdf"
                    pageNumber={cond.sourcePageNumber || 1}
                    confidence={cond.confidenceScore || 0.98}
                    sourceText={cond.sourceOriginalSnippet || `Condition: ${cond.conditionName} (${cond.clinicalStatus})`}
                    entityName={`Condition: ${cond.conditionName}`}
                    entityValue={cond.clinicalStatus}
                    documentId={cond.documentId}
                    history={cond.provenanceHistory}
                    compact
                  />

                  {cond.verificationStatus !== 'VERIFIED' && (
                    <button
                      title="Verify condition"
                      onClick={() => onVerify(cond.id, 'ACCEPT')}
                      className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40 transition cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                  {cond.verificationStatus !== 'REJECTED' && (
                    <button
                      title="Reject condition"
                      onClick={() => onVerify(cond.id, 'REJECT', undefined, 'Marked inaccurate')}
                      className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300/40 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
