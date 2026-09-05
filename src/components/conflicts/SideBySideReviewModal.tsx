'use client';

import React, { useState } from 'react';
import {
  X,
  Columns3,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Conflict, ConflictSource } from '@/lib/services/conflicts/ConflictTypes';
import { formatDate } from '@/lib/utils/formatters';
import { OriginalSourceModal } from '@/components/provenance/OriginalSourceModal';

interface SideBySideReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: Conflict | any;
  onOpenResolve: (conflict: Conflict | any) => void;
}

export const SideBySideReviewModal: React.FC<SideBySideReviewModalProps> = ({
  isOpen,
  onClose,
  conflict,
  onOpenResolve,
}) => {
  const [selectedSourceDoc, setSelectedSourceDoc] = useState<ConflictSource | null>(null);

  if (!isOpen || !conflict) return null;

  const sourceA: ConflictSource = conflict.sourceA || {
    recordId: 'source_a',
    documentId: null,
    documentName: 'Patient Intake',
    pageNumber: 1,
    sourceText: 'Source A Text',
    value: 'Source A Value',
    field: 'Clinical Field',
    provenanceId: 'prov_a',
    timestamp: null,
  };

  const sourceB: ConflictSource = conflict.sourceB || {
    recordId: 'source_b',
    documentId: null,
    documentName: 'Medical Report',
    pageNumber: 1,
    sourceText: 'Source B Text',
    value: 'Source B Value',
    field: 'Clinical Field',
    provenanceId: 'prov_b',
    timestamp: null,
  };

  const type = conflict.type || conflict.conflictType || 'MEDICATION';
  const severity = conflict.severity || 'MEDIUM';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Columns3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Side-by-Side Source Comparison
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 uppercase">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 uppercase">
                    {severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trace both contradictory sources directly to original source documents and patient evidence.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description Warning Ribbon */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/60 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Potential Conflict Detected — Human Verification Required</span>
              <span>{conflict.description}</span>
            </div>
          </div>

          {/* Side-by-Side Dual Source Columns */}
          <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* Source A */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                      A
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Source A Record
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {sourceA.provenanceId}
                  </span>
                </div>

                <div className="space-y-3 mt-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Document / Origin</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      {sourceA.documentName || sourceA.documentId || 'Patient Intake Narrative'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Page Number</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sourceA.pageNumber ? `Page ${sourceA.pageNumber}` : 'Direct Submission'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Documented Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sourceA.timestamp ? formatDate(sourceA.timestamp) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Extracted Clinical Value</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm text-teal-600 dark:text-teal-400 mt-1">
                      {String(sourceA.value || sourceA.sourceText || '—')} {sourceA.unit || ''}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Verbatim OCR / Source Snippet</span>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 italic mt-1 leading-relaxed">
                      &ldquo;{sourceA.sourceText || String(sourceA.value)}&rdquo;
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSourceDoc(sourceA)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                View Original Document Evidence
              </button>
            </div>

            {/* Source B */}
            <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border-2 border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      B
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Source B Record
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {sourceB.provenanceId}
                  </span>
                </div>

                <div className="space-y-3 mt-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Document / Origin</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      {sourceB.documentName || sourceB.documentId || 'Clinical Report'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Page Number</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sourceB.pageNumber ? `Page ${sourceB.pageNumber}` : 'Report Document'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Documented Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {sourceB.timestamp ? formatDate(sourceB.timestamp) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Extracted Clinical Value</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                      {String(sourceB.value || sourceB.sourceText || '—')} {sourceB.unit || ''}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Verbatim OCR / Source Snippet</span>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 italic mt-1 leading-relaxed">
                      &ldquo;{sourceB.sourceText || String(sourceB.value)}&rdquo;
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSourceDoc(sourceB)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                View Original Document Evidence
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-[11px] text-slate-500">
              Only an authorized clinician or medical reviewer can resolve this conflict.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Close Comparison
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenResolve(conflict);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Proceed to Resolution
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Document Source Viewer Modal */}
      {selectedSourceDoc && (
        <OriginalSourceModal
          isOpen={!!selectedSourceDoc}
          onClose={() => setSelectedSourceDoc(null)}
          documentId={selectedSourceDoc.documentId || 'doc_intake'}
          documentName={selectedSourceDoc.documentName || 'Medical_Record.pdf'}
          pageNumber={selectedSourceDoc.pageNumber || 1}
          sourceText={selectedSourceDoc.sourceText || String(selectedSourceDoc.value)}
          boundingBox={selectedSourceDoc.boundingBox}
          entityName={selectedSourceDoc.field}
          entityValue={selectedSourceDoc.value as any}
          entityUnit={selectedSourceDoc.unit}
          confidence={0.98}
          extractionMethod="OCR"
        />
      )}
    </>
  );
};
