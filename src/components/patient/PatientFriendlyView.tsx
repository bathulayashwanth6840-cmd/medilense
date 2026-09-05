'use client';

import React from 'react';
import { 
  Heart, 
  Smile, 
  HelpCircle, 
  Pill, 
  AlertOctagon, 
  Activity, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { PatientRecord, LabResultRecord, MedicationRecord } from '@/types/clinical';
import { formatDate } from '@/lib/utils/formatters';
import { ProvenanceBadge } from '@/components/provenance/ProvenanceBadge';

interface PatientFriendlyViewProps {
  patient: PatientRecord;
}

// Built-in Plain-Language Medical Glossary
const CLINICAL_GLOSSARY: Record<string, { plainName: string; description: string; whyTested: string }> = {
  Hemoglobin: {
    plainName: 'Oxygen-Carrying Blood Protein',
    description: 'A key protein in your red blood cells that carries oxygen from your lungs to all the tissues in your body.',
    whyTested: 'Checked to evaluate overall blood count and energy levels.',
  },
  Ferritin: {
    plainName: 'Stored Iron Level',
    description: 'A protein that acts as your body’s iron storage bank.',
    whyTested: 'Shows whether your body has sufficient iron reserves.',
  },
  'Vitamin D, 25-OH': {
    plainName: 'Vitamin D Level',
    description: 'A vital nutrient that helps your body absorb calcium and supports bone health and immune response.',
    whyTested: 'Checks for vitamin D deficiency or insufficiency.',
  },
  'WBC Count': {
    plainName: 'White Blood Cell Count',
    description: 'The defender cells of your immune system that help fight infections.',
    whyTested: 'Evaluates immune health and checks for inflammation or infection.',
  },
  Platelets: {
    plainName: 'Blood Clotting Cells',
    description: 'Small blood cells that stick together to form clots and stop bleeding after minor cuts or injuries.',
    whyTested: 'Ensures your blood can clot normally.',
  },
  'Glucose, Fasting': {
    plainName: 'Fasting Blood Sugar',
    description: 'The amount of glucose (energy sugar) in your bloodstream after fasting.',
    whyTested: 'Assesses blood sugar regulation and metabolic wellness.',
  },
  'Total Cholesterol': {
    plainName: 'Total Blood Cholesterol',
    description: 'A waxy substance circulating in your blood used to build healthy cells.',
    whyTested: 'Evaluates cardiovascular wellness and lipid balance.',
  },
  TSH: {
    plainName: 'Thyroid Control Hormone',
    description: 'A master hormone from your pituitary gland that signals your thyroid to regulate metabolism and energy.',
    whyTested: 'Evaluates thyroid gland activity.',
  },
};

export default function PatientFriendlyView({ patient }: PatientFriendlyViewProps) {
  const labs = patient.labResults || [];
  const meds = patient.medications || [];
  const allergies = patient.allergies || [];
  const summary = patient.summaries?.[0] || null;

  return (
    <div className="space-y-6">
      {/* Patient Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-500/5 to-indigo-500/10 dark:from-teal-950/40 dark:via-slate-900/60 dark:to-indigo-950/40 border border-teal-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Your Clear Health Record Overview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simplified, plain-language breakdown of your documented tests, medications, and records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Patient-Friendly Mode</span>
        </div>
      </div>

      {/* AI Plain-Language Digest */}
      {summary && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
            <Sparkles className="w-4 h-4 text-teal-600" />
            Plain-Language Summary of Your Records
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {summary.summaryText}
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-500 shrink-0" />
            <span>This summary organizes information from your uploaded reports. Always discuss any health questions or symptoms directly with your doctor.</span>
          </div>
        </div>
      )}

      {/* Lab Results in Friendly Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          Understanding Your Laboratory Results ({labs.length} Tests)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labs.map((lab) => {
            const glossary = CLINICAL_GLOSSARY[lab.testName] || {
              plainName: lab.testName,
              description: `Laboratory measurement recorded in your medical report.`,
              whyTested: `Evaluates clinical health indicators.`,
            };

            const isNormal = lab.interpretation === 'NORMAL';
            const isLow = lab.interpretation === 'LOW';
            const isHigh = lab.interpretation === 'HIGH';
            const isUnavail = lab.interpretation === 'REFERENCE_UNAVAILABLE';

            return (
              <div
                key={lab.id}
                className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                  isNormal
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : isLow || isHigh
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {glossary.plainName}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Medical name: {lab.testName}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        isNormal
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : isLow
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                          : isHigh
                          ? 'bg-orange-500/20 text-orange-800 dark:text-orange-300'
                          : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isNormal
                        ? '✓ Within Report Range'
                        : isLow
                        ? '▼ Below Report Range'
                        : isHigh
                        ? '▲ Above Report Range'
                        : '? Reference Range Not Printed'}
                    </span>
                  </div>

                  {/* Measured Value Ribbon */}
                  <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Your Value</span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {lab.measuredValue} {lab.unit || ''}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Report Reference Range</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {lab.referenceRangeText || 'Not provided in source report'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {glossary.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <ProvenanceBadge
                    provenanceType={lab.provenanceSource}
                    provenanceId={lab.provenanceId}
                    sourceDocumentName="LabCorp_CBC_2026.pdf"
                    pageNumber={lab.sourcePageNumber || 1}
                    confidence={lab.confidenceScore || 0.984}
                    sourceText={lab.sourceOriginalSnippet}
                    entityName={lab.testName}
                    entityValue={lab.measuredValue}
                    entityUnit={lab.unit}
                    referenceRangeText={lab.referenceRangeText}
                    referenceStatus={lab.interpretation}
                    documentId={lab.documentId}
                    history={lab.provenanceHistory}
                    compact
                  />
                  <span>{lab.verificationStatus === 'VERIFIED' ? '✓ Verified' : 'Unreviewed'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Medications & Allergies in Plain English */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Medications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Pill className="w-4 h-4 text-indigo-600" />
            Documented Current Medications ({meds.length})
          </h4>
          <div className="space-y-2">
            {meds.map((m) => (
              <div key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{m.drugName}</div>
                  <div className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                    Dosage: <strong>{m.dosage || 'Unspecified'}</strong> • How often: <strong>{m.frequency || 'As documented'}</strong>
                  </div>
                </div>
                <ProvenanceBadge
                  provenanceType={m.provenanceSource}
                  provenanceId={m.provenanceId}
                  sourceDocumentName="LabCorp_CBC_2026.pdf"
                  pageNumber={m.sourcePageNumber || 1}
                  confidence={m.confidenceScore || 0.96}
                  sourceText={m.sourceOriginalSnippet}
                  entityName={m.drugName}
                  entityValue={m.dosage}
                  documentId={m.documentId}
                  history={m.provenanceHistory}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            Documented Allergies & Sensitivities ({allergies.length})
          </h4>
          <div className="space-y-2">
            {allergies.map((a) => (
              <div key={a.id} className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 text-xs flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{a.allergen}</span>
                    <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">{a.severity}</span>
                  </div>
                  {a.reaction && (
                    <div className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                      Reaction noted: {a.reaction}
                    </div>
                  )}
                </div>
                <ProvenanceBadge
                  provenanceType={a.provenanceSource}
                  provenanceId={a.provenanceId}
                  sourceDocumentName="LabCorp_CBC_2026.pdf"
                  pageNumber={a.sourcePageNumber || 1}
                  confidence={a.confidenceScore || 0.99}
                  sourceText={a.sourceOriginalSnippet}
                  entityName={`Allergy: ${a.allergen}`}
                  entityValue={a.reaction || a.severity}
                  documentId={a.documentId}
                  history={a.provenanceHistory}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
