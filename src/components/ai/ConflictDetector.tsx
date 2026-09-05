'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Filter,
  Columns3,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Conflict } from '@/lib/services/conflicts/ConflictTypes';
import { ConflictCard } from '@/components/conflicts/ConflictCard';
import { SideBySideReviewModal } from '@/components/conflicts/SideBySideReviewModal';
import { ConflictResolutionModal } from '@/components/conflicts/ConflictResolutionModal';

interface ConflictDetectorProps {
  conflicts: (Conflict | any)[];
  onResolveConflict?: (conflictId: string, notes: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export default function ConflictDetector({
  conflicts,
  onResolveConflict,
  onRefresh,
}: ConflictDetectorProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [comparingConflict, setComparingConflict] = useState<Conflict | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<Conflict | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Normalize status for filtering
  const filteredConflicts = conflicts.filter((c) => {
    const s = (c.resolutionStatus || 'UNREVIEWED').toUpperCase();
    if (statusFilter === 'UNREVIEWED' && s !== 'UNREVIEWED' && s !== 'DETECTED') return false;
    if (statusFilter === 'REVIEWED' && s !== 'REVIEWED') return false;
    if (statusFilter === 'RESOLVED' && s !== 'RESOLVED') return false;
    if (statusFilter === 'DISMISSED' && s !== 'DISMISSED') return false;

    if (severityFilter !== 'ALL' && (c.severity || 'MEDIUM').toUpperCase() !== severityFilter) {
      return false;
    }
    return true;
  });

  const unreviewedCount = conflicts.filter(
    (c) => (c.resolutionStatus || 'UNREVIEWED') === 'UNREVIEWED' || c.resolutionStatus === 'DETECTED'
  ).length;
  const criticalCount = conflicts.filter((c) => c.severity === 'CRITICAL').length;
  const highCount = conflicts.filter((c) => c.severity === 'HIGH').length;
  const resolvedCount = conflicts.filter((c) => c.resolutionStatus === 'RESOLVED').length;

  const handleResolveAction = async (
    conflictId: string,
    decision: 'ACCEPT_SOURCE_A' | 'ACCEPT_SOURCE_B' | 'KEEP_BOTH' | 'CORRECT_VALUE' | 'DISMISSED',
    reason: string,
    correctedValue?: any,
    selectedRecordId?: string | null
  ) => {
    setIsActionInProgress(true);
    try {
      if (decision === 'DISMISSED') {
        const res = await fetch(`/api/conflicts/${conflictId}/dismiss`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error('Failed to dismiss conflict');
      } else {
        const res = await fetch(`/api/conflicts/${conflictId}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            reason,
            correctedValue,
            selectedRecordId,
          }),
        });
        if (!res.ok) throw new Error('Failed to resolve conflict');
      }

      if (onResolveConflict) {
        await onResolveConflict(conflictId, reason);
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Resolution error:', err);
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleReopenAction = async (conflictId: string) => {
    setIsActionInProgress(true);
    try {
      const res = await fetch(`/api/conflicts/${conflictId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Reopened by reviewer from Conflict Center' }),
      });
      if (!res.ok) throw new Error('Failed to reopen conflict');
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Reopen error:', err);
    } finally {
      setIsActionInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-500/5 to-rose-500/10 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-rose-950/30 border border-amber-500/20 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clinical Conflict Detection & Reconciliation Center
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Human-in-the-Loop
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies contradictions across reports without guessing. Clinicians retain 100% decision authority.
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {criticalCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-bold text-red-700 dark:text-red-300">
              {criticalCount} Critical
            </div>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300">
            {unreviewedCount} Unreviewed
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {resolvedCount} Resolved
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {[
            { key: 'ALL', label: `All (${conflicts.length})` },
            { key: 'UNREVIEWED', label: `Unreviewed (${unreviewedCount})` },
            { key: 'REVIEWED', label: 'In Review' },
            { key: 'RESOLVED', label: `Resolved (${resolvedCount})` },
            { key: 'DISMISSED', label: 'Dismissed' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Conflict Cards List */}
      <div className="space-y-3.5">
        {filteredConflicts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              No Conflicts Found in this View
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All clinical records match demographic parameters, medication dosages, and laboratory reference guidelines.
            </p>
          </div>
        ) : (
          filteredConflicts.map((conf) => (
            <ConflictCard
              key={conf.id}
              conflict={conf}
              onCompare={(c) => setComparingConflict(c)}
              onResolve={(c) => setResolvingConflict(c)}
              onReopen={(id) => handleReopenAction(id)}
            />
          ))
        )}
      </div>

      {/* Side-by-Side Review Modal */}
      {comparingConflict && (
        <SideBySideReviewModal
          isOpen={!!comparingConflict}
          onClose={() => setComparingConflict(null)}
          conflict={comparingConflict}
          onOpenResolve={(c) => {
            setComparingConflict(null);
            setResolvingConflict(c);
          }}
        />
      )}

      {/* Resolution Action Modal */}
      {resolvingConflict && (
        <ConflictResolutionModal
          isOpen={!!resolvingConflict}
          onClose={() => setResolvingConflict(null)}
          conflict={resolvingConflict}
          onResolve={handleResolveAction}
        />
      )}
    </div>
  );
}
