'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import EmptyState from '@/components/layout/EmptyState';
import LabTrendsChart from '@/components/clinical/LabTrendsChart';
import { TrendingUp, Users, Activity, ArrowRight, Plus } from 'lucide-react';

export default function GlobalTrendsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
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
    if (!selectedPatientId) {
      setSelectedPatient(null);
      return;
    }
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/patients/${selectedPatientId}`);
        const json = await res.json();
        if (json.success) {
          setSelectedPatient(json.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();
  }, [selectedPatientId]);

  const labs = selectedPatient?.labResults || [];

  return (
    <AppShell>
      <Breadcrumbs
        items={[
          { label: 'Lab Trends', active: true },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Longitudinal Laboratory Trends
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual progression of biomarker values over time grounded strictly against source-provided reference intervals.
          </p>
        </div>

        {patients.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Patient:</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          Loading patient biomarker trends...
        </div>
      ) : patients.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No patients in registry"
          description="Register a patient and upload lab reports to track longitudinal biomarker trajectories."
          actionLabel="New Patient Intake"
          actionHref="/patients/new"
        />
      ) : labs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No laboratory results available"
          description={`No extracted lab tests found for ${selectedPatient?.fullName || 'this patient'}. Upload a medical report to view analyte trends.`}
          actionLabel="Open Patient Record"
          actionHref={`/patients/${selectedPatientId}`}
        />
      ) : (
        <LabTrendsChart labResults={labs} />
      )}
    </AppShell>
  );
}
