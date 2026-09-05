'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  ShieldAlert, 
  Users, 
  HelpCircle,
  Stethoscope
} from 'lucide-react';
import DisclaimerModal from './DisclaimerModal';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function Header() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-200">
        {/* Clinical Safety Notice Banner */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white text-xs px-4 py-1.5 flex items-center justify-between border-b border-teal-800/40">
          <div className="flex items-center gap-2 max-w-5xl truncate">
            <span className="inline-flex items-center gap-1 font-semibold text-teal-300 uppercase tracking-wider text-[10px] bg-teal-950/80 px-2 py-0.5 rounded border border-teal-700/50">
              <ShieldAlert className="w-3 h-3 text-teal-400" /> Non-Diagnostic System
            </span>
            <span className="text-slate-300 text-xs truncate">
              MedLens organizes and explains documented records. It does not diagnose, prescribe, or replace healthcare professionals.
            </span>
          </div>
          <button
            onClick={() => setShowDisclaimer(true)}
            className="text-[11px] text-teal-300 hover:text-white underline underline-offset-2 flex items-center gap-1 cursor-pointer transition"
          >
            <HelpCircle className="w-3 h-3" /> Safety Standards
          </button>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition">
                <Stethoscope className="w-5 h-5 text-teal-100" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-700 via-slate-800 to-indigo-700 dark:from-teal-400 dark:via-slate-100 dark:to-indigo-300 bg-clip-text text-transparent">
                  MedLens
                </span>
                <span className="text-[10px] block font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest -mt-1">
                  Clinical Intelligence
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/patients"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Patients Roster
              </Link>
              <Link
                href="/patients/p-demo-eleanor"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Active Clinical Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Guardrails Active</span>
            </div>

            {/* Theme Toggle Component */}
            <ThemeToggle />

            <Link
              href="/patients/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500 text-white shadow-sm shadow-teal-700/20 transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              New Patient Intake
            </Link>
          </div>
        </div>
      </header>

      {/* Safety Modal */}
      <DisclaimerModal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </>
  );
}
