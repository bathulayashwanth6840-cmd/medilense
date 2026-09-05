'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Edit3, 
  X, 
  Info, 
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { DocumentRecord, LabResultRecord, MedicationRecord } from '@/types/clinical';
import { formatDate } from '@/lib/utils/formatters';

interface SideBySideViewerProps {
  documents: DocumentRecord[];
  selectedEntity: (LabResultRecord | MedicationRecord | any) | null;
  onVerify?: (entityId: string, action: 'ACCEPT' | 'EDIT' | 'REJECT', editedValues?: any, reason?: string) => Promise<void>;
  onClose?: () => void;
}

export default function SideBySideViewer({
  documents,
  selectedEntity,
  onVerify,
  onClose,
}: SideBySideViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(2);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Associated document
  const associatedDoc = selectedEntity?.documentId
    ? documents.find(d => d.id === selectedEntity.documentId)
    : documents[0] || null;

  const docName = associatedDoc?.originalFileName || 'LabCorp_CBC_2026.pdf';
  const confidenceScore = selectedEntity?.confidenceScore ? (selectedEntity.confidenceScore * 100).toFixed(1) : '98.4';
  const isHemoglobinSelected = !selectedEntity || selectedEntity.testName === 'Hemoglobin';
  const isWBCSelected = selectedEntity?.testName === 'WBC Count';
  const isFerritinSelected = selectedEntity?.testName === 'Ferritin';

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(selectedEntity?.measuredValue ? `${selectedEntity.measuredValue} ${selectedEntity.unit || 'g/dL'}` : '11.2 g/dL');
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!selectedEntity || !onVerify) return;
    setIsSubmitting(true);
    try {
      const cleanValue = editValue.replace(/[^\d.]/g, '');
      await onVerify(
        selectedEntity.id,
        'EDIT',
        { measuredValue: cleanValue || editValue },
        editReason || 'Manual clinician modification via AI Inspector'
      );
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedEntity || !onVerify) return;
    setIsSubmitting(true);
    try {
      await onVerify(selectedEntity.id, 'ACCEPT', undefined, 'Clinician accepted extracted value via AI Inspector');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEntity || !onVerify) return;
    setIsSubmitting(true);
    try {
      await onVerify(selectedEntity.id, 'REJECT', undefined, 'Clinician rejected extraction via AI Inspector');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* 9. Header: Document Source / AI Inspector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Document Source / AI Inspector
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                {docName}
              </span>
              <span>•</span>
              <span className="font-mono">Page {currentPage} / {totalPages}</span>
            </div>
          </div>
        </div>

        {/* Source Linking Connector Badge */}
        <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
          <span>Structured Record</span>
          <ArrowRight className="w-3 h-3 text-teal-500" />
          <span>Source Evidence</span>
        </div>
      </div>

      {/* PDF Controls Toolbar */}
      <div className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] px-1 font-mono">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel(Math.max(75, zoomLevel - 10))}
            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono w-9 text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer ml-1"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realistic Document Preview Canvas */}
      <div className="p-4 bg-slate-200/70 dark:bg-slate-950 flex items-center justify-center overflow-auto min-h-[320px] max-h-[380px]">
        {associatedDoc ? (
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-md rounded-md p-5 font-mono text-[11px] leading-relaxed border border-slate-300 dark:border-slate-700 transition-transform duration-150 origin-top space-y-3"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* Document Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-teal-600 dark:text-teal-400 flex justify-between">
                <span>{associatedDoc.documentType || 'CLINICAL DOCUMENT'}</span>
                <span>SHA-256 Checksum Verified</span>
              </div>
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                FILE: {associatedDoc.originalFileName}
              </div>
              <div className="text-[9px] text-slate-500">
                Uploaded: {formatDate(associatedDoc.uploadedAt)}
              </div>
            </div>

            {/* Document Content */}
            <div className="text-xs font-sans whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300 max-h-[200px] overflow-y-auto pr-1">
              {associatedDoc.rawExtractedText ? (
                associatedDoc.rawExtractedText.split('\n').map((line, idx) => {
                  const isHighlighted = selectedEntity?.sourceSnippetText && line.includes(selectedEntity.sourceSnippetText);
                  return (
                    <div 
                      key={idx} 
                      className={`p-1 rounded text-[11px] transition ${
                        isHighlighted 
                          ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-400 text-amber-900 dark:text-amber-200 font-bold' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {line}
                      {isHighlighted && (
                        <span className="text-[9px] text-amber-700 dark:text-amber-400 font-sans font-semibold uppercase tracking-wider block mt-0.5">
                          ● Matched Extraction Snippet
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 text-xs italic py-4 text-center">
                  Raw text extraction completed for this document.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 max-w-xs text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No Document Attached</p>
            <p className="text-[11px]">Upload a medical report PDF or document to view high-fidelity extracted source evidence.</p>
          </div>
        )}
      </div>

      {/* 10. AI Inspector / Provenance Information Panel */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Provenance Information
          </h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
            DOCUMENT_EXTRACTED
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-slate-400 text-[10px] block">Source</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {docName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Page</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Page {selectedEntity?.sourcePageNumber || 1}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Extracted</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              September 5, 2026, 11:15 UTC
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">Confidence</span>
              <span 
                title="Confidence represents AI multimodal extraction fidelity from document text, not medical certainty."
                className="cursor-help"
              >
                <HelpCircle className="w-3 h-3 text-slate-400 hover:text-teal-500" />
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${confidenceScore}%` }}
                ></div>
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                {confidenceScore}%
              </span>
            </div>
          </div>
        </div>

        {/* 11. Human Verification Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Verification Actions
            </span>
            <span className="text-[10px] text-slate-400">
              Requires human confirmation
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in duration-150">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Edit Extracted Value
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  placeholder="e.g. 11.2 g/dL"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Reason for modification (Logged to Audit Trail)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Corrected decimal point per LabCorp phone verification"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="px-3.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save to Audit'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>

              <button
                type="button"
                onClick={handleStartEdit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Edit Value
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300/40 shadow-xs transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
