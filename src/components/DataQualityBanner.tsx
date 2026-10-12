import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  HelpCircle,
  Hash,
  Database,
} from 'lucide-react';
import { DataQualityReport } from '../types';

interface DataQualityBannerProps {
  report: DataQualityReport;
  onNavigateToReview: () => void;
  onNavigateToDocuments?: () => void;
}

export const DataQualityBanner: React.FC<DataQualityBannerProps> = ({
  report,
  onNavigateToReview,
  onNavigateToDocuments,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isGoodQuality = report.overallConfidenceScore >= 80;
  const isModerate = report.overallConfidenceScore >= 60 && report.overallConfidenceScore < 80;

  return (
    <div className="bg-white border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {/* Left: Overall Quality Indicator */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-semibold text-[11px] shrink-0 ${
                isGoodQuality
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : isModerate
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
              }`}
            >
              {isGoodQuality ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-blue-600 shrink-0 aspect-square" />
              )}
              <span>
                <span className="hidden sm:inline">Data Integrity: </span>
                {report.overallConfidenceScore}%
              </span>
            </div>

            <span className="text-slate-300 hidden sm:inline">|</span>

            {/* Knowledge Base Metrics */}
            <div className="flex items-center gap-2 sm:gap-3 text-slate-600 flex-wrap">
              <button
                onClick={onNavigateToDocuments}
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                title={`${report.totalDocuments} Indexed Documents in Knowledge Base`}
              >
                <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0 aspect-square" />
                <span>
                  <strong className="text-slate-800 font-semibold">{report.totalDocuments}</strong>
                  <span className="hidden sm:inline"> Source Files</span>
                </span>
              </button>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 shrink-0" title={`${report.totalQuestions} Questions Extracted`}>
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0 aspect-square" />
                <span>
                  <strong className="text-slate-800 font-semibold">{report.totalQuestions}</strong>
                  <span className="hidden sm:inline"> Questions</span>
                </span>
              </span>
              {report.yearsSpan > 0 && (
                <div className="hidden xs:inline-flex items-center gap-2 text-slate-600 shrink-0">
                  <span className="text-slate-300">·</span>
                  <span title={`${report.yearsSpan} Years Covered`}>
                    <strong className="text-slate-800 font-semibold">{report.yearsSpan}</strong>
                    <span className="hidden sm:inline"> Exam Cycles</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Review Status Flags & Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {report.needsReviewQuestionsCount > 0 ? (
              <button
                onClick={onNavigateToReview}
                title={`${report.needsReviewQuestionsCount} questions need review`}
                aria-label={`${report.needsReviewQuestionsCount} questions need review`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 rounded-md font-semibold transition-colors text-[11px] shrink-0 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 aspect-square" />
                <span>
                  {report.needsReviewQuestionsCount}
                  <span className="hidden sm:inline"> questions for review</span>
                </span>
              </button>
            ) : (
              <span className="text-emerald-700 inline-flex items-center gap-1 text-[11px] font-medium shrink-0">
                <span className="hidden sm:inline">All syllabus mappings validated</span>
                <span className="sm:hidden">Validated</span>
              </span>
            )}

            {report.warnings.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 px-1 py-0.5 rounded text-[11px] shrink-0 cursor-pointer"
              >
                <span>{report.warnings.length} notice</span>
                {isExpanded ? <ChevronUp className="w-3 h-3 shrink-0 aspect-square" /> : <ChevronDown className="w-3 h-3 shrink-0 aspect-square" />}
              </button>
            )}
          </div>
        </div>

        {/* Expandable Warnings & Audit Drawer */}
        {isExpanded && report.warnings.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-200 grid sm:grid-cols-2 gap-2 text-xs">
            {report.warnings.map((warn, index) => (
              <div
                key={index}
                className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700"
              >
                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 aspect-square" />
                <div>
                  <p className="font-semibold text-slate-900">{warn}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data is strictly grounded in the uploaded files. No hallucinated values or phantom questions.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
