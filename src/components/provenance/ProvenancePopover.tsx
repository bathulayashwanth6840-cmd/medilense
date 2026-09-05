'use client';

import React, { useState } from 'react';
import {
  FileText,
  User,
  Sparkles,
  Edit3,
  ShieldCheck,
  ExternalLink,
  History,
  X,
  Clock,
  Layers,
} from 'lucide-react';
import { ProvenanceRecord, ProvenanceType } from '@/lib/services/provenance/ProvenanceTypes';
import { OriginalSourceModal } from './OriginalSourceModal';
import { ProvenanceTimeline } from './ProvenanceTimeline';

export interface ProvenancePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: string;
  entityName?: string;
  entityValue?: any;
  entityUnit?: string | null;
  referenceRangeText?: string | null;
  referenceStatus?: string | null;
  provenance?: ProvenanceRecord | null;
  history?: ProvenanceRecord[];
}

export const ProvenancePopover: React.FC<ProvenancePopoverProps> = ({
  isOpen,
  onClose,
  entityId = 'entity-1',
  entityName = 'Clinical Fact',
  entityValue,
  entityUnit,
  referenceRangeText,
  referenceStatus,
  provenance,
  history = [],
}) => {
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeSourceRecord, setActiveSourceRecord] = useState<ProvenanceRecord | null>(null);

  if (!isOpen) return null;

  const currentProv = provenance || (history.length > 0 ? history[history.length - 1] : null);
  const type: ProvenanceType = currentProv?.provenanceType || 'DOCUMENT_EXTRACTED';

  const handleOpenSource = (record?: ProvenanceRecord) => {
    setActiveSourceRecord(record || currentProv);
    setShowSourceModal(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {type === 'DOCUMENT_EXTRACTED' && <FileText className="w-4 h-4" />}
                {type === 'USER_PROVIDED' && <User className="w-4 h-4 text-emerald-400" />}
                {type === 'AI_GENERATED' && <Sparkles className="w-4 h-4 text-purple-400" />}
                {type === 'USER_EDITED' && <Edit3 className="w-4 h-4 text-amber-400" />}
                {type === 'HUMAN_VERIFIED' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Provenance Details</h3>
                <p className="text-[11px] text-slate-400">{entityName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-4 text-xs">
            {/* DOCUMENT EXTRACTED */}
            {type === 'DOCUMENT_EXTRACTED' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Source Document</span>
                    <span className="font-semibold text-white mt-0.5 block truncate">
                      {currentProv?.documentName || 'Lab Report Document'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Page Number</span>
                    <span className="font-semibold text-white mt-0.5 block">
                      Page {currentProv?.pageNumber || 1}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Extraction Method</span>
                    <span className="font-semibold text-teal-300 mt-0.5 block">
                      {currentProv?.extractionMethod || 'OCR'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Extraction Confidence</span>
                    <span className="font-semibold text-teal-400 mt-0.5 block">
                      {Math.round((currentProv?.confidence || 0.984) * 1000) / 10}%
                    </span>
                  </div>
                </div>

                {currentProv?.sourceText && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Original Source Text Evidence
                    </span>
                    <p className="font-mono text-xs text-teal-200 leading-relaxed whitespace-pre-wrap">
                      "{currentProv.sourceText}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* USER PROVIDED */}
            {type === 'USER_PROVIDED' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                  <span className="font-semibold block mb-0.5">Source: User Provided</span>
                  <span className="text-xs text-emerald-300/80">
                    Direct entry via structured patient intake form.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Provided By</span>
                    <span className="font-semibold text-white mt-0.5 block">
                      {currentProv?.userId || 'Patient/User'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Field</span>
                    <span className="font-semibold text-white mt-0.5 block">
                      {currentProv?.field || entityName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI GENERATED */}
            {type === 'AI_GENERATED' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/20 text-purple-200">
                  <span className="font-semibold block mb-0.5">Source: AI Generated</span>
                  <span className="text-xs text-purple-300/80">
                    Model: {currentProv?.model || 'Gemini 1.5 Flash'} ({currentProv?.provider || 'Google AI'})
                  </span>
                </div>
                {currentProv?.disclaimer && (
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 italic">
                    {currentProv.disclaimer}
                  </div>
                )}
              </div>
            )}

            {/* USER EDITED */}
            {type === 'USER_EDITED' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Previous Value</span>
                    <span className="text-slate-400 font-mono">
                      {typeof currentProv?.previousValue === 'object'
                        ? JSON.stringify(currentProv?.previousValue)
                        : String(currentProv?.previousValue || '—')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 uppercase block">Edited Value</span>
                    <span className="text-white font-bold font-mono">
                      {typeof currentProv?.newValue === 'object'
                        ? JSON.stringify(currentProv?.newValue)
                        : String(currentProv?.newValue || entityValue || '—')}
                    </span>
                  </div>
                </div>
                {currentProv?.reason && (
                  <p className="text-xs text-amber-300 italic">
                    Reason: "{currentProv.reason}"
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Edited by: <strong className="text-slate-200">{currentProv?.userId || 'Clinical Reviewer'}</strong>
                </p>
              </div>
            )}

            {/* HUMAN VERIFIED */}
            {type === 'HUMAN_VERIFIED' && (
              <div className="space-y-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Human Verified
                </div>
                <p className="text-xs text-emerald-200/80">
                  Verified by <strong className="text-white">{currentProv?.userId || 'Clinical Reviewer'}</strong> on{' '}
                  {new Date(currentProv?.timestamp || Date.now()).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <Clock className="w-3.5 h-3.5" />
              <span>Timestamp: {new Date(currentProv?.timestamp || Date.now()).toUTCString()}</span>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/70 gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              History ({history.length || 1})
            </button>

            {type === 'DOCUMENT_EXTRACTED' || currentProv?.documentId ? (
              <button
                onClick={() => handleOpenSource()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Original Source
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Original Source Modal */}
      {showSourceModal && (
        <OriginalSourceModal
          isOpen={showSourceModal}
          onClose={() => setShowSourceModal(false)}
          documentName={activeSourceRecord?.documentName || currentProv?.documentName || 'Medical Report Document'}
          documentId={activeSourceRecord?.documentId || currentProv?.documentId}
          pageNumber={activeSourceRecord?.pageNumber || currentProv?.pageNumber || 1}
          sourceText={activeSourceRecord?.sourceText || currentProv?.sourceText}
          entityName={entityName}
          entityValue={entityValue}
          entityUnit={entityUnit}
          referenceRangeText={referenceRangeText}
          referenceStatus={referenceStatus}
          confidence={activeSourceRecord?.confidence || currentProv?.confidence || 0.984}
          extractionMethod={activeSourceRecord?.extractionMethod || currentProv?.extractionMethod || 'OCR'}
          boundingBox={activeSourceRecord?.boundingBox || currentProv?.boundingBox}
        />
      )}

      {/* Embedded History Timeline Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <ProvenanceTimeline
              entityId={entityId}
              entityName={entityName}
              history={history.length > 0 ? history : currentProv ? [currentProv] : []}
              onViewSource={record => {
                setShowHistoryModal(false);
                handleOpenSource(record);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
