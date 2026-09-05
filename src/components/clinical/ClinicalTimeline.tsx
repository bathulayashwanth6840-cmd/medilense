'use client';

import React from 'react';
import { 
  Clock, 
  FileText, 
  Activity, 
  Pill, 
  AlertOctagon, 
  UserPlus, 
  Calendar,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { PatientRecord } from '@/types/clinical';
import { formatDate } from '@/lib/utils/formatters';

interface ClinicalTimelineProps {
  patient: PatientRecord;
  onSelectEntity?: (entity: any) => void;
}

interface TimelineItem {
  id: string;
  date: Date;
  type: 'INTAKE' | 'DOCUMENT' | 'LAB' | 'MEDICATION' | 'CONFLICT';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  originalItem: any;
}

export default function ClinicalTimeline({ patient, onSelectEntity }: ClinicalTimelineProps) {
  // Aggregate all events into a single sorted chronological list
  const events: TimelineItem[] = [];

  // Intake event
  events.push({
    id: 'ev-intake',
    date: new Date(patient.createdAt),
    type: 'INTAKE',
    title: 'Initial Patient Profile & Intake Registered',
    subtitle: patient.notes || 'Baseline clinical intake registered in MedLens',
    badge: 'Intake',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    originalItem: patient,
  });

  // Document events
  for (const d of patient.documents || []) {
    events.push({
      id: `ev-doc-${d.id}`,
      date: new Date(d.reportDate || d.uploadedAt),
      type: 'DOCUMENT',
      title: `Document Uploaded: ${d.originalFileName}`,
      subtitle: `Type: ${d.documentType} • Hash: ${d.fileHashSha256.slice(0, 12)}...`,
      badge: d.documentType,
      badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
      originalItem: d,
    });
  }

  // Lab Results events
  for (const l of patient.labResults || []) {
    const isAbnormal = l.interpretation === 'LOW' || l.interpretation === 'HIGH';
    events.push({
      id: `ev-lab-${l.id}`,
      date: new Date(l.testDate || l.createdAt),
      type: 'LAB',
      title: `${l.testName}: ${l.measuredValue} ${l.unit || ''}`,
      subtitle: l.referenceRangeText
        ? `Source Ref: ${l.referenceRangeText} • Status: [${l.interpretation}]`
        : `Ref Range: Unavailable in source report`,
      badge: l.interpretation,
      badgeColor: isAbnormal
        ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
        : 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      originalItem: l,
    });
  }

  // Medications
  for (const m of patient.medications || []) {
    events.push({
      id: `ev-med-${m.id}`,
      date: new Date(m.startDate || m.createdAt),
      type: 'MEDICATION',
      title: `Medication Documented: ${m.drugName} ${m.dosage || ''}`,
      subtitle: `Frequency: ${m.frequency || 'Not specified'} • Status: ${m.status}`,
      badge: m.status,
      badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      originalItem: m,
    });
  }

  // Conflicts
  for (const c of patient.conflicts || []) {
    events.push({
      id: `ev-conf-${c.id}`,
      date: new Date(c.detectedAt),
      type: 'CONFLICT',
      title: `Clinical Conflict Detected: ${c.conflictType.replace('_', ' ')}`,
      subtitle: c.description,
      badge: c.resolutionStatus,
      badgeColor: c.resolutionStatus === 'RESOLVED'
        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        : 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      originalItem: c,
    });
  }

  // Sort descending by date
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  const getIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'INTAKE':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-teal-500" />;
      case 'LAB':
        return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'MEDICATION':
        return <Pill className="w-4 h-4 text-indigo-500" />;
      case 'CONFLICT':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Chronological Clinical Timeline
          </h3>
          <p className="text-xs text-slate-500">
            Unified chronological stream of intake, lab reports, medications, and clinical observations.
          </p>
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {events.map((ev) => (
          <div
            key={ev.id}
            onClick={() => onSelectEntity && onSelectEntity(ev.originalItem)}
            className="relative flex items-start gap-4 group cursor-pointer"
          >
            {/* Dot/Icon Anchor */}
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:border-teal-500 transition">
              <span className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-teal-500 transition"></span>
            </div>

            <div className="flex-1 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {getIcon(ev.type)}
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {ev.title}
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDate(ev.date)}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                {ev.subtitle}
              </p>

              {ev.badge && (
                <div className="mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ev.badgeColor}`}>
                    {ev.badge}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
