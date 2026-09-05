'use client';

import React, { useState } from 'react';
import { 
  Check, 
  Edit3, 
  X, 
  FileText, 
  Info, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Filter,
  Zap,
  ArrowRight
} from 'lucide-react';
import { LabResultRecord } from '@/types/clinical';
import { 
  formatDate, 
  getInterpretationBadgeProps, 
  getProvenanceBadgeProps, 
  getVerificationBadgeProps 
} from '@/lib/utils/formatters';

interface LabResultsTableProps {
  labResults: LabResultRecord[];
  onVerify: (labId: string, action: 'ACCEPT' | 'EDIT' | 'REJECT', editedValues?: any, reason?: string) => Promise<void>;
  onSelectSnippet: (lab: LabResultRecord) => void;
  selectedLabId?: string | null;
  onOpenBulkVerify?: () => void;
}

export default function LabResultsTable({
  labResults,
  onVerify,
  onSelectSnippet,
  selectedLabId,
  onOpenBulkVerify,
}: LabResultsTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [editingLab, setEditingLab] = useState<LabResultRecord | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editRange, setEditRange] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = labResults.filter(l => {
    if (filterStatus === 'OUT_OF_RANGE' && l.interpretation !== 'LOW' && l.interpretation !== 'HIGH') return false;
    if (filterStatus === 'UNVERIFIED' && l.verificationStatus !== 'UNVERIFIED') return false;
    if (filterStatus === 'UNAVAILABLE' && l.interpretation !== 'REFERENCE_UNAVAILABLE') return false;
    return true;
  });

  const handleOpenEdit = (e: React.MouseEvent, lab: LabResultRecord) => {
    e.stopPropagation();
    setEditingLab(lab);
    setEditValue(lab.measuredValue);
    setEditRange(lab.referenceRangeText || '');
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!editingLab) return;
    setIsSubmitting(true);
    try {
      await onVerify(
        editingLab.id,
        'EDIT',
        {
          measuredValue: editValue,
          referenceRangeText: editRange || null,
        },
        editReason || 'Clinician manual correction'
      );
      setEditingLab(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (interpretation: string) => {
    switch (interpretation) {
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            LOW
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            NORMAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
            HIGH
          </span>
        );
      case 'REFERENCE_UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* 7. Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Laboratory Results
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-mono">
              {labResults.length} Tests
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any row to view & highlight the exact bounding box on the source report.
          </p>
        </div>

        {/* Filters & Bulk Verify Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenBulkVerify && (
            <button
              onClick={onOpenBulkVerify}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-500/30 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Batch Verify (≥95%)
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OUT_OF_RANGE">Out of Range</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="UNVERIFIED">Needs Verification</option>
            </select>
          </div>
        </div>
      </div>

      {/* 7. Exact Table Columns: Test Name, Value, Unit, Source Reference Range, Status, Source */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Test Name</th>
              <th className="py-3 px-4">Value</th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Source Reference Range</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No laboratory results found.
                </td>
              </tr>
            ) : (
              filtered.map((lab) => {
                const isSelected = selectedLabId === lab.id;

                return (
                  <tr
                    key={lab.id}
                    onClick={() => onSelectSnippet(lab)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${
                      isSelected ? 'bg-teal-50/80 dark:bg-teal-950/25 ring-1 ring-inset ring-teal-500/40' : ''
                    }`}
                  >
                    {/* Test Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                        )}
                        <span>{lab.testName}</span>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {lab.measuredValue}
                    </td>

                    {/* Unit */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                      {lab.unit || '—'}
                    </td>

                    {/* Source Reference Range */}
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {lab.referenceRangeText ? (
                        <span>{lab.referenceRangeText}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unavailable</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(lab.interpretation)}
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                      LabCorp CBC
                    </td>

                    {/* Quick Verification Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {lab.verificationStatus !== 'VERIFIED' ? (
                          <button
                            title="Accept extracted value"
                            onClick={() => onVerify(lab.id, 'ACCEPT')}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified
                          </span>
                        )}
                        <button
                          title="Edit extracted value"
                          onClick={(e) => handleOpenEdit(e, lab)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Modify Extracted Lab Result — {editingLab.testName}
              </h3>
              <button
                onClick={() => setEditingLab(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Measured Value
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Source Reference Range
                </label>
                <input
                  type="text"
                  value={editRange}
                  onChange={(e) => setEditRange(e.target.value)}
                  placeholder="e.g. 13.0 - 17.0 g/dL"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Modification (Logged to Audit Changelog)
                </label>
                <textarea
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Verified with lab phone inquiry"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingLab(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save & Record Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
