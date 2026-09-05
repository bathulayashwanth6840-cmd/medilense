'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import { History, ShieldCheck, User, Clock, Lock, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function GlobalAuditPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPatients(json.data);
          if (json.data.length > 0) {
            setSelectedPatientId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/patients/${selectedPatientId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setAuditLogs(json.data.auditLogs || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, [selectedPatientId]);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'Audit Trail', active: true },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Immutable Audit Trail & Changelog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete chronological log of clinical events, AI extractions, conflict resolutions, and human modifications.
          </p>
        </div>

        {patients.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Patient:</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.identifier})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
          Loading audit log stream...
        </div>
      ) : patients.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit events recorded"
          description="Clinical audit logs are automatically recorded when patients are registered, files uploaded, or verifications submitted."
          actionLabel="New Patient Intake"
          actionHref="/patients/new"
        />
      ) : auditLogs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit activity for this patient"
          description="Activity logs will appear here as records are created and modified."
          compact
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {log.entityType || log.targetType}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {log.performedBy || log.actor || 'SYSTEM'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 italic text-[11px] max-w-sm truncate">
                      {log.reason || 'Recorded system audit event'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
