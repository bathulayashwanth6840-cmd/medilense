'use client';

import React from 'react';
import { 
  User, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Activity, 
  Phone, 
  Download, 
  UploadCloud, 
  History,
  CheckCircle2,
  Stethoscope,
  Smile
} from 'lucide-react';
import { PatientRecord } from '@/types/clinical';
import { formatDate } from '@/lib/utils/formatters';

interface PatientHeaderProps {
  patient: PatientRecord;
  onOpenUploadModal: () => void;
  onOpenAuditDrawer: () => void;
  onExportPdf: () => void;
  onSelectTab: (tab: string) => void;
  activeTab: string;
  viewMode?: 'CLINICIAN' | 'PATIENT';
  onToggleViewMode?: (mode: 'CLINICIAN' | 'PATIENT') => void;
}

export default function PatientHeader({
  patient,
  onOpenUploadModal,
  onOpenAuditDrawer,
  onExportPdf,
  onSelectTab,
  activeTab,
  viewMode = 'CLINICIAN',
  onToggleViewMode,
}: PatientHeaderProps) {
  const labs = patient.labResults || [];
  const verifiedLabs = labs.filter(l => l.verificationStatus === 'VERIFIED' || l.verificationStatus === 'EDITED').length;
  const verificationRate = labs.length > 0 ? Math.round((verifiedLabs / labs.length) * 100) : 0;
  
  const pendingConflicts = (patient.conflicts || []).filter(
    c => c.resolutionStatus === 'UNREVIEWED' || c.resolutionStatus === 'DETECTED'
  );
  const outOfRangeLabs = labs.filter(l => l.interpretation === 'LOW' || l.interpretation === 'HIGH').length;

  // Calculate age if DOB exists
  let ageString = 'Age: Not available';
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const diffMs = Date.now() - dob.getTime();
      const ageDate = new Date(diffMs);
      ageString = `Age ${Math.abs(ageDate.getUTCFullYear() - 1970)}`;
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6">
      {/* Top Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-teal-500/20 shrink-0">
            {patient.fullName ? patient.fullName.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {patient.fullName || 'Unnamed Patient'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono">
                {patient.identifier || 'MRN: Not available'}
              </span>
              {pendingConflicts.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {pendingConflicts.length} Conflict{pendingConflicts.length > 1 ? 's' : ''} Detected
                </span>
              )}
            </div>

            {/* Demographics Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {ageString} {patient.dateOfBirth ? `(${formatDate(patient.dateOfBirth)})` : '(DOB: Not available)'}
              </span>
              <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                Sex: {patient.sex ? patient.sex.toLowerCase() : 'Not available'}
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Blood: {patient.bloodType || 'Not available'}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {patient.contactNumber || 'Phone: Not available'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Dual View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Clinician vs Patient Mode Toggle */}
          {onToggleViewMode && (
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => onToggleViewMode('CLINICIAN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'CLINICIAN'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Clinician View</span>
              </button>
              <button
                onClick={() => onToggleViewMode('PATIENT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'PATIENT'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Patient View</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={onExportPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Export Report
          </button>
          <button
            onClick={onOpenAuditDrawer}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Audit Trail
          </button>
        </div>
      </div>

      {/* Clinical Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Human Verification</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{verificationRate}%</span>
            <span className="text-[11px] text-slate-500">({verifiedLabs}/{labs.length} verified)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${verificationRate}%` }}
            ></div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Out of Range Labs</span>
            <Activity className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{outOfRangeLabs}</span>
            <span className="text-[11px] text-slate-500">per source ranges</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Zero guessed ranges</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Source Documents</span>
            <FileText className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{(patient.documents || []).length}</span>
            <span className="text-[11px] text-slate-500">PDFs / reports</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">SHA-256 Verified</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Active Conflicts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingConflicts.length}</span>
            <span className="text-[11px] text-slate-500">needs review</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Human confirmation only</span>
        </div>
      </div>

      {/* Navigation Tabs (Overview, Documents, Structured Record, Lab Results, Conflicts, Verification, Evidence, Audit, Trends) */}
      {viewMode === 'CLINICIAN' && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 dark:border-slate-800 mt-6 pt-4 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Patient Overview' },
            { id: 'documents', label: `Documents (${(patient.documents || []).length})` },
            { id: 'records', label: 'Structured Record' },
            { id: 'labs', label: `Lab Results (${labs.length})` },
            { id: 'conflicts', label: `Conflicts (${pendingConflicts.length})` },
            { id: 'verification', label: 'Verification' },
            { id: 'evidence', label: 'Evidence' },
            { id: 'audit', label: 'Audit Trail' },
            { id: 'trends', label: '📈 Lab Trends' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
