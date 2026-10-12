import React, { useState } from 'react';
import { Sparkles, Loader2, X, FileText, Check } from 'lucide-react';

interface AnalyzeConfirmModalProps {
  isOpen: boolean;
  documentNames: string[];
  isAnalyzing: boolean;
  progressMessage: string;
  progress?: { label: string; current: number; total: number; questions: number } | null;
  onConfirm: (alwaysForFuture: boolean) => void;
  onSkip: () => void;
}

/**
 * Per-document confirmation shown after an upload. The user decides whether the
 * app should automatically generate notes, flashcards, questions, and a cheat
 * sheet for the uploaded document(s) using Gemini. A checkbox lets them opt out
 * of the prompt for all future uploads.
 */
export const AnalyzeConfirmModal: React.FC<AnalyzeConfirmModalProps> = ({
  isOpen,
  documentNames,
  isAnalyzing,
  progressMessage,
  progress,
  onConfirm,
  onSkip,
}) => {
  const [always, setAlways] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200/90">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-200 shrink-0" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Generate Study Material?</h2>
              <p className="text-[11px] text-indigo-200/90">Autonomous Gemini document analysis</p>
            </div>
          </div>
          {!isAnalyzing && (
            <button
              onClick={onSkip}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5 shrink-0" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4 text-xs">
          {isAnalyzing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                <span>{progress?.label || progressMessage || 'Analyzing document...'}</span>
              </div>

              {progress && progress.total > 0 && (
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((progress.current + 1) / progress.total) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Step {Math.min(progress.current + 1, progress.total)} of {progress.total}
                    </span>
                    <span className="font-semibold text-indigo-700">
                      {progress.questions} question{progress.questions === 1 ? '' : 's'} generated
                    </span>
                  </div>
                </div>
              )}

              <p className="text-slate-500 leading-relaxed">
                Detecting the subject and generating notes, flashcards, a full set of practice
                questions, and a revision cheat sheet. This may take a moment.
              </p>
            </div>
          ) : (
            <>
              <p className="text-slate-700 leading-relaxed">
                The following {documentNames.length === 1 ? 'document was' : 'documents were'}{' '}
                uploaded. Would you like Gemini to automatically generate a study summary, notes,
                flashcards, practice questions, and a cheat sheet?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                {documentNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                <input
                  type="checkbox"
                  checked={always}
                  onChange={(e) => setAlways(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Always do this automatically for future uploads</span>
              </label>
            </>
          )}
        </div>

        {!isAnalyzing && (
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={onSkip}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
            >
              Not now
            </button>
            <button
              onClick={() => onConfirm(always)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Generate Everything</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
