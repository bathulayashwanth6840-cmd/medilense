'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import { ClipboardList, Users, ArrowRight, Activity, Pill, AlertOctagon, HeartPulse } from 'lucide-react';

export default function StructuredRecordsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientData, setPatientData] = useState<any | null>(null);
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
    const fetchRecord = async () => {
      try {
        const res = await fetch(`/api/patients/${selectedPatientId}`);
        const json = await res.json();
        if (json.success) {
          setPatientData(json.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRecord();
  }, [selectedPatientId]);

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'Structured Records', active: true },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Structured Clinical Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Normalized clinical entities (medications, conditions, allergies, observations) with traceable provenance.
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
          Loading clinical records...
        </div>
      ) : patients.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No structured records yet"
          description="Register a patient to begin storing structured clinical records."
          actionLabel="New Patient Intake"
          actionHref="/patients/new"
        />
      ) : !patientData ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading patient...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medications Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Pill className="w-4 h-4 text-indigo-500" />
                Documented Medications ({(patientData.medications || []).length})
              </h3>
            </div>
            {(patientData.medications || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No active medications documented.</p>
            ) : (
              <div className="space-y-2">
                {patientData.medications.map((m: any) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{m.drugName}</span>
                      <span className="text-[10px] text-slate-500">{m.dosage || 'Dosage not specified'} • {m.frequency || 'Daily'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                      {m.provenanceSource}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allergies Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                Documented Allergies ({(patientData.allergies || []).length})
              </h3>
            </div>
            {(patientData.allergies || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No documented allergies.</p>
            ) : (
              <div className="space-y-2">
                {patientData.allergies.map((a: any) => (
                  <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-rose-700 dark:text-rose-400 block">{a.allergen}</span>
                      <span className="text-[10px] text-slate-500">{a.reaction || 'Reaction details unrecorded'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50">
                      {a.severity || 'ALERT'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conditions Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <HeartPulse className="w-4 h-4 text-teal-500" />
                Active Conditions ({(patientData.conditions || []).length})
              </h3>
            </div>
            {(patientData.conditions || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No active conditions recorded.</p>
            ) : (
              <div className="space-y-2">
                {patientData.conditions.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{c.conditionName}</span>
                      <span className="text-[10px] text-slate-500">{c.clinicalStatus || 'ACTIVE'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50">
                      {c.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Dashboard Action */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-indigo-500/10 to-transparent border border-teal-500/20 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Full Patient Intelligence</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Open {patientData.fullName}'s complete clinical dashboard to inspect AI summary notes, lab results tables, and side-by-side OCR evidence.
              </p>
            </div>
            <Link
              href={`/patients/${patientData.id}`}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer self-start"
            >
              <span>Open Patient Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
