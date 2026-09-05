'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Heart, 
  Calendar, 
  Phone, 
  AlertOctagon, 
  Pill, 
  BookmarkCheck, 
  FileText,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function IntakeForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    fullName: '',
    dateOfBirth: '1985-06-15',
    sex: 'FEMALE',
    contactNumber: '+1 (555) 345-6789',
    bloodType: 'O+',
    emergencyContact: 'Family Contact - +1 (555) 876-5432',
    symptoms: 'Patient reports mild fatigue and headache for 2 weeks.',
    conditions: 'Mild Hypertension',
    allergies: 'Penicillin',
    medications: 'Lisinopril 10mg daily',
    notes: 'Baseline comprehensive clinical intake entered via web portal.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Create Patient Profile
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier,
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
          sex: formData.sex,
          contactNumber: formData.contactNumber,
          bloodType: formData.bloodType,
          emergencyContact: formData.emergencyContact,
          notes: `${formData.symptoms}\nHistory: ${formData.conditions}\nNotes: ${formData.notes}`,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create patient');

      const patientId = json.data.id;

      // 2. Add Medication from Intake if provided
      if (formData.medications) {
        await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            originalFileName: 'Patient_Intake_Form.txt',
            documentType: 'OTHER',
            rawText: `Patient Intake Narrative\nPatient: ${formData.fullName}\nRx: ${formData.medications}\nAllergy: ${formData.allergies}\nAssessment: ${formData.conditions}`,
          }),
        });
      }

      router.push(`/patients/${patientId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Intake failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 dark:text-teal-200">
          <h4 className="font-bold">MedLens Clinical Information Intake</h4>
          <p className="mt-0.5 leading-relaxed">
            All entered information is stored with <code>USER_PROVIDED</code> provenance and validated against strict schemas before inclusion in the patient record.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Demographics Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-teal-600" /> Patient Identity & Demographics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jonathan Hayes"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Medical Record Number (MRN) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Biological Sex
            </label>
            <select
              value={formData.sex}
              onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Blood Type
            </label>
            <input
              type="text"
              placeholder="e.g. A+, O-, B+"
              value={formData.bloodType}
              onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              placeholder="+1 (555) 000-0000"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
            Emergency Contact Information
          </label>
          <input
            type="text"
            placeholder="Name, Relationship, Phone Number"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
          />
        </div>
      </div>

      {/* Clinical History & Narrative */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-600" /> Clinical History & Reported Intake
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Chief Symptoms & Reasons for Presentation
            </label>
            <textarea
              rows={2}
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="e.g. Generalized weakness, exertional dyspnea, orthostatic dizziness"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Active Medications & Dosages
              </label>
              <textarea
                rows={2}
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                placeholder="e.g. Metformin 500mg twice daily"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Known Allergies & Drug Sensitivities
              </label>
              <textarea
                rows={2}
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin (Hives/Rash), Sulfa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Existing Medical Conditions / History
            </label>
            <textarea
              rows={2}
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              placeholder="e.g. Type 2 Diabetes, Osteoarthritis, Appendectomy in 2012"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Submission */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/patients')}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.fullName}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? 'Registering Intake...' : 'Create Record & Open Dashboard'}
        </button>
      </div>
    </form>
  );
}
