'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import IntakeForm from '@/components/patient/IntakeForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NewPatientPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-3"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Patient Roster
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            New Patient Intake
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register patient demographics, reported medical history, and baseline medications into the MedLens clinical graph.
          </p>
        </div>

        <IntakeForm />
      </main>
    </div>
  );
}
