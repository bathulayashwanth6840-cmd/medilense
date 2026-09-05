'use client';

import React, { useEffect, useState, use } from 'react';
import Header from '@/components/layout/Header';
import PatientHeader from '@/components/patient/PatientHeader';
import AISummaryCard from '@/components/ai/AISummaryCard';
import ConflictDetector from '@/components/ai/ConflictDetector';
import LabResultsTable from '@/components/clinical/LabResultsTable';
import LabTrendsChart from '@/components/clinical/LabTrendsChart';
import MedicationsList from '@/components/clinical/MedicationsList';
import AllergiesList from '@/components/clinical/AllergiesList';
import ConditionsList from '@/components/clinical/ConditionsList';
import ClinicalTimeline from '@/components/clinical/ClinicalTimeline';
import SideBySideViewer from '@/components/documents/SideBySideViewer';
import DocumentUploader from '@/components/documents/DocumentUploader';
import AuditTrailDrawer from '@/components/verification/AuditTrailDrawer';
import AuditTrailView from '@/components/verification/AuditTrailView';
import BulkVerificationModal from '@/components/clinical/BulkVerificationModal';
import PatientFriendlyView from '@/components/patient/PatientFriendlyView';
import { PatientRecord } from '@/types/clinical';
import { 
  FileText, 
  Plus, 
  ShieldCheck, 
  Download, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Layers,
  Search
} from 'lucide-react';

export default function PatientDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'CLINICIAN' | 'PATIENT'>('CLINICIAN');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [showBulkVerifyModal, setShowBulkVerifyModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPatient = async () => {
    try {
      const res = await fetch(`/api/patients/${id}`);
      const json = await res.json();
      if (json.success) {
        setPatient(json.data);
        // Default select the first lab (Hemoglobin) if none selected
        if (!selectedEntity && json.data.labResults?.length > 0) {
          setSelectedEntity(json.data.labResults[0]);
        }
      }
    } catch (err) {
      console.error('Fetch patient error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [id]);

  // Human Verification Handler
  const handleVerify = async (
    entityId: string,
    action: 'ACCEPT' | 'EDIT' | 'REJECT',
    editedValues?: any,
    reason?: string
  ) => {
    if (!patient) return;

    let entityType: any = 'LAB_RESULT';
    if ((patient.medications || []).some(m => m.id === entityId)) entityType = 'MEDICATION';
    if ((patient.allergies || []).some(a => a.id === entityId)) entityType = 'ALLERGY';
    if ((patient.conditions || []).some(c => c.id === entityId)) entityType = 'CONDITION';

    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          entityType,
          entityId,
          action,
          editedValues,
          reason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPatient();
      }
    } catch (err) {
      console.error('Verification error:', err);
    }
  };

  // Conflict Resolution Handler
  const handleResolveConflict = async (conflictId: string, notes: string) => {
    try {
      const res = await fetch(`/api/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionStatus: 'RESOLVED',
          resolutionNotes: notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPatient();
      }
    } catch (err) {
      console.error('Conflict resolution error:', err);
    }
  };

  // Re-generate AI Summary
  const handleRefreshSummary = async () => {
    if (!patient) return;
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPatient();
      }
    } catch (err) {
      console.error('Summary error:', err);
    }
  };

  // PDF Export
  const handleExportPdf = () => {
    if (!patient) return;
    window.open(`/api/export-pdf?patientId=${patient.id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          Loading MedLens clinical dashboard...
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-xs text-rose-500">
          Patient record not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Patient Demographic & Metrics Header */}
        <PatientHeader
          patient={patient}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          onOpenUploadModal={() => setShowUploadModal(true)}
          onOpenAuditDrawer={() => setShowAuditDrawer(true)}
          onExportPdf={handleExportPdf}
        />

        {/* 20. MedLens Central Traceability & Workflow Pipeline */}
        <div className="hidden lg:flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Workflow:</span>
          </div>

          {[
            { label: 'Medical Documents' },
            { label: 'AI Extraction' },
            { label: 'Structured Records' },
            { label: 'Source Evidence & Provenance' },
            { label: 'Conflict Detection' },
            { label: 'Human Verification' },
            { label: 'Auditable Clinical Record' },
          ].map((step, idx, arr) => (
            <React.Fragment key={idx}>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {step.label}
              </span>
              {idx < arr.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 👤 PATIENT-FRIENDLY VIEW MODE */}
        {viewMode === 'PATIENT' ? (
          <PatientFriendlyView patient={patient} />
        ) : (
          /* 🩺 CLINICIAN VIEW MODE */
          <>
            {/* Tab 1: Overview (Two-Column Main Workspace) */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 4. LEFT PANEL (60–65%): Clinical Dashboard & Structured Records */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center justify-between pb-1">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      Clinical Dashboard & Structured Records
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                      Patient: {patient.fullName} (MRN: {patient.identifier})
                    </span>
                  </div>

                  {/* 5. Potential Conflict Attention Card */}
                  <ConflictDetector
                    conflicts={patient.conflicts || []}
                    onResolveConflict={handleResolveConflict}
                  />

                  {/* 6. AI Clinical Fact Summary */}
                  <AISummaryCard
                    patient={patient}
                    onRefreshSummary={handleRefreshSummary}
                  />

                  {/* 7. Laboratory Results Table */}
                  <LabResultsTable
                    labResults={patient.labResults || []}
                    onVerify={handleVerify}
                    onSelectSnippet={(lab) => setSelectedEntity(lab)}
                    selectedLabId={selectedEntity?.id}
                    onOpenBulkVerify={() => setShowBulkVerifyModal(true)}
                  />

                  {/* 12. Medications & Allergies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MedicationsList
                      medications={patient.medications || []}
                      onVerify={handleVerify}
                      onSelectSnippet={(m) => setSelectedEntity(m)}
                    />
                    <AllergiesList
                      allergies={patient.allergies || []}
                      onVerify={handleVerify}
                      onSelectSnippet={(a) => setSelectedEntity(a)}
                    />
                  </div>
                </div>

                {/* 4. RIGHT PANEL (35–40%): Document Source / AI Inspector */}
                <div className="lg:col-span-5 sticky top-24 space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      Document Source / AI Inspector
                    </h2>
                    <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live Evidence
                    </span>
                  </div>

                  <SideBySideViewer
                    documents={patient.documents || []}
                    selectedEntity={selectedEntity}
                    onVerify={handleVerify}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Labs & Tests */}
            {activeTab === 'labs' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <LabResultsTable
                    labResults={patient.labResults || []}
                    onVerify={handleVerify}
                    onSelectSnippet={(lab) => setSelectedEntity(lab)}
                    selectedLabId={selectedEntity?.id}
                    onOpenBulkVerify={() => setShowBulkVerifyModal(true)}
                  />
                </div>

                <div className="lg:col-span-5 sticky top-24">
                  <SideBySideViewer
                    documents={patient.documents || []}
                    selectedEntity={selectedEntity}
                    onVerify={handleVerify}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Medications & Allergies */}
            {activeTab === 'meds' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <MedicationsList
                    medications={patient.medications || []}
                    onVerify={handleVerify}
                    onSelectSnippet={(m) => setSelectedEntity(m)}
                  />
                  <AllergiesList
                    allergies={patient.allergies || []}
                    onVerify={handleVerify}
                    onSelectSnippet={(a) => setSelectedEntity(a)}
                  />
                  <ConditionsList
                    conditions={patient.conditions || []}
                    onVerify={handleVerify}
                    onSelectSnippet={(c) => setSelectedEntity(c)}
                  />
                </div>

                <div className="lg:col-span-5 sticky top-24">
                  <SideBySideViewer
                    documents={patient.documents || []}
                    selectedEntity={selectedEntity}
                    onVerify={handleVerify}
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Chronological Medical Timeline */}
            {activeTab === 'timeline' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <ClinicalTimeline
                  patient={patient}
                  onSelectEntity={(e) => {
                    setSelectedEntity(e);
                    setActiveTab('overview');
                  }}
                />
              </div>
            )}

            {/* Tab 5: Documents */}
            {activeTab === 'documents' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Medical Documents & Diagnostic Reports ({(patient.documents || []).length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cryptographically indexed clinical records with SHA-256 integrity checksums.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Upload Document
                  </button>
                </div>

                <div className="space-y-3">
                  {(patient.documents || []).map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedEntity({ documentId: doc.id });
                        setActiveTab('overview');
                      }}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {doc.originalFileName}
                          </h4>
                          <div className="text-xs text-slate-500 mt-1 space-x-3">
                            <span>Type: {doc.documentType === 'LAB_REPORT' ? 'Laboratory Report' : doc.documentType}</span>
                            <span>•</span>
                            <span>Pages: 2</span>
                            <span>•</span>
                            <span>Processed: {new Date(doc.reportDate || doc.uploadedAt || new Date()).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Confidence: 98.4%</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            SHA-256: {doc.fileHashSha256}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Processed
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntity({ documentId: doc.id });
                            setActiveTab('overview');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
                        >
                          View Inspector
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 6: Full Audit Trail */}
            {activeTab === 'audit' && (
              <div className="max-w-5xl mx-auto">
                <AuditTrailView auditLogs={patient.auditLogs || []} />
              </div>
            )}

            {/* Tab 7: Longitudinal Trends Visualizer */}
            {activeTab === 'trends' && (
              <div className="max-w-5xl mx-auto">
                <LabTrendsChart labResults={patient.labResults || []} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <DocumentUploader
          patientId={patient.id}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            fetchPatient();
          }}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Audit Trail Drawer Modal */}
      {showAuditDrawer && (
        <AuditTrailDrawer
          auditLogs={patient.auditLogs || []}
          onClose={() => setShowAuditDrawer(false)}
        />
      )}

      {/* Bulk Verification Modal */}
      {showBulkVerifyModal && (
        <BulkVerificationModal
          patient={patient}
          onSuccess={async () => {
            await fetchPatient();
          }}
          onClose={() => setShowBulkVerifyModal(false)}
        />
      )}
    </div>
  );
}
