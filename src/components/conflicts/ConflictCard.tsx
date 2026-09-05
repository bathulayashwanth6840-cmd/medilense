'use client';

import React from 'react';
import {
  AlertTriangle,
  Columns3,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Layers,
  ChevronRight,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { Conflict } from '@/lib/services/conflicts/ConflictTypes';
import { formatDate } from '@/lib/utils/formatters';

interface ConflictCardProps {
  conflict: Conflict | any;
  onCompare: (conflict: Conflict | any) => void;
  onResolve: (conflict: Conflict | any) => void;
  onReopen?: (conflictId: string) => void;
}

export const ConflictCard: React.FC<ConflictCardProps> = ({
  conflict,
  onCompare,
  onResolve,
  onReopen,
}) => {
  const type = conflict.type || conflict.conflictType || 'MEDICATION';
  const severity = conflict.severity || 'MEDIUM';
  const status = conflict.resolutionStatus || 'UNREVIEWED';
  const confidence = conflict.detectionConfidence ? Math.round(conflict.detectionConfidence * 100) : 95;

  const getSeverityBadge = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'LOW':
      default:
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
            <XCircle className="w-3 h-3" /> Dismissed
          </span>
        );
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
            <Clock className="w-3 h-3" /> In Review
          </span>
        );
      case 'UNREVIEWED':
      case 'DETECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Human Review Required
          </span>
        );
    }
  };

  const isClosed = status === 'RESOLVED' || status === 'DISMISSED';

  // Extract preview values
  const sourceAValue = conflict.sourceA?.value !== undefined ? String(conflict.sourceA.value) : null;
  const sourceBValue = conflict.sourceB?.value !== undefined ? String(conflict.sourceB.value) : null;

  return (
    <div
      className={`rounded-2xl border transition-all duration-150 p-5 ${
        isClosed
          ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-90'
          : severity === 'CRITICAL' || severity === 'HIGH'
          ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800/60 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              severity === 'CRITICAL'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                {type.replace(/_/g, ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSeverityBadge()}`}>
                {severity}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {confidence}% Detection Confidence
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Detected: {formatDate(conflict.detectedTimestamp || conflict.detectedAt || new Date())}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">{getStatusBadge()}</div>
      </div>

      {/* Description */}
      <div className="my-3.5">
        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {conflict.description}
        </p>

        {/* Source Diffs Preview Box */}
        {(sourceAValue || sourceBValue) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Source A ({conflict.sourceA?.documentName || 'Document 1'})</span>
                {conflict.sourceA?.pageNumber && <span>Page {conflict.sourceA.pageNumber}</span>}
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {sourceAValue || conflict.sourceA?.sourceText || 'Documented value A'}
              </div>
              {conflict.sourceA?.sourceText && sourceAValue && (
                <div className="text-[11px] text-slate-500 italic mt-1 truncate">
                  &ldquo;{conflict.sourceA.sourceText}&rdquo;
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Source B ({conflict.sourceB?.documentName || 'Document 2'})</span>
                {conflict.sourceB?.pageNumber && <span>Page {conflict.sourceB.pageNumber}</span>}
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {sourceBValue || conflict.sourceB?.sourceText || 'Documented value B'}
              </div>
              {conflict.sourceB?.sourceText && sourceBValue && (
                <div className="text-[11px] text-slate-500 italic mt-1 truncate">
                  &ldquo;{conflict.sourceB.sourceText}&rdquo;
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolution details if resolved */}
        {conflict.resolution && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300/40 text-xs">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
              <span>Decision: {conflict.resolution.decision}</span>
              <span>By: {conflict.resolution.reviewerId}</span>
            </div>
            {conflict.resolution.reason && (
              <div className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                Reason: {conflict.resolution.reason}
              </div>
            )}
            {conflict.resolution.correctedValue && (
              <div className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] mt-1">
                Entered Corrected Value: {String(conflict.resolution.correctedValue)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 italic">
          MedLens flags inconsistencies — human verification determines clinical truth.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCompare(conflict)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <Columns3 className="w-3.5 h-3.5 text-teal-600" />
            Compare Sources
          </button>

          {!isClosed ? (
            <button
              type="button"
              onClick={() => onResolve(conflict)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Review & Resolve
            </button>
          ) : (
            onReopen && (
              <button
                type="button"
                onClick={() => onReopen(conflict.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                Reopen Conflict
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
