'use client';

import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { PatientRecord } from '@/types/clinical';

interface BulkVerificationModalProps {
  patient: PatientRecord;
  onSuccess: () => void;
  onClose: () => void;
}

export default function BulkVerificationModal({
  patient,
  onSuccess,
  onClose,
}: BulkVerificationModalProps) {
  const [minConfidence, setMinConfidence] = useState(0.95);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Gather all unverified items meeting threshold
  const unverifiedLabs = (patient.labResults || []).filter(
    l => l.verificationStatus === 'UNVERIFIED' && (l.confidenceScore ?? 1.0) >= minConfidence
  );
  const unverifiedMeds = (patient.medications || []).filter(
    m => m.verificationStatus === 'UNVERIFIED' && (m.confidenceScore ?? 1.0) >= minConfidence
  );
  const unverifiedAllergies = (patient.allergies || []).filter(
    a => a.verificationStatus === 'UNVERIFIED' && (a.confidenceScore ?? 1.0) >= minConfidence
  );
  const unverifiedConditions = (patient.conditions || []).filter(
    c => c.verificationStatus === 'UNVERIFIED' && (c.confidenceScore ?? 1.0) >= minConfidence
  );

  const totalEligible = unverifiedLabs.length + unverifiedMeds.length + unverifiedAllergies.length + unverifiedConditions.length;

  const handleExecuteBulkVerify = async () => {
    setIsSubmitting(true);
    setStatusMessage('Applying atomic batch verification and writing to audit changelog...');

    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          action: 'BULK_ACCEPT_CONFIDENT',
          minConfidence,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Bulk verification failed');

      setStatusMessage(`Success! Verified ${json.data.verifiedCount} clinical items.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Batch Verification Assistant
              </h3>
              <p className="text-xs text-slate-500">
                Bulk-accept high-confidence extractions with a single audit log entry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidence Threshold Selector */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 block">
              Confidence Score Threshold
            </span>
            <span className="text-[11px] text-slate-500">
              Only extractions meeting or exceeding this confidence score will be accepted.
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
            <span>{Math.round(minConfidence * 100)}%</span>
          </div>
        </div>

        {/* Summary of Eligible Items */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {totalEligible === 0 ? (
            <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
              <span>No pending unverified extractions meeting the {Math.round(minConfidence * 100)}% confidence threshold.</span>
            </div>
          ) : (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {totalEligible} Items Ready for Bulk Verification:
              </div>

              {unverifiedLabs.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                    Laboratory Tests ({unverifiedLabs.length})
                  </span>
                  {unverifiedLabs.map(l => (
                    <div key={l.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{l.testName}: {l.measuredValue} {l.unit || ''}</span>
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round((l.confidenceScore ?? 1) * 100)}% Conf</span>
                    </div>
                  ))}
                </div>
              )}

              {unverifiedMeds.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                    Medications ({unverifiedMeds.length})
                  </span>
                  {unverifiedMeds.map(m => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{m.drugName} {m.dosage || ''}</span>
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round((m.confidenceScore ?? 1) * 100)}% Conf</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {statusMessage && (
          <div className="mt-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300">
            {statusMessage}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteBulkVerify}
            disabled={totalEligible === 0 || isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Verifying...' : `Accept All ${totalEligible} High-Confidence Items`}
          </button>
        </div>
      </div>
    </div>
  );
}
