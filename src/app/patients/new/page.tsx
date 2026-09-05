'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import IntakeForm from '@/components/patient/IntakeForm';
import Link from 'next/link';
import { ChevronLeft, UserPlus } from 'lucide-react';

export default function NewPatientPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: 'New Patient Intake' },
      ]}
    >
      <div className="space-y-6">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-3"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Patient Roster
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            New Patient Intake
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register patient demographics, reported medical history, and baseline medications into the MedLens clinical graph.
          </p>
        </div>

        <IntakeForm />
      </div>
    </AppShell>
  );
}
