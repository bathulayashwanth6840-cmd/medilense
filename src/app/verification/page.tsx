'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import {
  CheckCircle2,
  Check,
  Edit3,
  X,
  User,
  Activity,
  ArrowRight,
  Filter
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function VerificationQueuePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/verification');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (itemId: string, patientId: string, entityType: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await fetch(`/api/verification/${itemId}/${action.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          entityType,
          verifiedBy: 'Dr. Sarah Jenkins, MD',
          notes: `Clinician ${action.toLowerCase()}ed via Global Verification Queue`,
        }),
      });
      await fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = items.filter((i) => {
    if (filterType === 'LAB' && i.entityType !== 'LAB_RESULT') return false;
    if (filterType === 'MED' && i.entityType !== 'MEDICATION') return false;
    return true;
  });

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'Human Verification', active: true },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Human Verification Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and confirm extracted medical facts, medications, and out-of-range lab results before clinical finalization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="LAB">Lab Results</option>
            <option value="MED">Medications</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
          Loading verification queue...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No verification activity yet"
          description="All extracted clinical records are currently verified or no pending documents are waiting for clinician review."
          compact
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Entity / Field</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Extracted Value</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Source Evidence</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div>
                        <span>{item.testName || item.drugName || item.entityType}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.entityType}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/patients/${item.patientId}`}
                        className="font-medium text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        {item.patientName || item.patientId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.measuredValue ? `${item.measuredValue} ${item.unit || ''}` : item.dosage || '—'}
                      </span>
                      {item.interpretation && item.interpretation !== 'NORMAL' && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          {item.interpretation}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.confidenceScore ? `${Math.round(item.confidenceScore * 100)}%` : '95%'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 italic text-[11px] truncate max-w-[200px]">
                      "{item.sourceOriginalSnippet || item.rawExtractedText || 'Extracted from document'}"
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(item.id, item.patientId, item.entityType, 'ACCEPT')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <Link
                          href={`/patients/${item.patientId}?tab=labs`}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                        </Link>
                      </div>
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
