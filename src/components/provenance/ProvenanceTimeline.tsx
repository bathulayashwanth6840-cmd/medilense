'use client';

import React from 'react';
import {
  FileText,
  User,
  Sparkles,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowDown,
  Layers,
} from 'lucide-react';
import { ProvenanceRecord } from '@/lib/services/provenance/ProvenanceTypes';

export interface ProvenanceTimelineProps {
  entityId: string;
  entityName?: string;
  currentValue?: any;
  history: ProvenanceRecord[];
  onViewSource?: (record: ProvenanceRecord) => void;
}

export const ProvenanceTimeline: React.FC<ProvenanceTimelineProps> = ({
  entityId,
  entityName = 'Clinical Fact',
  currentValue,
  history = [],
  onViewSource,
}) => {
  const sortedHistory = [...history].sort((a, b) => (a.version || 1) - (b.version || 1));

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT_EXTRACTED':
        return <FileText className="w-4 h-4 text-teal-400" />;
      case 'USER_PROVIDED':
        return <User className="w-4 h-4 text-emerald-400" />;
      case 'AI_GENERATED':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'USER_EDITED':
        return <Edit3 className="w-4 h-4 text-amber-400" />;
      case 'HUMAN_VERIFIED':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'DOCUMENT_EXTRACTED':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'USER_PROVIDED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'AI_GENERATED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'USER_EDITED':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'HUMAN_VERIFIED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            Immutable Provenance History Chain
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Traceable lineage for <strong className="text-slate-200">{entityName}</strong>
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
          {sortedHistory.length} {sortedHistory.length === 1 ? 'Version' : 'Versions'}
        </span>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {sortedHistory.map((item, idx) => {
          const isLatest = idx === sortedHistory.length - 1;
          const isFirst = idx === 0;

          return (
            <div key={item.id || idx} className="relative group">
              {/* Timeline Marker Dot */}
              <div
                className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border ${
                  isLatest
                    ? 'bg-teal-950 border-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                    : 'bg-slate-900 border-slate-700'
                }`}
              >
                {getEventIcon(item.provenanceType)}
              </div>

              {/* Event Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 group-hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      v{item.version || idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getBadgeStyle(
                        item.provenanceType
                      )}`}
                    >
                      {item.provenanceType}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Specific Event Details */}
                {item.provenanceType === 'DOCUMENT_EXTRACTED' && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-slate-300">
                      Source Document: <strong className="text-white">{item.documentName || 'Medical Report'}</strong> • Page {item.pageNumber || 1}
                    </p>
                    {item.sourceText && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-teal-200">
                        "{item.sourceText}"
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Method: <strong className="text-slate-300">{item.extractionMethod || 'OCR'}</strong></span>
                      <span>Confidence: <strong className="text-teal-400">{Math.round((item.confidence || 0.98) * 100)}%</strong></span>
                      {onViewSource && (
                        <button
                          onClick={() => onViewSource(item)}
                          className="text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2"
                        >
                          View Source
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {item.provenanceType === 'USER_PROVIDED' && (
                  <div className="space-y-1.5 mt-2 text-xs">
                    <p className="text-slate-300">
                      Provided by: <strong className="text-white">{item.userId || 'User'}</strong>
                    </p>
                    <p className="text-slate-400">Field: {item.field || 'Direct clinical entry'}</p>
                  </div>
                )}

                {item.provenanceType === 'USER_EDITED' && (
                  <div className="space-y-2 mt-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-2 rounded bg-slate-950 border border-slate-800 font-mono">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Previous Value</span>
                        <span className="text-slate-400">
                          {typeof item.previousValue === 'object' ? JSON.stringify(item.previousValue) : String(item.previousValue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-amber-400 block">Edited Value</span>
                        <span className="text-white font-bold">
                          {typeof item.newValue === 'object' ? JSON.stringify(item.newValue) : String(item.newValue)}
                        </span>
                      </div>
                    </div>
                    {item.reason && (
                      <p className="text-xs text-amber-300/90 italic">
                        Reason: "{item.reason}"
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500">Edited by: {item.userId || 'Clinical Reviewer'}</p>
                  </div>
                )}

                {item.provenanceType === 'HUMAN_VERIFIED' && (
                  <div className="space-y-1.5 mt-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified by {item.userId || 'Clinical Reviewer'}
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Confirmed clinical validity against original source evidence.
                    </p>
                  </div>
                )}

                {item.provenanceType === 'AI_GENERATED' && (
                  <div className="space-y-2 mt-2 text-xs">
                    <p className="text-slate-300">
                      Model: <strong className="text-purple-300">{item.model}</strong> ({item.provider})
                    </p>
                    {item.disclaimer && (
                      <div className="p-2 rounded bg-purple-950/30 border border-purple-500/20 text-purple-200 text-[11px] italic">
                        {item.disclaimer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
