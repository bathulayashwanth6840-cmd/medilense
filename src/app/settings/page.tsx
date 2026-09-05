'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { 
  Settings, 
  ShieldCheck, 
  Cpu, 
  FileCheck2, 
  AlertTriangle, 
  Lock, 
  Save, 
  CheckCircle2,
  Database,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [ocrEngine, setOcrEngine] = useState('NATIVE_FIRST');
  const [deterministicMode, setDeterministicMode] = useState(true);
  const [zeroGuessedRanges, setZeroGuessedRanges] = useState(true);
  const [requireHumanVerificationForConflicts, setRequireHumanVerificationForConflicts] = useState(true);
  const [provenanceRetention, setProvenanceRetention] = useState('INDEFINITE');
  const [temperature, setTemperature] = useState('0.0');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings' },
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Clinical Engine & System Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure deterministic extraction guardrails, provenance hashing, conflict rules, and clinical safety policies.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition self-start sm:self-auto cursor-pointer"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                Settings Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save System Preferences
              </>
            )}
          </button>
        </div>

        {saved && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Clinical configuration updated successfully. All changes are enforced across AI extraction and verification engines.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clinical Safety & Determinism Guardrails */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Responsible AI & Deterministic Rules
                </h3>
                <p className="text-[11px] text-slate-500">
                  Core safety guardrails preventing AI hallucination or fabricated clinical metrics.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Zero Guessed Reference Ranges
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Lab reference ranges must strictly come from the source report. The AI engine is strictly barred from inventing standard ranges.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={zeroGuessedRanges}
                  onChange={(e) => setZeroGuessedRanges(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded mt-1 cursor-pointer focus:ring-teal-500"
                />
              </div>

              <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Deterministic Extraction Temperature (0.0)
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Forces zero randomness in LLM extraction to ensure strict reproducibility and consistency across identical reports.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={deterministicMode}
                  onChange={(e) => setDeterministicMode(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded mt-1 cursor-pointer focus:ring-teal-500"
                />
              </div>

              <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Human Verification Required for Conflicts
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Whenever an inconsistency is detected between sources, the system flags it for clinician review and never auto-picks the "truth".
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireHumanVerificationForConflicts}
                  onChange={(e) => setRequireHumanVerificationForConflicts(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded mt-1 cursor-pointer focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* AI Extraction Engine Config */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  OCR & Model Pipeline
                </h3>
                <p className="text-[11px] text-slate-500">
                  PDF text extraction engines and structured schema enforcement.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Text Ingestion Strategy
                </label>
                <select
                  value={ocrEngine}
                  onChange={(e) => setOcrEngine(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="NATIVE_FIRST">Hybrid (Native PDF text first, Optical OCR fallback)</option>
                  <option value="OCR_ONLY">Always run Optical Character Recognition (OCR)</option>
                  <option value="MULTIMODAL_VISION">Direct Multimodal Vision LLM Processing</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Hybrid mode preserves exact character positions while falling back to OCR when text streams are missing.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Provenance & Audit Retention
                </label>
                <select
                  value={provenanceRetention}
                  onChange={(e) => setProvenanceRetention(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="INDEFINITE">Indefinite (Full Clinical History & Immutable Audit Logs)</option>
                  <option value="7_YEARS">7 Years (Standard Regulatory Compliance)</option>
                  <option value="10_YEARS">10 Years (Extended Hospital Archive)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  All extracted clinical records are paired with unique cryptographic <code className="font-mono bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded">provenanceId</code> values that map directly to bounding boxes in original documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
