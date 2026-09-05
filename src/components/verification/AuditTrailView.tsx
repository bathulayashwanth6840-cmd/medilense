'use client';

import React, { useState } from 'react';
import { 
  History, 
  ShieldCheck, 
  User, 
  Sparkles, 
  ArrowRight, 
  Search, 
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { AuditLogRecord } from '@/types/clinical';
import { formatDateTime } from '@/lib/utils/formatters';

interface AuditTrailViewProps {
  auditLogs: AuditLogRecord[];
}

export default function AuditTrailView({ auditLogs }: AuditTrailViewProps) {
  const [filterActor, setFilterActor] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = auditLogs.filter((log) => {
    if (filterActor !== 'ALL' && log.performedBy !== filterActor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEntity = log.entityType.toLowerCase().includes(q);
      const matchReason = (log.reason || '').toLowerCase().includes(q);
      if (!matchAction && !matchEntity && !matchReason) return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VERIFIED':
      case 'BULK_VERIFIED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'EDITED':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'REJECTED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
      case 'CONFLICT_RESOLVED':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'AI_EXTRACTED':
      case 'CONFIDENCE_EVALUATED':
      case 'CONFLICT_DETECTED':
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'CREATED':
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Immutable Clinical Audit Trail
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                {auditLogs.length} Events Logged
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographically traceable changelog of every AI extraction, confidence evaluation, and clinician review.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Actors</option>
            <option value="USER">Human Clinicians (USER)</option>
            <option value="AI_ENGINE">AI Parser (AI_ENGINE)</option>
          </select>
        </div>
      </div>

      {/* Events Stream */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No audit records match the current filter.
          </div>
        ) : (
          filtered.map((log) => {
            let prev: any = null;
            let next: any = null;
            try {
              if (log.previousValuesJson) prev = JSON.parse(log.previousValuesJson);
              if (log.newValuesJson) next = JSON.parse(log.newValuesJson);
            } catch {}

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionBadge(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.entityType}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      ID: {log.entityId}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>

                {log.reason && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200">
                    <strong className="text-slate-500 font-semibold">Event Description:</strong> {log.reason}
                  </div>
                )}

                {/* Diff inspection */}
                {prev && next && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 font-mono text-[11px] space-y-1">
                    {prev.measuredValue && next.measuredValue && (
                      <div className="flex items-center gap-2">
                        <span className="text-rose-600 dark:text-rose-400 line-through">
                          {prev.measuredValue}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {next.measuredValue}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 font-semibold">
                    {log.performedBy === 'AI_ENGINE' ? (
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> System: AI_ENGINE
                      </span>
                    ) : (
                      <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                        <User className="w-3 h-3" /> Reviewer: USER
                      </span>
                    )}
                  </span>
                  <span className="text-slate-400">Source: Document & Form Ingestion</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
