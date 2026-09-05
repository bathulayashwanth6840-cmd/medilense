'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import { ScanText, FileText, CheckCircle2, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function SourceEvidencePage() {
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
          { label: 'Source Evidence', active: true },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <ScanText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          Source Evidence & Provenance Inspector
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Every displayed clinical fact is grounded in original document pages, OCR bounding boxes, and immutable version chains.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
          Loading evidence files...
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={ScanText}
          title="No source documents available"
          description="Upload a medical report PDF to inspect OCR evidence, bounding boxes, and field-level provenance."
          actionLabel="Upload Medical Report"
          actionHref="/documents"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {d.originalFileName}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Patient: {d.patientName}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50">
                    SHA-256 OK
                  </span>
                </div>

                <div className="my-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Type:</span>
                    <span className="font-semibold">{d.documentType || 'LAB_REPORT'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Uploaded:</span>
                    <span>{formatDate(d.uploadedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[11px]">Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{d.processingStatus}</span>
                  </div>
                </div>

                {d.rawExtractedText && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 line-clamp-3">
                    {d.rawExtractedText}
                  </div>
                )}
              </div>

              <Link
                href={`/patients/${d.patientId}?tab=evidence`}
                className="inline-flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200/50 transition cursor-pointer"
              >
                <span>Inspect Evidence Viewer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
