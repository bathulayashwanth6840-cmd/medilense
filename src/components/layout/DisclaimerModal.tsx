'use client';

import React from 'react';
import { ShieldCheck, AlertCircle, FileCheck, Ban, CheckCircle2, X } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisclaimerModal({ isOpen, onClose }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              MedLens Clinical Safety & Guardrails
            </h2>
            <p className="text-xs text-slate-500">
              Responsible AI Mandate & Non-Diagnostic Architecture Standards
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
                Important Regulatory Notice
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-1 leading-relaxed">
                MedLens is an information organization and clinical synthesis aid. It is strictly <strong>NOT</strong> a medical diagnostic device, does not formulate differential diagnoses, and does not prescribe therapies or medication dosage alterations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4" /> What MedLens Does
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li>• Ingests and standardizes multi-source clinical PDFs and lab documents.</li>
                <li>• Preserves explicit source report reference ranges verbatim.</li>
                <li>• Flags Low/Normal/High based exclusively on report-supplied boundaries.</li>
                <li>• Detects conflicting records for human clinician review.</li>
                <li>• Maintains cryptographic SHA-256 and immutable audit trails.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold mb-2">
                <Ban className="w-4 h-4" /> Strict Prohibitions
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li>• Never invents or assumes missing laboratory reference ranges.</li>
                <li>• Never generates speculative diagnoses or prognoses.</li>
                <li>• Never recommends starting, stopping, or modifying medications.</li>
                <li>• Never overwrites conflicting clinical records automatically.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition shadow-sm"
          >
            I Acknowledge & Understand
          </button>
        </div>
      </div>
    </div>
  );
}
