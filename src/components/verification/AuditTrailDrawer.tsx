'use client';

import React from 'react';
import { History, ShieldCheck, User, Sparkles, X, ArrowRight } from 'lucide-react';
import { AuditLogRecord } from '@/types/clinical';
import { formatDateTime } from '@/lib/utils/formatters';

interface AuditTrailDrawerProps {
  auditLogs: AuditLogRecord[];
  onClose: () => void;
}

export default function AuditTrailDrawer({ auditLogs, onClose }: AuditTrailDrawerProps) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VERIFIED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'EDITED':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'REJECTED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
      case 'CONFLICT_RESOLVED':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'AI_EXTRACTED':
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'CREATED':
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-xl h-full shadow-2xl flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Immutable Clinical Audit Trail
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                  {auditLogs.length} Events
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Complete traceability of every AI extraction, edit, and verification.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Changelog Stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1">
          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No audit records logged yet.
            </div>
          ) : (
            auditLogs.map((log) => {
              let prev: any = null;
              let next: any = null;
              try {
                if (log.previousValuesJson) prev = JSON.parse(log.previousValuesJson);
                if (log.newValuesJson) next = JSON.parse(log.newValuesJson);
              } catch {}

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionBadge(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {log.entityType}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>

                  {log.reason && (
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>Audit Note:</strong> {log.reason}
                    </div>
                  )}

                  {/* Diff if edited */}
                  {prev && next && (
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 font-mono text-[10px] space-y-1">
                      {prev.measuredValue && next.measuredValue && (
                        <div className="flex items-center gap-2 text-slate-500">
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
                    <span className="flex items-center gap-1">
                      {log.performedBy === 'AI_ENGINE' ? (
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                      ) : (
                        <User className="w-3 h-3 text-teal-500" />
                      )}
                      Actor: {log.performedBy}
                    </span>
                    <span className="font-mono">ID: {log.entityId.slice(0, 8)}...</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
