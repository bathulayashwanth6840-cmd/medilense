'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import ConflictDetector from '@/components/ai/ConflictDetector';
import { AlertTriangle } from 'lucide-react';

export default function GlobalConflictsPage() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = async () => {
    try {
      const res = await fetch('/api/conflicts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConflicts(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Conflict Detection' },
      ]}
    >
      <div className="space-y-6">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Conflict Detection Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Identifies potential clinical contradictions across patient demographics, medications, allergies, conditions, and lab values. <strong>Never auto-resolves truth.</strong>
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
            Loading conflict registry...
          </div>
        ) : (
          <ConflictDetector
            conflicts={conflicts}
            onRefresh={fetchConflicts}
          />
        )}
      </div>
    </AppShell>
  );
}
