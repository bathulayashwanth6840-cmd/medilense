'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Edit3, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  History, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  Scale,
  Columns,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { VerificationTask, VerificationAction } from '@/types/clinical';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';
import { formatDate } from '@/lib/utils/formatters';

interface VerificationReviewModalProps {
  task: VerificationTask | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => Promise<void>;
}

export const REJECTION_REASONS = [
  'Incorrect extraction',
  'Unsupported source',
  'Wrong entity',
  'Unreadable source',
  'Duplicate',
  'Other',
];

export default function VerificationReviewModal({
  task,
  isOpen,
  onClose,
  onActionComplete,
}: VerificationReviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editRange, setEditRange] = useState('');
  const [editReason, setEditReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [taskHistory, setTaskHistory] = useState<VerificationAction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeConflictDecision, setActiveConflictDecision] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      // Set start of review in background
      fetch(`/api/verification/${task.id}/start`, { method: 'POST' }).catch(() => {});

      // Fetch task verification history
      fetch(`/api/verification/${task.id}/history`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setTaskHistory(json.data);
          }
        })
        .catch(() => {});

      // Initialize edit fields
      const rec = task.record;
      setEditValue(rec?.measuredValue || rec?.dosage || rec?.clinicalStatus || '');
      setEditUnit(rec?.unit || '');
      setEditRange(rec?.referenceRangeText || '');
      setEditReason('');
      setCurrentPage(rec?.sourcePageNumber || 1);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const record = task.record;
  const patient = task.patient;
  const document = task.document;
  const conflict = task.conflict;

  const entityName =
    record?.testName ||
    record?.drugName ||
    record?.allergen ||
    record?.conditionName ||
    record?.category ||
    conflict?.description ||
    'Clinical Entity';

  const formatReasonLabel = (reason: string) => {
    switch (reason) {
      case 'LOW_EXTRACTION_CONFIDENCE':
        return 'Low Extraction Confidence (<90%)';
      case 'REFERENCE_RANGE_UNDETERMINED':
        return 'Reference Range Undetermined';
      case 'CONFLICT_DETECTED':
        return 'Potential Clinical Conflict Detected';
      case 'MISSING_SOURCE_EVIDENCE':
        return 'Source Text Snippet Missing';
      case 'OCR_QUALITY_ISSUE':
        return 'OCR Quality / Scan Distortion';
      case 'AI_VALIDATION_RETRY':
        return 'AI Validation Retry Required';
      case 'MULTIPLE_REFERENCE_RANGES':
        return 'Multiple Demographic Ranges in Source';
      case 'USER_REQUESTED_REVIEW':
        return 'User Requested Manual Review';
      case 'STANDARD_CLINICAL_INTAKE':
        return 'Clinical Intake Verification';
      default:
        return reason.replace(/_/g, ' ');
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`/api/verification/${task.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: 'Dr. Sarah Jenkins, MD',
          notes: 'Clinician accepted during side-by-side verification review',
        }),
      });
      await onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      const editedValues: any = {};
      if (task.recordType === 'LAB_RESULT') {
        editedValues.measuredValue = editValue;
        if (editUnit) editedValues.unit = editUnit;
        if (editRange) editedValues.referenceRangeText = editRange;
      } else if (task.recordType === 'MEDICATION') {
        editedValues.dosage = editValue;
      } else if (task.recordType === 'CONDITION') {
        editedValues.clinicalStatus = editValue;
      } else {
        editedValues.measuredValue = editValue;
      }

      await fetch(`/api/verification/${task.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedValues,
          editedBy: 'Dr. Sarah Jenkins, MD',
          reason: editReason || 'Clinician modified extracted values during verification review',
        }),
      });
      await onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    const finalReason =
      selectedRejectReason === 'Other' && customRejectReason.trim()
        ? customRejectReason.trim()
        : selectedRejectReason;

    setIsSubmitting(true);
    try {
      await fetch(`/api/verification/${task.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: 'Dr. Sarah Jenkins, MD',
          reason: finalReason,
        }),
      });
      await onActionComplete();
      setShowRejectModal(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveConflict = async (decision: string, selectedRecordId?: string | null) => {
    if (!conflict) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/conflicts/${conflict.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          selectedRecordId,
          reviewerId: 'Dr. Sarah Jenkins, MD',
          reason: `Clinician resolved conflict with decision: ${decision}`,
        }),
      });
      await onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Human Verification & Review Workspace
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  Task #{task.id.slice(-6)}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {formatReasonLabel(task.reason)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{patient?.fullName || 'Patient Record'}</span> (MRN: {patient?.identifier || 'Not available'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Audit History ({taskHistory.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Side-by-Side Review Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* LEFT COLUMN: STRUCTURED RECORD (50%) */}
          <div className="lg:col-span-6 p-5 sm:p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Structured Clinical Record
              </span>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                {task.recordType.replace(/_/g, ' ')}
              </span>
            </div>

            {/* CONFLICT CARD (If task is flagged as a conflict) */}
            {conflict && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-200">
                      ⚠ Potential conflict detected — human verification required
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px]">
                      {conflict.description}
                    </p>
                  </div>
                </div>

                {/* Conflict Side-by-Side Sources */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">SOURCE A</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{conflict.sourceA?.value || 'Recorded Value'}</span>
                    <span className="text-slate-400 text-[10px] block mt-1">{conflict.sourceA?.documentName || 'First Document'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">SOURCE B</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{conflict.sourceB?.value || 'Conflicting Value'}</span>
                    <span className="text-slate-400 text-[10px] block mt-1">{conflict.sourceB?.documentName || 'Second Document'}</span>
                  </div>
                </div>

                {/* Conflict Decision Buttons */}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleResolveConflict('ACCEPT_SOURCE_A', conflict.sourceA?.recordId)}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] cursor-pointer"
                  >
                    Accept Source A
                  </button>
                  <button
                    onClick={() => handleResolveConflict('ACCEPT_SOURCE_B', conflict.sourceB?.recordId)}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] cursor-pointer"
                  >
                    Accept Source B
                  </button>
                  <button
                    onClick={() => handleResolveConflict('KEEP_BOTH')}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Keep Both
                  </button>
                  <button
                    onClick={() => handleResolveConflict('DISMISSED')}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300/40 font-semibold text-[11px] cursor-pointer"
                  >
                    Dismiss Conflict
                  </button>
                </div>
              </div>
            )}

            {/* Extracted Entity Fields Detail */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Clinical Field / Entity
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {entityName}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Confidence
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {record?.confidenceScore ? `${(record.confidenceScore * 100).toFixed(1)}%` : `${Math.round((task.confidenceScore ?? 0.95) * 100)}%`}
                  </span>
                </div>
              </div>

              {/* Measured Value & Reference Range */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Extracted Value
                  </span>
                  <span className="text-lg font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {record?.measuredValue || record?.dosage || record?.clinicalStatus || 'Recorded'} {record?.unit || ''}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Source Reference Range
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 mt-1 block">
                    {record?.referenceRangeText ? (
                      record.referenceRangeText
                    ) : (
                      <span className="text-slate-400 italic">Unavailable in Source</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Status Classification */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Deterministic Status
                  </span>
                  <span className="inline-block mt-1 font-bold">
                    {record?.interpretation === 'LOW' && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        LOW
                      </span>
                    )}
                    {record?.interpretation === 'NORMAL' && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        NORMAL
                      </span>
                    )}
                    {record?.interpretation === 'HIGH' && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                        HIGH
                      </span>
                    )}
                    {(!record?.interpretation || record?.interpretation === 'REFERENCE_UNAVAILABLE' || record?.interpretation === 'UNDETERMINED') && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {record?.interpretation || 'UNDETERMINED'}
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Provenance Linkage
                  </span>
                  <div className="mt-1">
                    <ProvenanceBadge
                      provenanceType={record?.provenanceSource || 'DOCUMENT_EXTRACTED'}
                      provenanceId={record?.provenanceId}
                      sourceDocumentName={document?.originalFileName || 'Source Report'}
                      pageNumber={record?.sourcePageNumber || 1}
                      confidence={record?.confidenceScore}
                      sourceText={record?.sourceOriginalSnippet}
                      entityName={entityName}
                      compact
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* In-Place Edit Mode Form */}
            {isEditing && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200">
                    Modify Extracted Value (USER_EDITED Provenance)
                  </span>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      New Measured Value
                    </label>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                      placeholder="e.g. 11.4"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="e.g. g/dL"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Source Reference Range
                  </label>
                  <input
                    type="text"
                    value={editRange}
                    onChange={(e) => setEditRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    placeholder="e.g. 13.0 - 17.0 g/dL"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Reason for modification (Logged to Audit Changelog)
                  </label>
                  <textarea
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="e.g. Verified with clinical laboratory telephone inquiry"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Save & Record USER_EDITED'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Verification Action
              </span>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Fact</span>
                </button>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-indigo-500" />
                  <span>Edit Value</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300/40 text-rose-700 font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Reject Fact</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ORIGINAL DOCUMENT VIEWER (50%) */}
          <div className="lg:col-span-6 bg-slate-100 dark:bg-slate-950 flex flex-col min-h-[400px]">
            {/* PDF Controls Strip */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {document?.originalFileName || 'Source Report Document'}
                </span>
              </div>

              {document && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] px-1">Page {currentPage}</span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                  <button
                    onClick={() => setZoomLevel(Math.max(75, zoomLevel - 10))}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px]">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Document Content Canvas */}
            <div className="flex-1 p-5 overflow-auto flex items-center justify-center">
              {document ? (
                <div
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-md rounded-xl p-5 w-full max-w-lg font-mono text-xs leading-relaxed transition-transform duration-150 origin-top space-y-3"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">
                      {document.documentType || 'CLINICAL DOCUMENT'}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {document.originalFileName}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block">
                      SHA-256: {document.fileHashSha256 || 'Calculated Checksum'}
                    </span>
                  </div>

                  <div className="font-sans text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300 max-h-[300px] overflow-y-auto space-y-1 pr-1">
                    {document.rawExtractedText ? (
                      document.rawExtractedText.split('\n').map((line, idx) => {
                        const snippet = record?.sourceOriginalSnippet;
                        const isMatch = snippet && (line.includes(snippet) || snippet.includes(line.trim()));
                        return (
                          <div
                            key={idx}
                            className={`p-1 rounded transition ${
                              isMatch
                                ? 'bg-amber-100 dark:bg-amber-950/70 border border-amber-400 text-amber-950 dark:text-amber-200 font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {line}
                            {isMatch && (
                              <span className="text-[9px] text-amber-700 dark:text-amber-400 font-sans block mt-0.5 uppercase tracking-wider">
                                ● Matched Source Evidence Snippet
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs italic">
                        Raw text extraction completed for this document.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 text-xs space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Original document unavailable</p>
                  <p className="text-[11px] text-slate-400">
                    This clinical record was registered directly via clinical intake form or user-provided data.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Provide Rejection Justification
              </h3>
              <p className="text-xs text-slate-500">
                Select why this extracted fact is clinically inaccurate or rejected:
              </p>

              <div className="space-y-2 text-xs">
                {REJECTION_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={r}
                      checked={selectedRejectReason === r}
                      onChange={(e) => setSelectedRejectReason(e.target.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{r}</span>
                  </label>
                ))}

                {selectedRejectReason === 'Other' && (
                  <textarea
                    rows={2}
                    placeholder="Enter detailed clinical reason..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  Verification History & Audit Log
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 text-xs">
                {taskHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    No verification history.
                  </div>
                ) : (
                  taskHistory.map((h, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-700 dark:text-teal-400">
                          {h.action}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDate(h.timestamp)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        Reviewer: <span className="font-semibold">{h.userId}</span>
                      </div>
                      {h.reason && (
                        <div className="text-[11px] text-slate-500 italic">
                          "{h.reason}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
