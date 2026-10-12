import React from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  HelpCircle,
  CheckCircle2,
  Circle,
  FileText,
  AlertCircle,
  Target,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { TopicAnalytics } from '../types';

interface WhyModalProps {
  topic: TopicAnalytics | null;
  onClose: () => void;
  onInspectQuestion?: (questionId: string) => void;
  practicedQuestionIds?: Set<string>;
  onTogglePracticedQuestion?: (questionId: string) => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({
  topic,
  onClose,
  onInspectQuestion,
  practicedQuestionIds = new Set(),
  onTogglePracticedQuestion,
}) => {
  if (!topic) return null;

  const { scoreBreakdown } = topic;
  const isHighYield = topic.priorityTier === 'CRITICAL' || topic.priorityTier === 'HIGH';
  const totalQuestions = topic.historicalQuestions.length;
  const practicedCount = topic.historicalQuestions.filter((q) =>
    practicedQuestionIds.has(q.id)
  ).length;
  const practicePct =
    totalQuestions > 0 ? Math.round((practicedCount / totalQuestions) * 100) : 0;
  const isAllPracticed = totalQuestions > 0 && practicedCount === totalQuestions;

  // Determine badge styling by priority tier
  const tierColors = {
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
    HIGH: 'bg-blue-50 text-blue-700 border-blue-200',
    MEDIUM: 'bg-slate-100 text-slate-700 border-slate-200',
    LOW: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const factorBars = [
    {
      name: 'Marks Weightage',
      score: scoreBreakdown.marksWeightageScore,
      weight: '30%',
      desc: `Represents ${topic.examMarksPercentage}% of all exam marks across historical papers.`,
      icon: Award,
      color: 'bg-rose-500',
    },
    {
      name: 'Historical Frequency',
      score: scoreBreakdown.frequencyScore,
      weight: '25%',
      desc: `Appeared in ${topic.papersAppearedInCount} of ${topic.totalPapers} past papers (${topic.paperAppearanceRate}%).`,
      icon: Calendar,
      color: 'bg-indigo-600',
    },
    {
      name: 'Recent Exam Trend',
      score: scoreBreakdown.recentTrendScore,
      weight: '15%',
      desc: topic.trendReason,
      icon: TrendingUp,
      color: 'bg-emerald-500',
    },
    {
      name: 'Paper Consistency',
      score: scoreBreakdown.consistencyScore,
      weight: '15%',
      desc: `Tested regularly rather than a one-off surprise question.`,
      icon: Layers,
      color: 'bg-blue-500',
    },
    {
      name: 'Difficulty & Depth',
      score: scoreBreakdown.difficultyRelevanceScore,
      weight: '10%',
      desc: `Evaluation of concept complexity and multi-step marking requirements.`,
      icon: HelpCircle,
      color: 'bg-purple-500',
    },
    {
      name: 'Data Confidence',
      score: scoreBreakdown.analysisConfidence,
      weight: '5%',
      desc: `Accuracy of syllabus keyword mapping and text clarity.`,
      icon: CheckCircle2,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden border border-slate-200/90">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] sm:text-xs font-semibold text-indigo-300 uppercase tracking-wide truncate">
                Unit {topic.unitNumber} · {topic.unitTitle}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white mt-1 break-words">
              {topic.topicName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                  tierColors[topic.priorityTier]
                }`}
              >
                {topic.priorityTier} Priority
              </span>
              <span className="text-slate-300 text-[11px] sm:text-xs">
                Study Priority Score: <strong className="text-white text-xs sm:text-sm">{topic.studyPriorityScore}/100</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4 shrink-0 aspect-square" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Transparent Plain English Explanation */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 aspect-square" />
              <span>Why Should You Prioritize This Topic?</span>
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {topic.explanation}
            </p>
          </div>

          {/* Lecture Notes Coverage Status */}
          {topic.notesCoverage && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 aspect-square" />
                  <span>Notes Analysis & Study Material</span>
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                    topic.notesCoverage.coverageStatus === 'Comprehensive'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : topic.notesCoverage.coverageStatus === 'Moderate'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : topic.notesCoverage.coverageStatus === 'Sparse'
                      ? 'bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {topic.notesCoverage.coverageStatus} in Notes
                </span>
              </div>

              {topic.notesCoverage.pageReferences.length > 0 ? (
                <p className="text-xs text-slate-600">
                  Referenced on: <strong className="text-slate-900 font-semibold">{topic.notesCoverage.pageReferences.map((p) => `Page ${p}`).join(', ')}</strong>
                </p>
              ) : (
                <p className="text-xs text-rose-600 font-medium">
                  Not covered in current uploaded lecture notes.
                </p>
              )}

              {topic.notesCoverage.notesExcerpt && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 leading-relaxed">
                  "{topic.notesCoverage.notesExcerpt}"
                </div>
              )}

              {topic.notesCoverage.gapWarning && (
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start space-x-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5 aspect-square" />
                  <span>{topic.notesCoverage.gapWarning}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 pt-0.5">
                <strong>Action:</strong> {topic.notesCoverage.studyAction}
              </p>
            </div>
          )}

          {/* Mathematical & Empirical Score Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Observable Signals & Component Breakdown
              </h3>
              <span className="text-[11px] text-slate-500">
                Transparent Weighted Calculation
              </span>
            </div>

            <div className="space-y-3">
              {factorBars.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      <item.icon className="w-3.5 h-3.5 text-slate-500 shrink-0 aspect-square" />
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">({item.weight} weight)</span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      {item.score}<span className="text-slate-500 font-semibold text-xs">/100</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1.5">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Questions Responsible For This Recommendation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600 shrink-0 aspect-square" />
                <span>Actual Historical Exam Questions ({topic.historicalQuestions.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Total observed: {topic.totalMarks} marks
              </span>
            </div>

            {/* Practice progress bar for high-yield topics */}
            {isHighYield && totalQuestions > 0 && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                    <span>Practice Progress</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {practicedCount} of {totalQuestions} practiced ({practicePct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isAllPracticed
                        ? 'bg-emerald-500'
                        : topic.priorityTier === 'CRITICAL'
                        ? 'bg-rose-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${practicePct}%` }}
                  />
                </div>
              </div>
            )}

            {topic.historicalQuestions.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                No past questions found for this topic in the uploaded papers.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topic.historicalQuestions.map((q) => {
                  const isPracticed = practicedQuestionIds.has(q.id);

                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                        isPracticed
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-white border-slate-200/90 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">
                            {q.rawQuestionNumber}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600 font-medium">
                            {q.paperYear} {q.paperSession}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {q.marks !== null ? `${q.marks} Marks` : 'Marks N/A'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] border border-indigo-100">
                            {q.questionType}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                            {q.difficulty}
                          </span>
                          {onTogglePracticedQuestion && (
                            <button
                              type="button"
                              onClick={() => onTogglePracticedQuestion(q.id)}
                              className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center space-x-1 border transition-colors ${
                                isPracticed
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={isPracticed ? 'Question practiced' : 'Mark as practiced'}
                              aria-label={isPracticed ? 'Question practiced' : 'Mark as practiced'}
                            >
                              {isPracticed ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 aspect-square" />
                                  <span className="hidden sm:inline">Practiced</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="w-3 h-3 text-slate-400 shrink-0 aspect-square" />
                                  <span className="hidden sm:inline">Practice</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-800 leading-normal font-sans">
                        {q.cleanedText}
                      </p>
                      <div className="text-[11px] text-slate-600 flex items-center space-x-1">
                        <span>Reason:</span>
                        <span className="italic">{q.mappingReason}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
