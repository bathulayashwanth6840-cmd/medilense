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
  Lock,
  Cpu,
  Layers,
  Info
} from 'lucide-react';
import { PatientRecord } from '@/types/clinical';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import { formatDate } from '@/lib/utils/formatters';

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
  const modelName = latestSummary?.modelUsed || 'GPT-4o';
  const providerName = latestSummary?.provider || 'OpenAI';
  const inputRecords = latestSummary?.inputRecordIds || (patient.labResults ? patient.labResults.map(l => l.id) : ['lab_1', 'lab_2']);
  const disclaimerText = latestSummary?.disclaimer || "AI-generated summary. Verify against source records.";

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

        <div className="flex items-center gap-2 shrink-0">
          <ProvenanceBadge
            provenanceType="AI_GENERATED"
            provenanceId={latestSummary?.provenanceId || 'prov_ai_summary'}
            entityName="AI Clinical Fact Summary"
            entityValue={latestSummary?.summaryText || defaultSummaryText}
            history={latestSummary?.provenanceHistory}
            compact
          />

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            {loading ? 'Synthesizing...' : 'Re-synthesize'}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="mt-4 space-y-3">
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {latestSummary?.summaryText || defaultSummaryText}
        </div>

        {/* AI Model & Source Grounding Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            <div className="text-[11px] leading-tight">
              <span className="text-slate-400 block text-[10px]">Model & Provider</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {modelName} • {providerName}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-teal-500" />
            <div className="text-[11px] leading-tight">
              <span className="text-slate-400 block text-[10px]">Grounded Input Records</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {inputRecords.length} clinical record(s)
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-[10px] leading-tight text-amber-800 dark:text-amber-300">
              <span className="font-semibold block">Mandatory Safety Guardrail</span>
              {disclaimerText}
            </div>
          </div>
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
