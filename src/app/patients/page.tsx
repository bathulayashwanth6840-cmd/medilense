'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Plus, 
  ArrowRight, 
  Activity, 
  AlertTriangle, 
  FileText, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { formatDate } from '@/lib/utils/formatters';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const json = await res.json();
      if (json.success) {
        setPatients(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.identifier.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Top */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Patient Health Records
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select a patient record to inspect structured lab results, medications, and provenance trails.
            </p>
          </div>

          <Link
            href="/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Patient Intake
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name, MRN, or symptoms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Patient Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
            Loading patient records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {search ? 'No Matching Patients' : 'No Patient Records in Registry'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {search
                  ? `No patient records match "${search}". Try searching by another name or MRN.`
                  : 'Start by submitting a standardized clinical intake form to initialize patient records with verifiable provenance.'}
              </p>
            </div>
            {!search && (
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Register First Patient
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/40 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                        {p.fullName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                          {p.fullName}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500">
                          {p.identifier}
                        </span>
                      </div>
                    </div>

                    {p.conflictsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {p.conflictsCount} Conflict
                      </span>
                    )}
                  </div>

                  {/* Summary indicators */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300 my-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Labs</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{p.labsCount || 0} tests</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Meds</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{p.medsCount || 0} active</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Reports</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{p.documentsCount || 0} docs</span>
                    </div>
                  </div>

                  {p.notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                      "{p.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-semibold">
                  <span>Open Clinical Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
