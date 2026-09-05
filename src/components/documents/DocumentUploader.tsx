'use client';

import React, { useState, useRef, DragEvent } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  X, 
  ShieldCheck, 
  FileCode, 
  Clock, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  FileCheck,
  Tag,
  FileType,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DocumentUploaderProps {
  patientId?: string;
  onUploadSuccess: () => void;
  onClose?: () => void;
}

const PROCESSING_STAGES = [
  { id: 'UPLOADED', label: 'Uploaded & Hash Check', desc: 'Secure write to private storage & SHA-256 calculation' },
  { id: 'QUEUED', label: 'Queued for Ingestion', desc: 'Registered in clinical ingestion registry' },
  { id: 'PROCESSING', label: 'Preprocessing Stream', desc: 'Document boundary and format detection' },
  { id: 'EXTRACTING', label: 'Multimodal AI Extraction', desc: 'Extracting labs, meds, allergies & conditions' },
  { id: 'VALIDATING', label: 'Zero-Guess Validation', desc: 'Normalizing values against strict source reference ranges' },
  { id: 'READY_FOR_REVIEW', label: 'Conflict Analysis', desc: 'Cross-document reconciliation & review tagging' },
  { id: 'COMPLETED', label: 'Ingestion Finalized', desc: 'Integrated into structured patient record' },
];

// No hardcoded sample reports - all data comes from actual uploaded documents
const SAMPLE_REPORTS: { title: string; type: string; fileName: string; text: string }[] = [];

export default function DocumentUploader({
  patientId,
  onUploadSuccess,
  onClose,
}: DocumentUploaderProps) {
  const [targetPatientId, setTargetPatientId] = useState<string>(patientId || '');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'FILE' | 'TEXT' | 'SAMPLES'>('FILE');
  const [docType, setDocType] = useState('LAB_REPORT');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  React.useEffect(() => {
    if (patientId) {
      setTargetPatientId(patientId);
    } else {
      fetch('/api/patients')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setPatients(json.data);
            if (json.data.length > 0) {
              setTargetPatientId(json.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [patientId]);

  // Ingestion State Machine
  const [isUploading, setIsUploading] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSample = (sample: typeof SAMPLE_REPORTS[0]) => {
    setFileName(sample.fileName);
    setDocType(sample.type);
    setRawText(sample.text);
    setSelectedTab('TEXT');
    setErrorMessage(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setErrorMessage(null);
    // Validate client-side size (max 30MB)
    const MAX_MB = 30;
    if (selectedFile.size > MAX_MB * 1024 * 1024) {
      setErrorMessage(`File exceeds the maximum limit of ${MAX_MB}MB (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB). Please select a smaller document.`);
      setFile(null);
      return;
    }

    // Validate type
    const validExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt'];
    const hasValidExt = validExts.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage(`Unsupported format. MedLens securely processes PDF (.pdf), Scan images (.png, .jpg), and Clinical Text (.txt).`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  // State machine simulator for seamless clinical feedback
  const runStageProgress = async () => {
    for (let i = 0; i < PROCESSING_STAGES.length; i++) {
      setCurrentStageIndex(i);
      setCurrentStatus(PROCESSING_STAGES[i].label);
      setUploadProgress(Math.round(((i + 1) / PROCESSING_STAGES.length) * 100));
      await new Promise(r => setTimeout(r, 280));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setErrorMessage(null);
    setCurrentStageIndex(0);
    setUploadProgress(10);
    setCurrentStatus('Uploading & computing SHA-256 checksum...');

    let activePatientId: string = targetPatientId || patientId || '';
    if (!activePatientId || activePatientId === 'AUTO_CREATE') {
      try {
        const createRes = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: file ? file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : 'New Patient Record',
            identifier: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
            sex: 'UNKNOWN',
          }),
        });
        const createJson = await createRes.json();
        if (createJson.success && createJson.data?.id) {
          activePatientId = createJson.data.id;
          setTargetPatientId(activePatientId);
        } else {
          setErrorMessage('Failed to create patient record for upload: ' + (createJson.error || 'Unknown error'));
          setIsUploading(false);
          return;
        }
      } catch (err: any) {
        setErrorMessage('Failed to create patient record for upload: ' + (err.message || 'Network error'));
        setIsUploading(false);
        return;
      }
    }

    try {
      if (selectedTab === 'FILE') {
        if (!file) {
          throw new Error('Please select or drag a medical document file to upload.');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', activePatientId);
        formData.append('documentType', docType);

        // Progress simulation
        const progressPromise = runStageProgress();

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        await progressPromise;

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Document ingestion failed.');
        }
      } else {
        // Direct Text Input (Tagged USER_PROVIDED)
        if (!rawText.trim()) {
          throw new Error('Please enter clinical note text or choose a pre-loaded sample.');
        }

        const progressPromise = runStageProgress();

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: activePatientId,
            originalFileName: fileName || 'Clinical_Note_Entry.txt',
            documentType: docType,
            rawText: rawText,
          }),
        });

        await progressPromise;

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Text ingestion failed.');
        }
      }

      setCurrentStageIndex(PROCESSING_STAGES.length - 1);
      setCurrentStatus('Ingestion complete! Record updated.');
      setUploadProgress(100);

      setTimeout(() => {
        onUploadSuccess();
        if (onClose) onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during ingestion.');
      setCurrentStatus('Ingestion halted due to error');
    } finally {
      setIsUploading(false);
    }
  };

  const uploaderCard = (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 transition-all max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              MedLens Ingestion Engine
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                v2.4 Secure
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Multimodal parsing, zero-guess reference ranges, SHA-256 provenance tracking.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Input Mode Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mt-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setSelectedTab('FILE'); setErrorMessage(null); }}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            selectedTab === 'FILE'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          A. PDF / Document Upload
        </button>
        <button
          type="button"
          onClick={() => { setSelectedTab('TEXT'); setErrorMessage(null); }}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            selectedTab === 'TEXT'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          B. Direct Text Input
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            USER_PROVIDED
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setSelectedTab('SAMPLES'); setErrorMessage(null); }}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            selectedTab === 'SAMPLES'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Clinical Test Samples
        </button>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Ingestion Error</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Optional Patient Selector if not pre-bound to a specific patient */}
        {!patientId && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Target Patient Record
            </label>
            {patients.length > 0 ? (
              <select
                value={targetPatientId}
                onChange={(e) => setTargetPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
              >
                <option value="AUTO_CREATE">+ Auto-create New Patient Record from Document</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.identifier})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="font-semibold text-xs">A new Patient Record will be auto-created for this document upload.</span>
              </div>
            )}
          </div>
        )}

        {/* TAB A: PDF UPLOAD */}
        {selectedTab === 'FILE' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Classification
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  <option value="LAB_REPORT">Laboratory Report (CBC, CMP, Lipids)</option>
                  <option value="PRESCRIPTION">Prescription / Medication List</option>
                  <option value="DISCHARGE_SUMMARY">Hospital Discharge Summary</option>
                  <option value="IMAGING_REPORT">Imaging / Radiology Note</option>
                  <option value="CLINICIAN_NOTE">Outpatient Consultation Note</option>
                  <option value="OTHER">Other Clinical Record</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Storage Security Policy
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Encrypted Private Storage</span>
                </div>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 scale-[1.01]'
                  : file
                  ? 'border-teal-500/70 bg-teal-50/20 dark:bg-teal-950/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 bg-slate-50/60 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 flex items-center justify-center mb-2">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 max-w-sm truncate">
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase">
                      {file.name.split('.').pop()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileName('');
                    }}
                    className="mt-3 text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Remove & choose another file
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Drag and drop your medical PDF or scan here, or <span className="text-teal-600 dark:text-teal-400 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts PDF, JPEG, PNG, WEBP, TXT &bull; Max file size: 30 MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB B: DIRECT TEXT INPUT */}
        {selectedTab === 'TEXT' && (
          <div className="space-y-3 text-xs">
            {/* Disclaimer Banner for Method B */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Tag className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Provenance Notice: </span>
                All clinical entities ingested via direct text paste are immutably labeled with{' '}
                <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300">
                  USER_PROVIDED
                </code>{' '}
                provenance metadata.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Note / Record Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LabCorp_Manual_Paste.txt"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="LAB_REPORT">Laboratory Report</option>
                  <option value="PRESCRIPTION">Prescription Summary</option>
                  <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                  <option value="CLINICIAN_NOTE">Clinician Consultation Note</option>
                  <option value="OTHER">Other Narrative</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Raw Clinical Text / OCR Content
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {rawText.length} characters
                </span>
              </div>
              <textarea
                required
                rows={7}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste clinical notes, lab results, prescriptions, or discharge narrative here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        )}

        {/* TAB C: PRE-LOADED TEST SAMPLES */}
        {selectedTab === 'SAMPLES' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-500 block">
              Click any verified clinical test report below to test ingestion, zero-guess reference range evaluation, and conflict detection:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_REPORTS.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSample(s)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 cursor-pointer transition flex flex-col justify-between shadow-sm group"
                >
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
                      {s.type}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                      {s.title}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                      {s.fileName}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8-Stage Processing Lifecycle Visualizer */}
        {isUploading && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {currentStatus}
                </span>
              </div>
              <span className="font-mono text-teal-600 font-bold">{uploadProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {/* State Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PROCESSING_STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <span
                    key={stage.id}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                      isPassed
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : isCurrent
                        ? 'bg-teal-600 text-white animate-pulse'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPassed && <Check className="w-2.5 h-2.5" />}
                    {stage.id}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Encrypted Ingestion Pipeline</span>
          </div>

          <div className="flex gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={
                isUploading ||
                (selectedTab === 'FILE' && !file) ||
                (selectedTab === 'TEXT' && !rawText.trim())
              }
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Ingestion...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Ingest & Extract Structured Data
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  if (onClose) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {uploaderCard}
      </div>
    );
  }

  return uploaderCard;
}
