'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Tag,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  FileHeart,
  Stethoscope,
  Activity
} from 'lucide-react';
import { PatientIntakeFormSchema, PatientIntakeFormData } from '@/lib/validation/schemas';
import { z } from 'zod';

export default function IntakeForm() {
  const router = useRouter();

  // Form State with clean initial values
  const [formData, setFormData] = useState<PatientIntakeFormData>({
    identifier: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    fullName: '',
    dateOfBirth: '',
    age: 0,
    sex: 'FEMALE',
    contactNumber: '',
    bloodType: 'O+',
    emergencyContact: '',
    symptoms: '',
    existingConditions: '',
    allergies: '',
    medications: '',
    medicalHistory: '',
    additionalNotes: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-calculate age whenever dateOfBirth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const birth = new Date(formData.dateOfBirth);
      const now = new Date();
      if (!isNaN(birth.getTime()) && birth <= now) {
        let calculatedAge = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
          calculatedAge--;
        }
        setFormData(prev => ({ ...prev, age: Math.max(0, calculatedAge) }));
      }
    }
  }, [formData.dateOfBirth]);

  const handleInputChange = (field: keyof PatientIntakeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on edit
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      // 1. Client-Side Zod Validation
      const parseResult = PatientIntakeFormSchema.safeParse(formData);
      if (!parseResult.success) {
        const errors: Record<string, string> = {};
        parseResult.error.issues.forEach((err: any) => {
          const key = err.path[0] as string;
          errors[key] = err.message;
        });
        setFieldErrors(errors);
        throw new Error('Please correct the highlighted validation errors before submitting.');
      }

      // 2. Server-Side Ingestion Endpoint Call
      const res = await fetch('/api/patients/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseResult.data),
      });

      const json = await res.json();
      if (!json.success) {
        if (json.issues) {
          const errors: Record<string, string> = {};
          json.issues.forEach((iss: any) => {
            errors[iss.field] = iss.message;
          });
          setFieldErrors(errors);
        }
        throw new Error(json.error || 'Intake submission failed on server.');
      }

      setIsSuccess(true);
      const patientId = json.data.patient.id;

      setTimeout(() => {
        router.push(`/patients/${patientId}`);
      }, 800);
    } catch (err: any) {
      setGeneralError(err.message || 'An error occurred during intake registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner with Provenance Notice */}
      <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">
                Method C: Structured Patient Intake Form
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                USER_PROVIDED Provenance
              </span>
            </div>
            <p className="text-xs text-teal-700 dark:text-teal-300 mt-1 leading-relaxed">
              Standardized intake protocol with strict Zod validation. All submitted clinical fields are tagged with immutable user provenance and integrated into the longitudinal patient record.
            </p>
          </div>
        </div>
      </div>

      {/* General Error Alert */}
      {generalError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Validation Alert</span>
            <span>{generalError}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: Patient Identity & Demographics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            1. Patient Identity & Demographics
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Step 1 of 4</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 ${
                fieldErrors.fullName
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-teal-500'
              }`}
            />
            {fieldErrors.fullName && (
              <span className="text-[10px] text-rose-600 mt-1 block">{fieldErrors.fullName}</span>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Medical Record Number (MRN) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.identifier}
              onChange={(e) => handleInputChange('identifier', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-teal-500"
            />
            {fieldErrors.identifier && (
              <span className="text-[10px] text-rose-600 mt-1 block">{fieldErrors.identifier}</span>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Biological Sex
            </label>
            <select
              value={formData.sex}
              onChange={(e) => handleInputChange('sex', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            >
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
              <option value="UNKNOWN">Unknown / Unspecified</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Date of Birth <span className="text-slate-400">(YYYY-MM-DD)</span>
            </label>
            <input
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            />
            {fieldErrors.dateOfBirth && (
              <span className="text-[10px] text-rose-600 mt-1 block">{fieldErrors.dateOfBirth}</span>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Age <span className="text-slate-400 font-normal">(Calculated)</span>
            </label>
            <div className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs font-mono flex items-center justify-between">
              <span>{formData.age !== undefined && formData.age !== null ? `${formData.age} years old` : '—'}</span>
              <span className="text-[10px] text-slate-400">Auto</span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Blood Group / Rh Factor
            </label>
            <input
              type="text"
              placeholder="e.g. A+, O-, B+"
              value={formData.bloodType || ''}
              onChange={(e) => handleInputChange('bloodType', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              placeholder="+1 (555) 000-0000"
              value={formData.contactNumber || ''}
              onChange={(e) => handleInputChange('contactNumber', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Emergency Contact & Relationship
            </label>
            <input
              type="text"
              placeholder="e.g. Mark Vance (Spouse) - +1 (555) 482-9015"
              value={formData.emergencyContact || ''}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Symptoms & Presentation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            2. Presenting Symptoms & Clinical Chief Complaint
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Step 2 of 4</span>
        </div>

        <div className="text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Reported Symptoms, Onset & Duration
          </label>
          <textarea
            rows={3}
            value={formData.symptoms || ''}
            onChange={(e) => handleInputChange('symptoms', e.target.value)}
            placeholder="e.g. Patient presents with 3 weeks of generalized fatigue, orthostatic dizziness, and shortness of breath upon stair climbing."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 leading-relaxed"
          />
        </div>
      </div>

      {/* SECTION 3: Conditions, Medications & Allergies */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" />
            3. Clinical Profile: Conditions, Medications & Allergies
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Step 3 of 4</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Existing Medical Conditions
            </label>
            <textarea
              rows={4}
              value={formData.existingConditions || ''}
              onChange={(e) => handleInputChange('existingConditions', e.target.value)}
              placeholder="e.g. Essential Hypertension, Type 2 Diabetes, Microcytic Anemia"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Active Medications & Dosages
            </label>
            <textarea
              rows={4}
              value={formData.medications || ''}
              onChange={(e) => handleInputChange('medications', e.target.value)}
              placeholder="e.g. Lisinopril 10mg daily, Metformin 500mg twice daily with meals"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Documented Allergies & Reactions
            </label>
            <textarea
              rows={4}
              value={formData.allergies || ''}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              placeholder="e.g. Penicillin (Severe Hives/Anaphylaxis), Sulfa (Maculopapular Rash)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Past Medical History & Additional Clinical Notes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            4. Surgical History, Family Background & Additional Notes
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Step 4 of 4</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Medical & Surgical History
            </label>
            <textarea
              rows={3}
              value={formData.medicalHistory || ''}
              onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
              placeholder="e.g. Appendectomy (2014), Cholecystectomy (2018), Family history of early CAD"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Additional Clinical Notes / Directives
            </label>
            <textarea
              rows={3}
              value={formData.additionalNotes || ''}
              onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
              placeholder="e.g. Patient requests comprehensive anemia panel and vitamin D level reassessment."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Submission Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Server-side Zod validation active</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/patients')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.fullName.trim()}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Validating & Ingesting Intake...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Intake Created! Redirecting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Register Intake & Create Record
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
