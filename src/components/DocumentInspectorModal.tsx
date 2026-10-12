import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, RefreshCw, BookOpen } from 'lucide-react';
import { ExamDocument } from '../types';

interface DocumentInspectorModalProps {
  document: ExamDocument | null;
  onClose: () => void;
  onSaveRawText: (docId: string, updatedText: string) => void;
}

export const DocumentInspectorModal: React.FC<DocumentInspectorModalProps> = ({
  document,
  onClose,
  onSaveRawText,
}) => {
  if (!document) return null;

  const isNotes = document.category === 'lecture_notes' || document.notesAnalysis !== undefined;
  const [text, setText] = useState<string>(document.rawText);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (document) {
      setText(document.rawText);
    }
  }, [document.id, document.rawText]);

  const handleSave = () => {
    onSaveRawText(document.id, text);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden border border-slate-200/90">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {isNotes ? (
              <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 aspect-square" />
            ) : (
              <FileText className="w-5 h-5 text-indigo-400 shrink-0 aspect-square" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">
                  {isNotes ? 'Lecture Notes & Study Material Inspector' : 'Document OCR & Text Inspector'}
                </h2>
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                  isNotes ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {isNotes ? 'Lecture Notes' : 'Exam Paper'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {document.filename} · {document.year} {document.session}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 shrink-0 aspect-square" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {document.warnings.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 aspect-square" />
              <div>
                <p className="font-semibold">OCR Quality Notice:</p>
                <p className="mt-0.5">{document.warnings[0]}</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="raw-extracted-text" className="text-xs font-bold text-slate-800">
                {isNotes ? 'Lecture Notes Text with Page Markers (Editable)' : 'Extracted Raw Text (Editable)'}
              </label>
              <span className="text-[11px] text-slate-500">
                {isNotes
                  ? 'Use --- Page X --- delimiters to indicate page breaks for accurate citations.'
                  : 'You can fix typos or OCR blur here directly.'}
              </span>
            </div>
            <textarea
              id="raw-extracted-text"
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-900 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isNotes ? (
              <span>
                Coverage:{' '}
                <strong className="text-slate-800">
                  {document.notesAnalysis?.overallCoverageScore || 78}%
                </strong>{' '}
                across{' '}
                <strong className="text-slate-800">
                  {document.notesAnalysis?.totalPages || 14} pages
                </strong>
              </span>
            ) : (
              <span>{document.extractedQuestionsCount} questions currently parsed</span>
            )}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 aspect-square" />
                  <span>{isNotes ? 'Re-analyzed & Saved!' : 'Reparsed & Saved!'}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0 aspect-square" />
                  <span>{isNotes ? 'Save & Re-analyze Notes' : 'Save & Re-detect Questions'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
