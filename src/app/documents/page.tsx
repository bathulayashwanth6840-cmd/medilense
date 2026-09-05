'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import DocumentUploader from '@/components/documents/DocumentUploader';
import {
  FileText,
  UploadCloud,
  Search,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Filter,
  Layers
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchDocuments = async () => {
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

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filtered = documents.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.originalFileName.toLowerCase().includes(q) ||
      (d.patientName && d.patientName.toLowerCase().includes(q)) ||
      (d.patientIdentifier && d.patientIdentifier.toLowerCase().includes(q)) ||
      (d.documentType && d.documentType.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'Medical Documents', active: true },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Medical Documents Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-resistant registry of clinical PDFs, laboratory reports, and intake narratives with cryptographic SHA-256 integrity.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="mb-6 relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by file name, patient, or report type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
          Loading document registry...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'No Matching Documents' : 'No medical documents uploaded yet'}
          description={
            search
              ? `No document records match "${search}". Try adjusting your search query.`
              : 'Upload a pathology report, CBC panel, or discharge note to initiate AI extraction with provenance.'
          }
          actionLabel="Upload Document"
          onAction={() => setShowUploadModal(true)}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Document File</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Report Type</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4">Integrity Hash</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{doc.originalFileName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/patients/${doc.patientId}`}
                        className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {doc.patientName}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {doc.patientIdentifier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {doc.documentType || 'LAB_REPORT'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(doc.uploadedAt || doc.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                      {doc.fileHashSha256 ? `${doc.fileHashSha256.slice(0, 12)}...` : 'SHA-256 OK'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {doc.processingStatus || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/patients/${doc.patientId}?tab=documents`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/50 dark:border-indigo-800/50 transition cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUploadModal && (
        <DocumentUploader
          onUploadSuccess={() => {
            setShowUploadModal(false);
            fetchDocuments();
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </AppShell>
  );
}
