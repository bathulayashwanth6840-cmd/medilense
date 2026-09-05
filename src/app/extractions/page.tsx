'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight, FileText, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function AIExtractionPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await fetch('/api/documents');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDocuments(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'AI Extraction', active: true },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          AI Extraction & OCR Pipeline
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Multimodal clinical extraction engine enforcing zero-guess reference range evaluation and strict Zod schema validation.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
          Loading pipeline status...
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No documents processed yet"
          description="Upload a medical PDF report to trigger the multimodal AI extraction and reference range engine."
          actionLabel="Upload Medical PDF"
          actionHref="/documents"
        />
      ) : (
        <div className="space-y-4">
          {documents.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {d.originalFileName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                    {d.processingStatus || 'COMPLETED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Patient: {d.patientName} ({d.patientIdentifier}) • Uploaded: {formatDate(d.uploadedAt)}
                </p>
              </div>

              <Link
                href={`/patients/${d.patientId}?tab=labs`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer self-start md:self-auto"
              >
                <span>View Extracted Labs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
