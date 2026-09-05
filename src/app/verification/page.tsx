'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import {
  CheckCircle2,
  Check,
  Edit3,
  X,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Filter,
  Eye,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  RefreshCw,
  Clock,
  Search
} from 'lucide-react';
import { VerificationTask, VerificationTaskStatus, VerificationRequirementReason } from '@/types/clinical';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import VerificationReviewModal from '@/components/verification/VerificationReviewModal';
import { formatDate } from '@/lib/utils/formatters';

export default function VerificationQueuePage() {
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<VerificationTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQueue = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/verification');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleQuickAccept = async (task: VerificationTask, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/verification/${task.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: 'Dr. Sarah Jenkins, MD',
          notes: 'Clinician quick-accepted via Human Verification Queue',
        }),
      });
      await fetchQueue();
    } catch (err) {
      console.error('Quick accept failed:', err);
    }
  };

  const formatReasonLabel = (reason: string) => {
    switch (reason) {
      case 'LOW_EXTRACTION_CONFIDENCE':
        return 'Low Confidence (<90%)';
      case 'REFERENCE_RANGE_UNDETERMINED':
        return 'Range Undetermined';
      case 'CONFLICT_DETECTED':
        return 'Conflict Detected';
      case 'MISSING_SOURCE_EVIDENCE':
        return 'Missing Evidence';
      case 'OCR_QUALITY_ISSUE':
        return 'OCR Distortion';
      case 'AI_VALIDATION_RETRY':
        return 'AI Retry';
      case 'MULTIPLE_REFERENCE_RANGES':
        return 'Multi Ranges';
      case 'USER_REQUESTED_REVIEW':
        return 'User Requested';
      case 'STANDARD_CLINICAL_INTAKE':
        return 'Clinical Intake';
      default:
        return reason.replace(/_/g, ' ');
    }
  };

  const counts = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'PENDING_REVIEW').length;
    const inReview = tasks.filter((t) => t.status === 'IN_REVIEW').length;
    const verified = tasks.filter((t) => t.status === 'VERIFIED').length;
    const edited = tasks.filter((t) => t.status === 'EDITED').length;
    const rejected = tasks.filter((t) => t.status === 'REJECTED').length;
    const conflicts = tasks.filter((t) => t.reason === 'CONFLICT_DETECTED' || Boolean(t.conflict)).length;

    return { pending, inReview, verified, edited, rejected, conflicts, total: tasks.length };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (reasonFilter !== 'ALL' && t.reason !== reasonFilter) return false;
      if (typeFilter !== 'ALL' && t.recordType !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const entity =
          t.record?.testName ||
          t.record?.drugName ||
          t.record?.allergen ||
          t.record?.conditionName ||
          t.recordType ||
          '';
        const patientName = t.patient?.fullName || '';
        const docName = t.document?.originalFileName || '';
        const val = t.record?.measuredValue || t.record?.dosage || '';
        if (
          !entity.toLowerCase().includes(q) &&
          !patientName.toLowerCase().includes(q) &&
          !docName.toLowerCase().includes(q) &&
          !val.toLowerCase().includes(q) &&
          !t.id.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, reasonFilter, typeFilter, searchQuery]);

  return (
    <AppShell>
      <Breadcrumbs items={[{ label: 'Human Verification', active: true }]} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Human Verification & Review Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Side-by-side clinician review queue for unconfirmed extractions, reference range evaluations, and detected clinical conflicts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {counts.pending > 0 && (
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  const patientIds = Array.from(new Set(tasks.map(t => t.patientId)));
                  for (const pId of patientIds) {
                    await fetch('/api/verification/bulk-accept', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ patientId: pId, minConfidence: 0.90 }),
                    });
                  }
                  await fetchQueue();
                } catch (err) {
                  console.error('Bulk verification failed:', err);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bulk Verify High-Confidence (90%+)</span>
            </button>
          )}

          <button
            onClick={fetchQueue}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          onClick={() => setStatusFilter('PENDING_REVIEW')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PENDING_REVIEW'
              ? 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Review
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {counts.pending}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Requires clinician decision</span>
        </div>

        <div
          onClick={() => setReasonFilter('CONFLICT_DETECTED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            reasonFilter === 'CONFLICT_DETECTED'
              ? 'bg-rose-500/10 border-rose-500 text-rose-950 dark:text-rose-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Potential Conflicts
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {counts.conflicts}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Multi-source discrepancies</span>
        </div>

        <div
          onClick={() => setStatusFilter('VERIFIED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'VERIFIED'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Verified Records
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {counts.verified}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">HUMAN_VERIFIED provenance</span>
        </div>

        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'ALL' && reasonFilter === 'ALL'
              ? 'bg-teal-500/10 border-teal-500 text-teal-950 dark:text-teal-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Queue Items
            </span>
            <Layers className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {counts.total}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Across all patient charts</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Tasks', count: counts.total },
            { id: 'PENDING_REVIEW', label: 'Pending Review', count: counts.pending },
            { id: 'IN_REVIEW', label: 'In Review', count: counts.inReview },
            { id: 'VERIFIED', label: 'Verified', count: counts.verified },
            { id: 'EDITED', label: 'User Edited', count: counts.edited },
            { id: 'REJECTED', label: 'Rejected', count: counts.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dropdown Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by test, medication, patient, doc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Review Reasons</option>
            <option value="LOW_EXTRACTION_CONFIDENCE">Low Extraction Confidence</option>
            <option value="REFERENCE_RANGE_UNDETERMINED">Reference Range Undetermined</option>
            <option value="CONFLICT_DETECTED">Conflict Detected</option>
            <option value="MISSING_SOURCE_EVIDENCE">Missing Source Evidence</option>
            <option value="OCR_QUALITY_ISSUE">OCR Quality Issue</option>
            <option value="AI_VALIDATION_RETRY">AI Validation Retry</option>
            <option value="MULTIPLE_REFERENCE_RANGES">Multiple Reference Ranges</option>
            <option value="USER_REQUESTED_REVIEW">User Requested Review</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Entity Types</option>
            <option value="LAB_RESULT">Laboratory Tests</option>
            <option value="MEDICATION">Medications</option>
            <option value="ALLERGY">Allergies</option>
            <option value="CONDITION">Conditions / Diagnoses</option>
            <option value="CONFLICT">Clinical Conflicts</option>
          </select>
        </div>
      </div>

      {/* Main Task Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
          Loading verification queue from database...
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No verification tasks"
          description="All processed records are currently up to date. Upload a medical report to begin processing."
          actionLabel="Upload Medical Report"
          onAction={() => window.location.assign('/documents')}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs space-y-3">
          <Filter className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            No verification tasks match the selected filters
          </h3>
          <p className="text-slate-500">
            Try adjusting your status, reason, or entity type filters above.
          </p>
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setReasonFilter('ALL');
              setTypeFilter('ALL');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold border border-teal-300 dark:border-teal-800"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Status & Reason</th>
                  <th className="py-3 px-4">Entity / Field</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Extracted Value</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Source Provenance</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((task) => {
                  const record = task.record;
                  const entityName =
                    record?.testName ||
                    record?.drugName ||
                    record?.allergen ||
                    record?.conditionName ||
                    record?.category ||
                    task.conflict?.description ||
                    task.recordType;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      {/* Status & Review Reason */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              task.status === 'VERIFIED'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : task.status === 'PENDING_REVIEW'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : task.status === 'IN_REVIEW'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                : task.status === 'EDITED'
                                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {task.status.replace(/_/g, ' ')}
                          </span>

                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {formatReasonLabel(task.reason)}
                          </span>
                        </div>
                      </td>

                      {/* Entity / Field */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div>
                          <span className="font-bold">{entityName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {task.recordType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/patients/${task.patientId}`}
                          className="font-medium text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          {task.patient?.fullName || task.patientId}
                        </Link>
                        {task.patient?.identifier && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            MRN: {task.patient.identifier}
                          </span>
                        )}
                      </td>

                      {/* Extracted Value & Reference Range */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {record?.measuredValue
                            ? `${record.measuredValue} ${record.unit || ''}`
                            : record?.dosage || record?.clinicalStatus || 'Recorded'}
                        </span>
                        {record?.interpretation && record.interpretation !== 'NORMAL' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {record.interpretation}
                          </span>
                        )}
                        {record?.referenceRangeText && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Ref: {record.referenceRangeText}
                          </span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {record?.confidenceScore
                          ? `${Math.round(record.confidenceScore * 100)}%`
                          : task.confidenceScore
                          ? `${Math.round(task.confidenceScore * 100)}%`
                          : '95%'}
                      </td>

                      {/* Provenance Badge */}
                      <td className="py-3.5 px-4">
                        <ProvenanceBadge
                          provenanceType={record?.provenanceSource || 'DOCUMENT_EXTRACTED'}
                          provenanceId={record?.provenanceId}
                          sourceDocumentName={task.document?.originalFileName || 'Source Report'}
                          pageNumber={record?.sourcePageNumber || 1}
                          confidence={record?.confidenceScore}
                          compact
                        />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>

                          {task.status === 'PENDING_REVIEW' && (
                            <button
                              onClick={(e) => handleQuickAccept(task, e)}
                              title="Quick Accept Record"
                              className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40 transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Review Modal */}
      {selectedTask && (
        <VerificationReviewModal
          task={selectedTask}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          onActionComplete={async () => {
            await fetchQueue();
          }}
        />
      )}
    </AppShell>
  );
}
