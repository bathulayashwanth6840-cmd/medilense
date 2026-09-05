'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Edit3,
  XCircle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { Conflict } from '@/lib/services/conflicts/ConflictTypes';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: Conflict | any;
  onResolve: (
    conflictId: string,
    decision: 'ACCEPT_SOURCE_A' | 'ACCEPT_SOURCE_B' | 'KEEP_BOTH' | 'CORRECT_VALUE' | 'DISMISSED',
    reason: string,
    correctedValue?: any,
    selectedRecordId?: string | null
  ) => Promise<void>;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
  onResolve,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<
    'ACCEPT_SOURCE_A' | 'ACCEPT_SOURCE_B' | 'KEEP_BOTH' | 'CORRECT_VALUE' | 'DISMISSED'
  >('ACCEPT_SOURCE_A');
  const [reason, setReason] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !conflict) return null;

  const sourceA = conflict.sourceA || { value: 'Source A Value', documentName: 'Document 1' };
  const sourceB = conflict.sourceB || { value: 'Source B Value', documentName: 'Document 2' };

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    if (selectedDecision === 'CORRECT_VALUE' && !correctedValue.trim()) return;

    setIsSubmitting(true);
    try {
      await onResolve(
        conflict.id,
        selectedDecision,
        reason,
        selectedDecision === 'CORRECT_VALUE' ? correctedValue : undefined,
        selectedDecision === 'ACCEPT_SOURCE_A'
          ? conflict.sourceA?.recordId
          : selectedDecision === 'ACCEPT_SOURCE_B'
          ? conflict.sourceB?.recordId
          : null
      );
      setShowConfirm(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Resolve Clinical Conflict
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Reviewer decision will be permanently attached to the immutable audit log.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Conflict Summary Reminder */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/40 text-xs">
            <div className="font-bold text-amber-950 dark:text-amber-200">
              {conflict.description}
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1">
              Source A: <strong>{String(sourceA.value)}</strong> ({sourceA.documentName || 'Doc 1'}) vs Source B: <strong>{String(sourceB.value)}</strong> ({sourceB.documentName || 'Doc 2'})
            </div>
          </div>

          {/* Decision Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Select Resolution Decision
            </label>

            <div className="space-y-2">
              <label
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  selectedDecision === 'ACCEPT_SOURCE_A'
                    ? 'bg-teal-500/10 border-teal-500 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="ACCEPT_SOURCE_A"
                  checked={selectedDecision === 'ACCEPT_SOURCE_A'}
                  onChange={() => setSelectedDecision('ACCEPT_SOURCE_A')}
                  className="mt-0.5 text-teal-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">Accept Source A ({String(sourceA.value)})</span>
                  <span className="text-slate-500 text-[11px]">
                    Validate value from {sourceA.documentName || 'Source A'} as the primary active record.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  selectedDecision === 'ACCEPT_SOURCE_B'
                    ? 'bg-teal-500/10 border-teal-500 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="ACCEPT_SOURCE_B"
                  checked={selectedDecision === 'ACCEPT_SOURCE_B'}
                  onChange={() => setSelectedDecision('ACCEPT_SOURCE_B')}
                  className="mt-0.5 text-teal-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">Accept Source B ({String(sourceB.value)})</span>
                  <span className="text-slate-500 text-[11px]">
                    Validate value from {sourceB.documentName || 'Source B'} as the primary active record.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  selectedDecision === 'KEEP_BOTH'
                    ? 'bg-teal-500/10 border-teal-500 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="KEEP_BOTH"
                  checked={selectedDecision === 'KEEP_BOTH'}
                  onChange={() => setSelectedDecision('KEEP_BOTH')}
                  className="mt-0.5 text-teal-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">Keep Both Sources (Legitimate Progression)</span>
                  <span className="text-slate-500 text-[11px]">
                    Retain both values as documented chronological medical history without contradiction.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  selectedDecision === 'CORRECT_VALUE'
                    ? 'bg-teal-500/10 border-teal-500 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="CORRECT_VALUE"
                  checked={selectedDecision === 'CORRECT_VALUE'}
                  onChange={() => setSelectedDecision('CORRECT_VALUE')}
                  className="mt-0.5 text-teal-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">Enter Clinician Corrected Value</span>
                  <span className="text-slate-500 text-[11px]">
                    Provide a corrected value that creates a new immutable USER_EDITED provenance record.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  selectedDecision === 'DISMISSED'
                    ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value="DISMISSED"
                  checked={selectedDecision === 'DISMISSED'}
                  onChange={() => setSelectedDecision('DISMISSED')}
                  className="mt-0.5 text-slate-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">Dismiss Conflict (Clinically Insignificant / False Positive)</span>
                  <span className="text-slate-500 text-[11px]">
                    Mark conflict dismissed with clinical justification.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Corrected Value Input (if selected) */}
          {selectedDecision === 'CORRECT_VALUE' && (
            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-300/60 dark:border-teal-800/60 space-y-2">
              <label className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                Corrected Clinical Value *
              </label>
              <input
                type="text"
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                placeholder="e.g., 750 mg PO daily"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
              <span className="text-[11px] text-teal-700 dark:text-teal-300 block">
                Original source evidence will be preserved and linked to this correction.
              </span>
            </div>
          )}

          {/* Mandatory Clinical Reason */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Clinical Justification / Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Document the clinical rationale for this resolution decision..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
              required
            />
          </div>
        </div>

        {/* Confirmation Modal Layer */}
        {showConfirm && (
          <div className="p-5 border-t border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-xs space-y-3">
            <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Are you sure you want to resolve this conflict with decision: {selectedDecision}?</span>
            </div>
            <div className="text-[11px] text-amber-800 dark:text-amber-300">
              This action will be recorded in the immutable audit log and attached to the patient profile.
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showConfirm && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!reason.trim() || (selectedDecision === 'CORRECT_VALUE' && !correctedValue.trim())}
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Review & Submit Decision
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
