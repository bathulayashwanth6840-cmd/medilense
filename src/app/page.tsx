'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { 
  ShieldCheck, 
  Activity, 
  FileText, 
  Users, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Lock,
  Search,
  BookOpen
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Regulatory Pillar Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-xs font-semibold mb-6">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Strict Non-Diagnostic Clinical Intelligence Standard</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 max-w-4xl mx-auto leading-tight">
              Transform Fragmented Medical Records into{' '}
              <span className="bg-gradient-to-r from-teal-600 via-indigo-600 to-teal-700 bg-clip-text text-transparent">
                Traceable Clinical Intelligence
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              MedLens aggregates disparate medical PDFs, lab reports, and intake narratives into structured, reviewable health records with <strong>zero invented reference ranges</strong> and complete provenance traceability.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/patients/p-demo-eleanor"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/25 transition cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                Launch Demo Patient Dashboard (Eleanor Vance)
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/patients/new"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-sm shadow-xs transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-teal-600" />
                New Patient Intake
              </Link>
            </div>
          </div>
        </section>

        {/* Core Architectural Pillars */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Built on 5 Responsible-AI Clinical Tenets
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Engineered with deterministic guardrails to prevent AI hallucinations and clinical drift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Reference Range Awareness
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Uses reference ranges provided strictly by the source medical report. If missing, status is explicitly marked as <code>Reference range unavailable</code>. Never guesses population norms.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Field-Level Provenance
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every lab result, dosage, and allergy is tagged with origin metadata: <code>USER_PROVIDED</code>, <code>DOCUMENT_EXTRACTED</code>, or <code>USER_EDITED</code>, with source page numbers and text snippets.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Clinical Conflict Detection
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatically identifies conflicting medication dosages, contradictory allergy entries, and duplicate test discrepancies without silently overwriting data.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Human-in-the-Loop Verification
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Provides one-click Accept, Edit with clinical change notes, and Reject workflows with complete audit trail changelog tracking.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                5
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Non-Diagnostic AI Summarizer
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Generates purely factual clinical digests summarizing documented tests and report dates with active guardrails against diagnostic assertions.
              </p>
            </div>

            {/* Security & Integrity */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Cryptographic Integrity
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Computes cryptographic SHA-256 hash checksums on every uploaded document, ensuring tamper-resistant audit logs and verifiable document provenance.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">MedLens</span>
            <span>• Clinical Information Intelligence Platform</span>
          </div>
          <p className="text-[11px] text-slate-400">
            For clinical information organization and workflow aid only. Not a medical diagnostic system.
          </p>
        </div>
      </footer>
    </div>
  );
}
