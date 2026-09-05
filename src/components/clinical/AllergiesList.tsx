'use client';

import React from 'react';
import { AlertOctagon, Check, X, ShieldAlert } from 'lucide-react';
import { AllergyRecord } from '@/types/clinical';
import { getVerificationBadgeProps } from '@/lib/utils/formatters';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';

interface AllergiesListProps {
  allergies: AllergyRecord[];
  onVerify: (allergyId: string, action: 'ACCEPT' | 'EDIT' | 'REJECT', editedValues?: any, reason?: string) => Promise<void>;
  onSelectSnippet: (allergy: AllergyRecord) => void;
}

export default function AllergiesList({
  allergies,
  onVerify,
  onSelectSnippet,
}: AllergiesListProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertOctagon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Documented Allergies & Adverse Reactions
          </h3>
          <span className="text-[11px] text-slate-500">
            {allergies.length} recorded allergen(s)
          </span>
        </div>
      </div>

      <div className="space-y-2.5 mt-4">
        {allergies.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No known drug allergies or adverse reactions documented.
          </div>
        ) : (
          allergies.map((all) => {
            const verif = getVerificationBadgeProps(all.verificationStatus);
            const isSevere = all.severity === 'SEVERE' || all.severity === 'LIFE_THREATENING';

            return (
              <div
                key={all.id}
                onClick={() => onSelectSnippet(all)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isSevere
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                    : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {all.allergen}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        isSevere
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {all.severity}
                    </span>
                  </div>
                  {all.reaction && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 block">
                      Reaction: {all.reaction}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <ProvenanceBadge
                    provenanceType={all.provenanceSource}
                    provenanceId={all.provenanceId}
                    sourceDocumentName="LabCorp_CBC_2026.pdf"
                    pageNumber={all.sourcePageNumber || 1}
                    confidence={all.confidenceScore || 0.99}
                    sourceText={all.sourceOriginalSnippet || `Allergy: ${all.allergen} (${all.severity || 'Moderate'})`}
                    entityName={`Allergy: ${all.allergen}`}
                    entityValue={all.reaction || all.severity}
                    documentId={all.documentId}
                    history={all.provenanceHistory}
                    compact
                  />

                  {all.verificationStatus !== 'VERIFIED' && (
                    <button
                      title="Verify allergy"
                      onClick={() => onVerify(all.id, 'ACCEPT')}
                      className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40 transition cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                  {all.verificationStatus !== 'REJECTED' && (
                    <button
                      title="Reject allergy"
                      onClick={() => onVerify(all.id, 'REJECT', undefined, 'Marked invalid')}
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
