import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  PieChart,
  HelpCircle,
  AlertCircle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Difficulty, ExtractedQuestion, QuestionType, TopicAnalytics } from '../types';

interface AnalyticsViewProps {
  analytics: TopicAnalytics[];
  questions: ExtractedQuestion[];
  allYears: number[];
  uniquePapersCount: number;
  onOpenWhyModal: (topic: TopicAnalytics) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  questions,
  allYears,
  uniquePapersCount,
  onOpenWhyModal,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    analytics.length > 0 ? analytics[0].topicId : ''
  );
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'trends' | 'types' | 'table'>('matrix');

  const selectedTopic = analytics.find((t) => t.topicId === selectedTopicId) || analytics[0];

  // Global question type totals
  const totalQuestions = questions.length;
  const questionTypeTotals: Record<QuestionType, number> = {
    Theory: 0,
    Numerical: 0,
    Derivation: 0,
    Definition: 0,
    Conceptual: 0,
    'Problem Solving': 0,
    Mixed: 0,
    Unknown: 0,
  };
  const difficultyTotals: Record<Difficulty, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  questions.forEach((q) => {
    if (q.reviewStatus !== 'Rejected') {
      questionTypeTotals[q.questionType] = (questionTypeTotals[q.questionType] || 0) + 1;
      difficultyTotals[q.difficulty] = (difficultyTotals[q.difficulty] || 0) + 1;
    }
  });

  const sortedYears = Array.from(new Set(allYears)).sort((a, b) => a - b);
  const hasEnoughYears = sortedYears.length >= 2 && uniquePapersCount >= 2;

  return (
    <div className="space-y-6">
      {/* Analytics Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('matrix')}
            title="Marks Weightage vs Frequency Matrix"
            aria-label="Marks Weightage vs Frequency Matrix"
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
              activeSubTab === 'matrix'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0 aspect-square" />
            <span className="hidden md:inline">Marks vs Frequency Matrix</span>
            <span className="hidden sm:inline md:hidden">Matrix</span>
          </button>
          <button
            onClick={() => setActiveSubTab('trends')}
            title="Yearly Trends & Trajectory"
            aria-label="Yearly Trends & Trajectory"
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
              activeSubTab === 'trends'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0 aspect-square" />
            <span className="hidden md:inline">Yearly Trends & Trajectory</span>
            <span className="hidden sm:inline md:hidden">Trends</span>
          </button>
          <button
            onClick={() => setActiveSubTab('types')}
            title="Question Types & Difficulty"
            aria-label="Question Types & Difficulty"
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
              activeSubTab === 'types'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 shrink-0 aspect-square" />
            <span className="hidden md:inline">Question Types & Difficulty</span>
            <span className="hidden sm:inline md:hidden">Types</span>
          </button>
          <button
            onClick={() => setActiveSubTab('table')}
            title="Master Analytics Table"
            aria-label="Master Analytics Table"
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0 ${
              activeSubTab === 'table'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0 aspect-square" />
            <span className="hidden md:inline">Master Analytics Table</span>
            <span className="hidden sm:inline md:hidden">Table</span>
          </button>
        </div>

        <div className="text-[11px] sm:text-xs text-slate-500 pr-1 sm:pr-2 hidden sm:block">
          {uniquePapersCount} papers · {sortedYears.join(', ')}
        </div>
      </div>

      {/* SUB-TAB 1: MARKS WEIGHTAGE VS FREQUENCY MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          {/* Important Principle Banner */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-indigo-600 shrink-0 aspect-square" />
              <span>Core Insight: Frequency vs. Marks Weightage Are Distinct</span>
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              A topic appearing 8 times as 2-mark definitions generates only 16 marks, while a topic appearing 4 times as 10-mark design questions generates 40 marks. Our model treats total exam marks as the dominant payoff signal so you prioritize what actually moves your score.
            </p>
          </div>

          {/* Visual Matrix Comparison */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0 aspect-square" />
              <span>Topic Weightage Comparison (Total Marks vs. Questions Asked)</span>
            </h3>

            <div className="space-y-3 pt-2">
              {analytics.map((topic) => {
                const maxMarks = Math.max(...analytics.map((t) => t.totalMarks), 1);
                const maxCount = Math.max(...analytics.map((t) => t.appearanceCount), 1);
                const marksRatio = Math.round((topic.totalMarks / maxMarks) * 100);
                const countRatio = Math.round((topic.appearanceCount / maxCount) * 100);

                return (
                  <div
                    key={topic.topicId}
                    className="p-3.5 rounded-xl border border-slate-200/90 hover:border-indigo-300 bg-white transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Unit {topic.unitNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {topic.topicName}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-rose-600 font-bold">
                          {topic.totalMarks} Marks ({topic.examMarksPercentage}% total)
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-indigo-600 font-bold">
                          {topic.appearanceCount} Questions ({topic.paperAppearanceRate}% papers)
                        </span>
                        <button
                          onClick={() => onOpenWhyModal(topic)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] shadow-xs"
                        >
                          Why?
                        </button>
                      </div>
                    </div>

                    {/* Comparative Dual Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {/* Bar 1: Marks Share */}
                      <div>
                        <div className="flex justify-between text-slate-600 mb-0.5">
                          <span>Marks Weightage:</span>
                          <span className="font-semibold text-rose-600">{topic.totalMarks} Marks</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all"
                            style={{ width: `${marksRatio}%` }}
                          />
                        </div>
                      </div>

                      {/* Bar 2: Recurrence Frequency */}
                      <div>
                        <div className="flex justify-between text-slate-600 mb-0.5">
                          <span>Paper Recurrence:</span>
                          <span className="font-semibold text-indigo-600">
                            {topic.papersAppearedInCount} of {topic.totalPapers} Papers
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${countRatio}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: YEARLY TRENDS & TRAJECTORY */}
      {activeSubTab === 'trends' && (
        <div className="space-y-6">
          {!hasEnoughYears ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-indigo-600 mx-auto shrink-0 aspect-square" />
              <h3 className="font-bold text-slate-900 text-sm">
                Not enough historical data to determine a reliable trend.
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Only {sortedYears.length} exam year is present. To observe increasing or decreasing momentum across sessions, upload papers from at least two distinct examination years.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 aspect-square" />
                    <span>Year-by-Year Appearance Progression</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tracks how many questions and total marks appeared in each exam year (Year → Topic → Questions → Marks).
                  </p>
                </div>
              </div>

              {/* Yearly Topic Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Syllabus Topic</th>
                      <th className="py-2.5 px-3 font-semibold">Trend</th>
                      {sortedYears.map((yr) => (
                        <th key={yr} className="py-2.5 px-3 font-semibold text-center">
                          {yr} Exam
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-semibold text-right">Total Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.map((t) => {
                      const trendColors = {
                        Increasing: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                        Stable: 'bg-blue-50 text-blue-700 border border-blue-200',
                        Decreasing: 'bg-rose-50 text-rose-700 border border-rose-200',
                        Irregular: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                        'Insufficient Data': 'bg-slate-100 text-slate-700 border border-slate-200',
                      };

                      return (
                        <tr key={t.topicId} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">
                              {t.topicName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Unit {t.unitNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                trendColors[t.recentTrend]
                              }`}
                            >
                              {t.recentTrend}
                            </span>
                          </td>
                          {sortedYears.map((yr) => {
                            const yrQuestions = t.historicalQuestions.filter(
                              (q) => q.paperYear === yr
                            );
                            const yrMarks = yrQuestions.reduce(
                              (sum, q) => sum + (q.marks || 0),
                              0
                            );

                            return (
                              <td key={yr} className="py-3 px-3 text-center">
                                {yrQuestions.length > 0 ? (
                                  <div className="inline-block p-1 px-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-slate-900">
                                    <div className="font-bold text-[11px] text-indigo-900">
                                      {yrMarks}M
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {yrQuestions.length} Qs
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-right font-black text-slate-900">
                            {t.totalMarks}M
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: QUESTION TYPES & DIFFICULTY */}
      {activeSubTab === 'types' && (
        <div className="space-y-6">
          {/* Top Level Global Distribution */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Question Types Distribution */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600 shrink-0 aspect-square" />
                <span>Overall Question Type Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">
                Understand whether this subject requires derivation rigor, numerical drills, or theoretical diagrams.
              </p>

              <div className="space-y-2.5 pt-2">
                {(Object.keys(questionTypeTotals) as QuestionType[])
                  .filter((qt) => questionTypeTotals[qt] > 0)
                  .map((qt) => {
                    const count = questionTypeTotals[qt];
                    const pct = Math.round((count / totalQuestions) * 100);

                    return (
                      <div key={qt} className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-800">{qt}</span>
                          <span className="font-bold text-slate-900">
                            {count} Qs ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-500 shrink-0 aspect-square" />
                <span>Exam Difficulty Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">
                Estimated from mark weightage, multi-clause depth, and mathematical steps required.
              </p>

              <div className="space-y-2.5 pt-2">
                {(['Hard', 'Medium', 'Easy'] as Difficulty[]).map((diff) => {
                  const count = difficultyTotals[diff];
                  const pct = Math.round((count / totalQuestions) * 100);
                  const colors: Record<Difficulty, string> = {
                    Hard: 'bg-rose-500',
                    Medium: 'bg-blue-500',
                    Easy: 'bg-emerald-500',
                  };

                  return (
                    <div key={diff} className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-800">{diff}</span>
                        <span className="font-bold text-slate-900">
                          {count} Qs ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[diff]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Individual Topic Pattern Inspector */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Inspect Pattern for a Specific Topic
                </h3>
                <p className="text-xs text-slate-500">
                  See what types of questions appear most frequently for each topic.
                </p>
              </div>

              <div>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {analytics.map((t) => (
                    <option key={t.topicId} value={t.topicId}>
                      Unit {t.unitNumber}: {t.topicName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTopic && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">
                    Question Types in {selectedTopic.topicName}:
                  </h4>
                  <div className="space-y-1.5">
                    {(Object.keys(selectedTopic.questionTypeDistribution) as QuestionType[])
                      .filter((qt) => selectedTopic.questionTypeDistribution[qt] > 0)
                      .map((qt) => (
                        <div key={qt} className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-700">{qt}</span>
                          <span className="font-bold text-slate-900">
                            {selectedTopic.questionTypeDistribution[qt]}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">
                    Difficulty Breakdown:
                  </h4>
                  <div className="space-y-1.5">
                    {(['Hard', 'Medium', 'Easy'] as Difficulty[]).map((d) => (
                      <div key={d} className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-700">{d}</span>
                        <span className="font-bold text-slate-900">
                          {selectedTopic.difficultyDistribution[d]}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MASTER ANALYTICS TABLE */}
      {activeSubTab === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Master Topic Analytics Table
            </h3>
            <span className="text-xs text-slate-500">
              {analytics.length} syllabus topics evaluated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Topic</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Total Marks</th>
                  <th className="py-2.5 px-3">% Marks</th>
                  <th className="py-2.5 px-3">Papers Appeared</th>
                  <th className="py-2.5 px-3">Avg Marks/Q</th>
                  <th className="py-2.5 px-3">Trend</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.map((t) => (
                  <tr key={t.topicId} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{t.topicName}</span>
                      <span className="text-[10px] text-slate-500">Unit {t.unitNumber}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{t.studyPriorityScore}/100</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-rose-600">{t.totalMarks}M</td>
                    <td className="py-3 px-3">{t.examMarksPercentage}%</td>
                    <td className="py-3 px-3">
                      {t.papersAppearedInCount}/{t.totalPapers} ({t.paperAppearanceRate}%)
                    </td>
                    <td className="py-3 px-3">{t.avgMarksPerQuestion}M</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium">{t.recentTrend}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenWhyModal(t)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] inline-flex items-center space-x-1 shadow-xs"
                        title={`Why is ${t.topicName} prioritized?`}
                        aria-label={`Why is ${t.topicName} prioritized?`}
                      >
                        <HelpCircle className="w-3 h-3 text-indigo-300 shrink-0 aspect-square" />
                        <span className="hidden sm:inline">Why?</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
