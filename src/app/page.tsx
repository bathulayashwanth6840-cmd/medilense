'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import DocumentUploader from '@/components/documents/DocumentUploader';
import {
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  UploadCloud,
  ArrowRight,
  Activity,
  ShieldCheck,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  Lock,
  Layers
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDocuments: 0,
    pendingVerification: 0,
    activeConflicts: 0,
  });

  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [activeConflicts, setActiveConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // 1. Stats
      const statsRes = await fetch('/api/stats');
      const statsJson = await statsRes.json();
      if (statsJson.success && statsJson.data) {
        setStats(statsJson.data);
      }

      // 2. Recent Patients
      const patientsRes = await fetch('/api/patients');
      const patientsJson = await patientsRes.json();
      if (patientsJson.success && Array.isArray(patientsJson.data)) {
        setRecentPatients(patientsJson.data.slice(0, 5));
      }

      // 3. Recent Documents
      const docsRes = await fetch('/api/documents');
      const docsJson = await docsRes.json();
      if (docsJson.success && Array.isArray(docsJson.data)) {
        setRecentDocuments(docsJson.data.slice(0, 5));
      }

      // 4. Active Conflicts
      const confRes = await fetch('/api/conflicts?status=UNREVIEWED');
      const confJson = await confRes.json();
      if (confJson.success && Array.isArray(confJson.data)) {
        setActiveConflicts(confJson.data.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AppShell>
      {/* Dynamic Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Dashboard Overview', active: true }]} />

      {/* Dashboard Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>MedLens Clinical Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Good morning
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review, verify, and understand clinical information from medical documents with zero invented data.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Patient Intake</span>
          </Link>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-indigo-500" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards (Using Real Application Counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Patients Card */}
        <Link
          href="/patients"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/40 shadow-xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Patients</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {loading ? '—' : stats.totalPatients}
            </span>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
              <span>View Roster</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </Link>

        {/* Documents Card */}
        <Link
          href="/documents"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/40 shadow-xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Medical Documents</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {loading ? '—' : stats.totalDocuments}
            </span>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              <span>Inspect Files</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </Link>

        {/* Pending Verification Card */}
        <Link
          href="/verification"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 shadow-xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Verification</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {loading ? '—' : stats.pendingVerification}
            </span>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </Link>

        {/* Active Conflicts Card */}
        <Link
          href="/conflicts"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 shadow-xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Conflicts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {loading ? '—' : stats.activeConflicts}
            </span>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              <span>Resolve Conflicts</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </Link>
      </div>

      {/* Main Grid: Recent Patients & Conflicts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* Left 2 Cols: Recent Patients Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Recent Patients */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent Patients
                </h2>
              </div>
              <Link
                href="/patients"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>View All ({stats.totalPatients})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading patient records...
              </div>
            ) : recentPatients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No patients yet"
                description="Upload a medical document or create a new patient to begin."
                actionLabel="New Patient Intake"
                actionHref="/patients/new"
                secondaryActionLabel="Upload Document"
                onSecondaryAction={() => setShowUploadModal(true)}
                compact
              />
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">MRN</th>
                      <th className="py-2.5 px-3">Reports</th>
                      <th className="py-2.5 px-3">Conflicts</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {recentPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          <Link href={`/patients/${p.id}`} className="hover:text-teal-600 dark:hover:text-teal-400">
                            {p.fullName}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {p.identifier}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {p.documentsCount || 0} docs
                        </td>
                        <td className="py-3 px-3">
                          {p.conflictsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" /> {p.conflictsCount}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/patients/${p.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200/50 dark:border-teal-800/50 transition cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Recent Uploaded Documents */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent Medical Documents
                </h2>
              </div>
              <Link
                href="/documents"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All ({stats.totalDocuments})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading documents...
              </div>
            ) : recentDocuments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No source documents available"
                description="Upload a medical document or pathology report to begin extraction."
                actionLabel="Upload Document"
                onAction={() => setShowUploadModal(true)}
                compact
              />
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <th className="py-2.5 px-3">Document</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {recentDocuments.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[160px]">
                            {d.originalFileName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(d.uploadedAt)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {d.patientName}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {d.documentType || 'LAB_REPORT'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {d.processingStatus || 'COMPLETED'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/patients/${d.patientId}?tab=documents`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <span>Inspect</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Conflicts Requiring Attention */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Conflicts Requiring Attention
                </h2>
              </div>
              <Link
                href="/conflicts"
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                All ({stats.activeConflicts})
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Checking conflict registry...
              </div>
            ) : activeConflicts.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No conflicts detected"
                description="Cross-document reconciliation has detected zero contradictions across active clinical records."
                compact
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-2 space-y-3">
                {activeConflicts.map((c) => (
                  <div key={c.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {c.type || c.conflictType}
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {c.severity} SEVERITY
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        Requires human verification
                      </span>
                      <Link
                        href={`/conflicts?id=${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeConflicts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link
                href="/conflicts"
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
              >
                <span>Open Conflict Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <DocumentUploader
          onUploadSuccess={() => {
            setShowUploadModal(false);
            fetchDashboardData();
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </AppShell>
  );
}
