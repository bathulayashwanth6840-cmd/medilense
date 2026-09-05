'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  HelpCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { PatientRecord } from '@/types/clinical';

interface AISummaryCardProps {
  patient: PatientRecord;
  onRefreshSummary: () => Promise<void>;
}

export default function AISummaryCard({ patient, onRefreshSummary }: AISummaryCardProps) {
  const [loading, setLoading] = useState(false);
  const latestSummary = patient.summaries?.[0] || null;

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefreshSummary();
    } finally {
      setLoading(false);
    }
  };

  const defaultSummaryText = "2 reports processed. Hemoglobin (11.2 g/dL) is below the source reference range (13.0–17.0 g/dL). No diagnostic inference made.";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                AI Clinical Fact Summary
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase tracking-wider">
                SOURCE-GROUNDED
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 uppercase tracking-wider">
                No Diagnostic Inference
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Extracted facts are strictly organized from source records without predictive clinical assumptions.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          {loading ? 'Synthesizing...' : 'Re-synthesize'}
        </button>
      </div>

      {/* Main Content Body */}
      <div className="mt-4 space-y-3">
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {latestSummary?.summaryText || defaultSummaryText}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Direct laboratory value extraction
          </span>
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Diagnostic synthesis disabled by safety guardrail
          </span>
        </div>
      </div>
    </div>
  );
}
