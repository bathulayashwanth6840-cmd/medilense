'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  X,
  FileCode
} from 'lucide-react';

interface DocumentUploaderProps {
  patientId: string;
  onUploadSuccess: () => void;
  onClose?: () => void;
}

const SAMPLE_REPORTS = [
  {
    title: 'LabCorp Comprehensive CBC & Metabolic Panel',
    type: 'LAB_REPORT',
    fileName: 'LabCorp_CBC_Metabolic_Report.pdf',
    text: `LabCorp Diagnostic Laboratories
Patient Name: Eleanor Vance | MRN: MRN-849201 | DOB: 04/14/1972
Ordering Physician: Dr. Sarah Jenkins, MD
Report Date: 2026-09-02

Complete Blood Count (CBC):
Hemoglobin: 10.9 g/dL (Ref: 13.0 - 17.0 g/dL) [L]
Hematocrit: 33.1 % (Ref: 37.0 - 48.0 %) [L]
WBC: 7.1 k/uL (Ref: 4.5 - 11.0 k/uL)
Platelets: 235 k/uL (Ref: 150 - 450 k/uL)
MCV: 78 fL (Ref: 80 - 100 fL) [L]

Iron & Nutritional Markers:
Ferritin: 12 ng/mL (Ref: 20 - 200 ng/mL) [L]
Total Iron: 42 ug/dL (Ref: 50 - 170 ug/dL) [L]
Vitamin D, 25-OH: 22 ng/mL (Ref: 30 - 100 ng/mL) [L]
Vitamin B12: 480 pg/mL (Ref: 200 - 900 pg/mL)

Lipid & Chemistry Panel:
Total Cholesterol: 218 mg/dL (Ref: < 200 mg/dL) [H]
Triglycerides: 142 mg/dL (Ref: < 150 mg/dL)
HDL Cholesterol: 52 mg/dL (Ref: > 40 mg/dL)
LDL Cholesterol: 138 mg/dL (Ref: < 100 mg/dL) [H]
Glucose, Fasting: 94 mg/dL (Ref: 70 - 99 mg/dL)
C-Reactive Protein (CRP): 3.2 mg/L (Ref: None specified)`,
  },
  {
    title: 'Mercy Health Outpatient Prescription Note',
    type: 'PRESCRIPTION',
    fileName: 'Mercy_Health_Rx_Consultation.pdf',
    text: `Mercy Health Outpatient Clinic
Consultation & Medication Reconciliation
Patient: Eleanor Vance | DOB: 04/14/1972

Clinical Assessment:
Patient evaluated for ongoing microcytic state and mild hypovitaminosis D.

Prescriptions:
Rx: Ferrous Sulfate 325 mg PO once daily with ascorbic acid / citrus juice
Rx: Ergocalciferol (Vitamin D2) 50,000 IU PO weekly for 8 weeks
Rx: Atorvastatin 10 mg PO once daily at bedtime
Rx: Metformin 500 mg PO twice daily with breakfast and dinner

Documented Allergies:
Allergy: Penicillin - Reaction: Severe Urticaria and bronchospasm
Allergy: Sulfa Drugs - Reaction: Skin eruption / Erythema`,
  },
];

export default function DocumentUploader({
  patientId,
  onUploadSuccess,
  onClose,
}: DocumentUploaderProps) {
  const [selectedTab, setSelectedTab] = useState<'FILE' | 'TEXT' | 'SAMPLES'>('SAMPLES');
  const [docType, setDocType] = useState('LAB_REPORT');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleSelectSample = (sample: typeof SAMPLE_REPORTS[0]) => {
    setFileName(sample.fileName);
    setDocType(sample.type);
    setRawText(sample.text);
    setSelectedTab('TEXT');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadStatus('Computing cryptographic SHA-256 integrity checksum & running multimodal extraction...');

    try {
      if (selectedTab === 'FILE' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', patientId);
        formData.append('documentType', docType);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Upload failed');
      } else {
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            originalFileName: fileName || 'clinical_record.txt',
            documentType: docType,
            rawText: rawText,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Extraction failed');
      }

      setUploadStatus('Extraction complete! Structured data added to patient record.');
      setTimeout(() => {
        onUploadSuccess();
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ingest Medical Document
            </h3>
            <p className="text-xs text-slate-500">
              Multimodal extraction with exact reference ranges and provenance tracking.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mt-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSelectedTab('SAMPLES')}
          className={`pb-2 px-3 border-b-2 transition ${
            selectedTab === 'SAMPLES'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clinical Report Samples
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('FILE')}
          className={`pb-2 px-3 border-b-2 transition ${
            selectedTab === 'FILE'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upload PDF / Image File
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('TEXT')}
          className={`pb-2 px-3 border-b-2 transition ${
            selectedTab === 'TEXT'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Direct Text / OCR Input
        </button>
      </div>

      {/* Tab Contents */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {selectedTab === 'SAMPLES' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-500 block">
              Select a pre-formatted clinical test report to test the AI extraction and reference range parser:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_REPORTS.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSample(s)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 cursor-pointer transition flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
                      {s.type}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {s.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-3 block">
                    {s.fileName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'FILE' && (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-teal-500 transition bg-slate-50/50 dark:bg-slate-800/20">
              <UploadCloud className="w-10 h-10 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Drag and drop your medical PDF, scan, or report here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Supports PDF, JPEG, PNG, TXT</p>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-3 block mx-auto text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>
          </div>
        )}

        {selectedTab === 'TEXT' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document File Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LabCorp_CBC_2026.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="LAB_REPORT">Laboratory Report</option>
                  <option value="PRESCRIPTION">Prescription Summary</option>
                  <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                  <option value="IMAGING_REPORT">Imaging / Radiology Note</option>
                  <option value="OTHER">Other Clinical Document</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Raw Clinical Text / OCR Content
              </label>
              <textarea
                required
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the OCR text or report content here..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
              />
            </div>
          </div>
        )}

        {uploadStatus && (
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isUploading || (selectedTab === 'FILE' && !file) || (selectedTab === 'TEXT' && !rawText)}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? 'Ingesting & Parsing...' : 'Ingest & Extract Structured Data'}
          </button>
        </div>
      </form>
    </div>
  );
}
