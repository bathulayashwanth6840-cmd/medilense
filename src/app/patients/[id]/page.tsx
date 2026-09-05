'use client';

import React, { useEffect, useState, use } from 'react';
import AppShell from '@/components/layout/AppShell';
import EmptyState from '@/components/layout/EmptyState';
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
  Search,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Activity,
  Check,
  Edit3,
  X
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
        // Default select the first lab if none selected
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

  const tabLabelMap: Record<string, string> = {
    overview: 'Overview',
    documents: 'Documents',
    records: 'Structured Records',
    meds: 'Structured Records',
    labs: 'Lab Results',
    conflicts: 'Conflicts',
    verification: 'Human Verification',
    evidence: 'Source Evidence',
    audit: 'Audit Trail',
    trends: 'Lab Trends',
    timeline: 'Timeline',
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Patients', href: '/patients' },
    { label: patient ? patient.fullName : 'Patient Record', href: `/patients/${id}` },
    { label: tabLabelMap[activeTab] || 'Overview' },
  ];

  if (loading) {
    return (
      <AppShell breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/patients' }, { label: 'Loading...' }]}>
        <div className="py-24 text-center text-xs text-slate-400 animate-pulse">
          Loading MedLens clinical dashboard...
        </div>
      </AppShell>
    );
  }

  if (!patient) {
    return (
      <AppShell breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Patients', href: '/patients' }, { label: 'Not Found' }]}>
        <div className="py-16">
          <EmptyState
            icon={AlertTriangle}
            title="Patient Record Not Found"
            description="The requested patient identifier does not exist in the MedLens clinical graph."
            actionHref="/patients"
            actionLabel="Return to Patient Roster"
            secondaryActionHref="/patients/new"
            secondaryActionLabel="Register New Patient"
          />
        </div>
      </AppShell>
    );
  }

  // Get unverified items for the dedicated verification tab
  const unverifiedLabs = (patient.labResults || []).filter(l => l.verificationStatus === 'UNVERIFIED');
  const unverifiedMeds = (patient.medications || []).filter(m => m.verificationStatus === 'UNVERIFIED');
  const unverifiedAllergies = (patient.allergies || []).filter(a => a.verificationStatus === 'UNVERIFIED');
  const unverifiedConditions = (patient.conditions || []).filter(c => c.verificationStatus === 'UNVERIFIED');
  const totalUnverified = unverifiedLabs.length + unverifiedMeds.length + unverifiedAllergies.length + unverifiedConditions.length;

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
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

        {/* MedLens Central Traceability & Workflow Pipeline */}
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
                {/* LEFT PANEL (60–65%): Clinical Dashboard & Structured Records */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center justify-between pb-1">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      Clinical Dashboard & Structured Records
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                      Patient: {patient.fullName} (MRN: {patient.identifier})
                    </span>
                  </div>

                  {/* Potential Conflict Attention Card */}
                  <ConflictDetector
                    conflicts={patient.conflicts || []}
                    onResolveConflict={handleResolveConflict}
                  />

                  {/* AI Clinical Fact Summary */}
                  <AISummaryCard
                    patient={patient}
                    onRefreshSummary={handleRefreshSummary}
                  />

                  {/* Laboratory Results Table */}
                  <LabResultsTable
                    labResults={patient.labResults || []}
                    onVerify={handleVerify}
                    onSelectSnippet={(lab) => setSelectedEntity(lab)}
                    selectedLabId={selectedEntity?.id}
                    onOpenBulkVerify={() => setShowBulkVerifyModal(true)}
                  />

                  {/* Medications & Allergies */}
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

                {/* RIGHT PANEL (35–40%): Document Source / AI Inspector */}
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
                  {(patient.labResults || []).length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                      <EmptyState
                        icon={Activity}
                        title="No laboratory results available"
                        description="Upload a clinical laboratory report to extract structured test values, units, and source reference ranges."
                        onAction={() => setShowUploadModal(true)}
                        actionLabel="Upload Lab Report"
                      />
                    </div>
                  ) : (
                    <LabResultsTable
                      labResults={patient.labResults || []}
                      onVerify={handleVerify}
                      onSelectSnippet={(lab) => setSelectedEntity(lab)}
                      selectedLabId={selectedEntity?.id}
                      onOpenBulkVerify={() => setShowBulkVerifyModal(true)}
                    />
                  )}
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

            {/* Tab 3: Structured Records (Meds, Allergies, Conditions) */}
            {(activeTab === 'records' || activeTab === 'meds') && (
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

            {/* Tab 4: Conflicts */}
            {activeTab === 'conflicts' && (
              <div className="space-y-6">
                <ConflictDetector
                  conflicts={patient.conflicts || []}
                  onResolveConflict={handleResolveConflict}
                />
              </div>
            )}

            {/* Tab 5: Human Verification Queue */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-teal-600" />
                      Human Verification Queue for {patient.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review extracted clinical facts before permanent commitment to the patient record.
                    </p>
                  </div>
                  {totalUnverified > 0 && (
                    <button
                      onClick={() => setShowBulkVerifyModal(true)}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      Batch Verify High-Confidence (≥95%)
                    </button>
                  )}
                </div>

                {totalUnverified === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                    <EmptyState
                      icon={CheckCircle2}
                      title="No verification activity yet"
                      description="No information is currently waiting for human verification. All extracted facts have been confirmed."
                      onAction={() => setShowUploadModal(true)}
                      actionLabel="Upload New Document"
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {unverifiedLabs.length > 0 && (
                      <LabResultsTable
                        labResults={unverifiedLabs}
                        onVerify={handleVerify}
                        onSelectSnippet={(lab) => setSelectedEntity(lab)}
                        selectedLabId={selectedEntity?.id}
                      />
                    )}
                    {unverifiedMeds.length > 0 && (
                      <MedicationsList
                        medications={unverifiedMeds}
                        onVerify={handleVerify}
                        onSelectSnippet={(m) => setSelectedEntity(m)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 6: Source Evidence */}
            {activeTab === 'evidence' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-12">
                  <SideBySideViewer
                    documents={patient.documents || []}
                    selectedEntity={selectedEntity}
                    onVerify={handleVerify}
                  />
                </div>
              </div>
            )}

            {/* Tab 7: Documents */}
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

                {(patient.documents || []).length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No source documents available"
                    description="Upload clinical PDFs or laboratory reports to start automated AI extraction and verification."
                    onAction={() => setShowUploadModal(true)}
                    actionLabel="Upload Medical Document"
                  />
                ) : (
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
                )}
              </div>
            )}

            {/* Tab 8: Full Audit Trail */}
            {activeTab === 'audit' && (
              <div className="max-w-5xl mx-auto">
                <AuditTrailView auditLogs={patient.auditLogs || []} />
              </div>
            )}

            {/* Tab 9: Longitudinal Trends Visualizer */}
            {activeTab === 'trends' && (
              <div className="max-w-5xl mx-auto">
                {(patient.labResults || []).length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                    <EmptyState
                      icon={TrendingUp}
                      title="No laboratory trends available"
                      description="Multiple historical test results are required to plot longitudinal trends over time."
                      onAction={() => setShowUploadModal(true)}
                      actionLabel="Upload Diagnostic Report"
                    />
                  </div>
                ) : (
                  <LabTrendsChart labResults={patient.labResults || []} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <DocumentUploader
            patientId={patient.id}
            onUploadSuccess={() => {
              setShowUploadModal(false);
              fetchPatient();
            }}
            onClose={() => setShowUploadModal(false)}
          />
        </div>
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
    </AppShell>
  );
}
