'use client';

import React, { useState } from 'react';
import { Pill, Check, Edit3, X, AlertCircle, Plus, ShieldCheck } from 'lucide-react';
import { MedicationRecord } from '@/types/clinical';
import { getProvenanceBadgeProps, getVerificationBadgeProps } from '@/lib/utils/formatters';

interface MedicationsListProps {
  medications: MedicationRecord[];
  onVerify: (medId: string, action: 'ACCEPT' | 'EDIT' | 'REJECT', editedValues?: any, reason?: string) => Promise<void>;
  onSelectSnippet: (med: MedicationRecord) => void;
  onAddMedication?: (med: Partial<MedicationRecord>) => Promise<void>;
}

export default function MedicationsList({
  medications,
  onVerify,
  onSelectSnippet,
  onAddMedication,
}: MedicationsListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDrug, setNewDrug] = useState('');
  const [newDose, setNewDose] = useState('');
  const [newFreq, setNewFreq] = useState('Once daily');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrug) return;
    if (onAddMedication) {
      await onAddMedication({
        drugName: newDrug,
        dosage: newDose,
        frequency: newFreq,
        provenanceSource: 'USER_PROVIDED',
        verificationStatus: 'VERIFIED',
      });
      setNewDrug('');
      setNewDose('');
      setShowAddModal(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Medications
            </h3>
            <span className="text-[11px] text-slate-500">
              {medications.length} documented drug(s)
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Medication
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {medications.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-xs text-slate-400">
            No active medications recorded for this patient.
          </div>
        ) : (
          medications.map((med) => {
            const prov = getProvenanceBadgeProps(med.provenanceSource);
            const verif = getVerificationBadgeProps(med.verificationStatus);

            return (
              <div
                key={med.id}
                onClick={() => onSelectSnippet(med)}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {med.drugName}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${verif.bg}`}>
                      {verif.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    <span className="font-mono font-semibold">{med.dosage || 'Dose unrecorded'}</span>
                    {med.frequency && <span className="text-slate-500"> • {med.frequency}</span>}
                    {med.route && <span className="text-slate-400"> ({med.route})</span>}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded font-medium border ${prov.bg}`}>
                    {prov.label}
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {med.verificationStatus !== 'VERIFIED' && (
                      <button
                        title="Accept medication"
                        onClick={() => onVerify(med.id, 'ACCEPT')}
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40 transition cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    {med.verificationStatus !== 'REJECTED' && (
                      <button
                        title="Reject medication"
                        onClick={() => onVerify(med.id, 'REJECT', undefined, 'Discontinued / invalid entry')}
                        className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300/40 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              Add Patient Medication
            </h4>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Drug Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lisinopril"
                  value={newDrug}
                  onChange={(e) => setNewDrug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10 mg"
                  value={newDose}
                  onChange={(e) => setNewDose(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Frequency
                </label>
                <input
                  type="text"
                  placeholder="e.g. Once daily in the morning"
                  value={newFreq}
                  onChange={(e) => setNewFreq(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                Save Medication
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
