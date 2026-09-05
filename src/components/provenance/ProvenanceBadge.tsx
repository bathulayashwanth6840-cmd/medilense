'use client';

import React, { useState } from 'react';
import {
  FileText,
  User,
  Sparkles,
  Edit3,
  ShieldCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { ProvenanceRecord, ProvenanceType } from '@/lib/services/provenance/ProvenanceTypes';
import { ProvenancePopover } from './ProvenancePopover';

export interface ProvenanceBadgeProps {
  provenanceType?: ProvenanceType | string;
  provenanceId?: string | null;
  sourceDocumentName?: string | null;
  pageNumber?: number | null;
  confidence?: number | null;
  sourceText?: string | null;
  entityName?: string;
  entityValue?: any;
  entityUnit?: string | null;
  referenceRangeText?: string | null;
  referenceStatus?: string | null;
  documentId?: string | null;
  history?: ProvenanceRecord[];
  className?: string;
  compact?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenanceType = 'DOCUMENT_EXTRACTED',
  provenanceId,
  sourceDocumentName,
  pageNumber = 1,
  confidence = 0.984,
  sourceText,
  entityName,
  entityValue,
  entityUnit,
  referenceRangeText,
  referenceStatus,
  documentId,
  history = [],
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize type
  const type: ProvenanceType =
    (provenanceType as ProvenanceType) ||
    (history.length > 0 ? history[history.length - 1].provenanceType : 'DOCUMENT_EXTRACTED');

  const getBadgeContent = () => {
    switch (type) {
      case 'DOCUMENT_EXTRACTED':
        return {
          icon: <FileText className="w-3 h-3 text-teal-400" />,
          label: compact
            ? `Report • P.${pageNumber || 1}`
            : `Extracted from Report • Page ${pageNumber || 1}`,
          style:
            'bg-teal-500/10 text-teal-300 border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-400/50',
        };
      case 'USER_PROVIDED':
        return {
          icon: <User className="w-3 h-3 text-emerald-400" />,
          label: 'User Provided',
          style:
            'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50',
        };
      case 'AI_GENERATED':
        return {
          icon: <Sparkles className="w-3 h-3 text-purple-400" />,
          label: 'AI Generated',
          style:
            'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-400/50',
        };
      case 'USER_EDITED':
        return {
          icon: <Edit3 className="w-3 h-3 text-amber-400" />,
          label: 'User Edited',
          style:
            'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50',
        };
      case 'HUMAN_VERIFIED':
        return {
          icon: <ShieldCheck className="w-3 h-3 text-emerald-400" />,
          label: 'Verified',
          style:
            'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50',
        };
      default:
        return {
          icon: <Layers className="w-3 h-3 text-slate-400" />,
          label: 'Provenance',
          style:
            'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
        };
    }
  };

  const badge = getBadgeContent();

  const currentRecord: ProvenanceRecord = {
    id: provenanceId || 'prov_curr',
    provenanceId: provenanceId || 'prov_curr',
    entityId: entityName || 'entity',
    entityType: 'CLINICAL_RECORD',
    provenanceType: type,
    version: history.length || 1,
    documentId: documentId || null,
    documentName: sourceDocumentName || 'Source Clinical Report',
    pageNumber: pageNumber || 1,
    sourceText: sourceText || `${entityName}: ${entityValue || ''} ${entityUnit || ''}`,
    confidence: confidence || 0.984,
    extractionMethod: 'OCR',
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer shadow-sm ${badge.style} ${className}`}
        title="Click to view complete origin, source snippet, and provenance history"
      >
        {badge.icon}
        <span>{badge.label}</span>
      </button>

      {isOpen && (
        <ProvenancePopover
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          entityId={entityName || 'fact'}
          entityName={entityName}
          entityValue={entityValue}
          entityUnit={entityUnit}
          referenceRangeText={referenceRangeText}
          referenceStatus={referenceStatus}
          provenance={currentRecord}
          history={history.length > 0 ? history : [currentRecord]}
        />
      )}
    </>
  );
};
