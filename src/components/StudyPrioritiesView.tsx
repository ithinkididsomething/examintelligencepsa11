import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  HelpCircle,
  TrendingUp,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CheckCircle,
  CheckCircle2,
  Circle,
  BookOpen,
  ArrowRight,
  Target,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { Course, PriorityTier, TopicAnalytics } from '../types';

interface StudyPrioritiesViewProps {
  course: Course;
  analytics: TopicAnalytics[];
  onOpenWhyModal: (topic: TopicAnalytics) => void;
  onNavigateToRevision: () => void;
  onNavigateToAnalytics: () => void;
  onNavigateToFlashcards?: () => void;
  practicedQuestionIds: Set<string>;
  onTogglePracticedQuestion: (questionId: string) => void;
}

export const StudyPrioritiesView: React.FC<StudyPrioritiesViewProps> = ({
  course,
  analytics,
  onOpenWhyModal,
  onNavigateToRevision,
  onNavigateToAnalytics,
  onNavigateToFlashcards,
  practicedQuestionIds = new Set(),
  onTogglePracticedQuestion,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Filtered topics
  const filteredTopics = (analytics || []).filter((item) => {
    const matchesTier = selectedTier === 'ALL' || item.priorityTier === selectedTier;
    const matchesSearch =
      item.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unitTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  // Calculate summary statistics
  const totalObservedMarks = (analytics || []).reduce((acc, curr) => acc + (curr.totalMarks || 0), 0);
  const criticalCount = (analytics || []).filter((t) => t.priorityTier === 'CRITICAL').length;
  const highCount = (analytics || []).filter((t) => t.priorityTier === 'HIGH').length;

  // High-yield practice progress
  const highYieldQuestions = (analytics || [])
    .filter((t) => t.priorityTier === 'CRITICAL' || t.priorityTier === 'HIGH')
    .flatMap((t) => t.historicalQuestions || []);
  const totalHighYieldQCount = highYieldQuestions.length;
  const practicedHighYieldCount = highYieldQuestions.filter((q) =>
    practicedQuestionIds?.has(q.id)
  ).length;
  const overallPracticePct =
    totalHighYieldQCount > 0
      ? Math.round((practicedHighYieldCount / totalHighYieldQCount) * 100)
      : 0;

  const tierBadges: Record<PriorityTier, { badge: string; border: string; bg: string }> = {
    CRITICAL: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      border: 'border-rose-200/90 hover:border-rose-300',
      bg: 'bg-white',
    },
    HIGH: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      border: 'border-blue-200/90 hover:border-blue-300',
      bg: 'bg-white',
    },
    MEDIUM: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      border: 'border-slate-200 hover:border-slate-300',
      bg: 'bg-white',
    },
    LOW: {
      badge: 'bg-slate-50 text-slate-600 border-slate-200',
      border: 'border-slate-200 hover:border-slate-300',
      bg: 'bg-white',
    },
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/90 relative overflow-hidden">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 shrink-0 aspect-square" />
            <span>Deterministic Exam Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Study what actually matters before your exam.
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
            Historical papers and official syllabus cross-analyzed. Every study priority score is mathematically grounded in recurrence frequency, marks weightage, and trend data.
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-5">
            <button
              onClick={onNavigateToRevision}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
              title="Build Personalized Revision Plan"
            >
              <CalendarDays className="w-4 h-4 shrink-0 aspect-square" />
              <span className="hidden sm:inline">Build Personalized Revision Plan</span>
              <span className="sm:hidden">Revision Plan</span>
            </button>

            {onNavigateToFlashcards && (
              <button
                onClick={onNavigateToFlashcards}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
                title="Practice Flashcards"
              >
                <Layers className="w-4 h-4 shrink-0 aspect-square" />
                <span>Practice Flashcards</span>
              </button>
            )}

            <button
              onClick={onNavigateToAnalytics}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition-colors"
              title="Explore Historical Charts"
            >
              <BarChart3 className="w-4 h-4 shrink-0 aspect-square text-slate-600" />
              <span className="hidden sm:inline">Explore Charts & Trends</span>
              <span className="sm:hidden">Charts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Critical High-Yield Topics
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-rose-600">{criticalCount}</span>
            <span className="text-xs text-slate-500">of {analytics.length} topics</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Immediate must-study topics before anything else
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            High Priority Topics
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-blue-600">{highCount}</span>
            <span className="text-xs text-slate-500">regularly recurring</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            High payoff areas with consistent appearance
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            High-Yield Exam Practice
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{overallPracticePct}%</span>
            <span className="text-xs text-slate-500">
              {practicedHighYieldCount}/{totalHighYieldQCount} practiced
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${overallPracticePct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Top 3 Topics Weightage
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900">
              {Math.round(
                analytics.slice(0, 3).reduce((sum, t) => sum + t.examMarksPercentage, 0)
              )}%
            </span>
            <span className="text-xs text-slate-500">of exam marks</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Pareto principle: master these to secure high grades
          </p>
        </div>
      </div>

      {/* Main Study Priorities Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        {/* Controls: Title, Search & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 aspect-square" />
              <span>Ranked Study Priorities</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked from highest yield to lowest. Click "Why?" on any topic to inspect the mathematical breakdown and past questions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 aspect-square" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-56 text-slate-900"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-0.5 sm:space-x-1 bg-slate-100 p-0.5 sm:p-1 rounded-lg text-xs">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-medium text-[10px] sm:text-[11px] transition-colors ${
                    selectedTier === tier
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tier === 'CRITICAL' ? (
                    <>
                      <span className="hidden sm:inline">CRITICAL</span>
                      <span className="sm:hidden">CRIT</span>
                    </>
                  ) : tier === 'MEDIUM' ? (
                    <>
                      <span className="hidden sm:inline">MEDIUM</span>
                      <span className="sm:hidden">MED</span>
                    </>
                  ) : (
                    tier
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Cards List */}
        <div className="space-y-3">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No syllabus topics match your current search or priority filter.
            </div>
          ) : (
            filteredTopics.map((item, index) => {
              const style = tierBadges[item.priorityTier];
              const isExpanded = expandedTopicId === item.topicId;
              const isHighYield = item.priorityTier === 'CRITICAL' || item.priorityTier === 'HIGH';

              // Topic-specific practice progress
              const totalQuestions = item.historicalQuestions.length;
              const practicedCount = item.historicalQuestions.filter((q) =>
                practicedQuestionIds.has(q.id)
              ).length;
              const practicePct =
                totalQuestions > 0 ? Math.round((practicedCount / totalQuestions) * 100) : 0;
              const isAllPracticed = totalQuestions > 0 && practicedCount === totalQuestions;

              return (
                <div
                  key={item.topicId}
                  className={`border rounded-xl p-4 sm:p-5 transition-all bg-white ${style.border}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Rank, Topic Name, Unit, and Badges */}
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      {/* Rank Indicator */}
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">
                            Unit {item.unitNumber} · {item.unitTitle}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${style.badge}`}
                          >
                            {item.priorityTier}
                          </span>
                          {item.recentTrend === 'Increasing' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1 border border-emerald-200">
                              <TrendingUp className="w-3 h-3 shrink-0 aspect-square" />
                              <span>Increasing Trend</span>
                            </span>
                          )}
                          {isHighYield && isAllPracticed && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 aspect-square" />
                              <span>Mastered</span>
                            </span>
                          )}
                          {item.notesCoverage && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium border flex items-center gap-1 ${
                                item.notesCoverage.coverageStatus === 'Comprehensive'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.notesCoverage.coverageStatus === 'Moderate'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : item.notesCoverage.coverageStatus === 'Sparse'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                              title={item.notesCoverage.gapWarning || `Notes: ${item.notesCoverage.coverageStatus}`}
                            >
                              <BookOpen className="w-3 h-3 shrink-0 aspect-square text-indigo-500" />
                              <span>
                                Notes:{' '}
                                {item.notesCoverage.pageReferences.length > 0
                                  ? `p. ${item.notesCoverage.pageReferences.join(', ')}`
                                  : item.notesCoverage.coverageStatus}
                              </span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {item.topicName}
                        </h3>

                        {/* Plain English dynamic justification snippet */}
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 max-w-2xl">
                          {item.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Right: Score Gauge & "Why?" Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="block text-[10px] uppercase font-bold text-slate-400">
                            Priority Score
                          </span>
                          <span className="text-2xl font-black text-slate-900">
                            {item.studyPriorityScore}
                            <span className="text-xs font-normal text-slate-500">/100</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                          onClick={() => onOpenWhyModal(item)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
                          title={`Why is ${item.topicName} prioritized?`}
                          aria-label={`Why is ${item.topicName} prioritized?`}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-300 shrink-0 aspect-square" />
                          <span>Why?</span>
                        </button>

                        <button
                          onClick={() =>
                            setExpandedTopicId(isExpanded ? null : item.topicId)
                          }
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                          title="Preview questions"
                          aria-label="Toggle questions preview"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 shrink-0 aspect-square" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 shrink-0 aspect-square" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* VISUAL PROGRESS BAR FOR CRITICAL AND HIGH TOPICS */}
                  {isHighYield && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 bg-slate-50/70 rounded-xl p-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                            <Target
                              className={`w-3.5 h-3.5 shrink-0 aspect-square ${
                                isAllPracticed
                                  ? 'text-emerald-600'
                                  : item.priorityTier === 'CRITICAL'
                                  ? 'text-rose-500'
                                  : 'text-blue-500'
                              }`}
                            />
                            <span>Past Questions Practice Progress</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {item.priorityTier}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-700 text-xs">
                            <strong className="text-slate-900 font-bold">{practicedCount}</strong>{' '}
                            <span className="text-slate-500">of {totalQuestions} practiced</span>
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              isAllPracticed
                                ? 'bg-emerald-100 text-emerald-800'
                                : practicePct > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {practicePct}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Track & Fill */}
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isAllPracticed
                              ? 'bg-emerald-500'
                              : item.priorityTier === 'CRITICAL'
                              ? 'bg-gradient-to-r from-rose-500 to-indigo-500'
                              : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                          }`}
                          style={{ width: `${practicePct}%` }}
                        />
                      </div>

                      {/* Progress Status Footer */}
                      <div className="flex items-center justify-between mt-2 text-[11px]">
                        <span className="text-slate-500 font-medium">
                          {isAllPracticed
                            ? '🎉 All past questions for this high-yield topic have been practiced!'
                            : practicedCount === 0
                            ? 'Not started yet. Solve and mark questions below to track mastery.'
                            : `${totalQuestions - practicedCount} question${
                                totalQuestions - practicedCount > 1 ? 's' : ''
                              } remaining to complete.`}
                        </span>
                        {!isExpanded && totalQuestions > 0 && (
                          <button
                            onClick={() => setExpandedTopicId(item.topicId)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-[11px] inline-flex items-center gap-1"
                          >
                            <span>{practicedCount > 0 ? 'Practice Questions' : 'Start Practicing'}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 aspect-square" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Observable Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 shrink-0 aspect-square text-rose-500" />
                      <span>Marks Share:</span>
                      <strong className="text-slate-900 font-semibold">
                        {item.examMarksPercentage}% ({item.totalMarks}M)
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-500" />
                      <span>Paper Recurrence:</span>
                      <strong className="text-slate-900 font-semibold">
                        {item.papersAppearedInCount}/{item.totalPapers} papers ({item.paperAppearanceRate}%)
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Dominant Type:</span>
                      <strong className="text-slate-900 font-semibold">
                        {(Object.keys(item.questionTypeDistribution) as (keyof typeof item.questionTypeDistribution)[]).sort(
                          (a, b) =>
                            item.questionTypeDistribution[b] - item.questionTypeDistribution[a]
                        )[0] || 'Theory'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Avg Marks/Question:</span>
                      <strong className="text-slate-900 font-semibold">
                        {item.avgMarksPerQuestion} Marks
                      </strong>
                    </div>
                  </div>

                  {/* Expanded Questions Accordion */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                        <span>Past Exam Questions for {item.topicName}</span>
                        <span className="text-[11px] text-slate-500">
                          {practicedCount} of {item.historicalQuestions.length} marked practiced
                        </span>
                      </div>

                      {item.historicalQuestions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No direct questions found in currently analyzed papers.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {item.historicalQuestions.map((q) => {
                            const isPracticed = practicedQuestionIds.has(q.id);

                            return (
                              <div
                                key={q.id}
                                className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                                  isPracticed
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : 'bg-white border-slate-200 hover:border-indigo-400'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-900">
                                      {q.paperYear} {q.paperSession} · {q.rawQuestionNumber}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                      {q.marks !== null ? `${q.marks} Marks` : 'Marks N/A'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px]">
                                      {q.questionType}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                      {q.difficulty}
                                    </span>
                                  </div>

                                  {/* Practice Checkbox Button */}
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onTogglePracticedQuestion?.(q.id);
                                        if (!isPracticed && practicedCount + 1 === totalQuestions) {
                                          try {
                                            confetti({
                                              particleCount: 35,
                                              spread: 60,
                                              origin: { y: 0.7 },
                                            });
                                          } catch {
                                            // safe fallback
                                          }
                                        }
                                      }}
                                      className={`px-2 sm:px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center space-x-1.5 border ${
                                        isPracticed
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-300'
                                      }`}
                                      title={isPracticed ? 'Question practiced' : 'Mark as practiced'}
                                      aria-label={isPracticed ? 'Question practiced' : 'Mark as practiced'}
                                    >
                                      {isPracticed ? (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
                                          <span className="hidden sm:inline">Practiced</span>
                                        </>
                                      ) : (
                                        <>
                                          <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0 aspect-square" />
                                          <span className="hidden sm:inline">Practice</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-800 leading-relaxed font-sans">{q.cleanedText}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

