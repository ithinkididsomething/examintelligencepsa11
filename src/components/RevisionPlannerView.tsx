import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  Download,
  Calendar,
  Layers,
  HelpCircle,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';
import { RevisionPlan, RevisionSession } from '../types';

interface RevisionPlannerViewProps {
  plan: RevisionPlan;
  onToggleSession: (sessionId: string) => void;
  onRegeneratePlan: () => void;
  examDate: string;
  setExamDate: (d: string) => void;
  dailyHours: number;
  setDailyHours: (h: number) => void;
}

export const RevisionPlannerView: React.FC<RevisionPlannerViewProps> = ({
  plan,
  onToggleSession,
  onRegeneratePlan,
  examDate,
  setExamDate,
  dailyHours,
  setDailyHours,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Filter sessions by selected sessionType
  const filteredSessions =
    selectedTypeFilter === 'ALL'
      ? plan.sessions
      : plan.sessions.filter((s) => s.sessionType === selectedTypeFilter);

  // Group sessions by day
  const sessionsByDay = new Map<number, RevisionSession[]>();
  filteredSessions.forEach((s) => {
    const list = sessionsByDay.get(s.dayNumber) || [];
    list.push(s);
    sessionsByDay.set(s.dayNumber, list);
  });

  const completedCount = plan.sessions.filter((s) => s.completed).length;
  const progressPct =
    plan.totalSessions > 0 ? Math.round((completedCount / plan.totalSessions) * 100) : 0;

  const sessionTypeBadges: Record<RevisionSession['sessionType'], { bg: string; text: string; border: string }> = {
    Learn: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    Practice: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    Revision: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Past-paper practice': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'Final review': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0 aspect-square" />
              <span>Personalized Adaptive Study Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Personalized Exam Revision Plan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Optimized {plan.totalDays}-day study itinerary balancing high-weightage topics, self-reported weak areas, and past-paper simulation drills.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={onRegeneratePlan}
              title="Recalculate Schedule"
              aria-label="Recalculate Schedule"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0 aspect-square" />
              <span className="hidden sm:inline">Recalculate Schedule</span>
            </button>

            <button
              onClick={handlePrint}
              title="Print / Export Study Plan"
              aria-label="Print / Export Study Plan"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 shrink-0 aspect-square" />
              <span className="hidden sm:inline">Print / Export</span>
            </button>
          </div>
        </div>

        {/* Inputs Strip: Exam Date & Daily Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label htmlFor="revision-exam-date" className="font-bold text-slate-600 block text-[10px] uppercase mb-1">
              Target Exam Date:
            </label>
            <input
              id="revision-exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label htmlFor="revision-study-hours" className="font-bold text-slate-600 block text-[10px] uppercase mb-1">
              Available Daily Hours:
            </label>
            <select
              id="revision-study-hours"
              value={dailyHours}
              onChange={(e) => setDailyHours(parseFloat(e.target.value))}
              className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            >
              <option value={2}>2 Hours / Day</option>
              <option value={3}>3 Hours / Day</option>
              <option value={4}>4 Hours / Day</option>
              <option value={6}>6 Hours / Day</option>
              <option value={8}>8 Hours / Day</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase">
              <span>Overall Progress:</span>
              <span className="text-indigo-600 font-bold">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-1">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500">
              {completedCount} of {plan.totalSessions} sessions completed
            </span>
          </div>
        </div>

        {/* Session Type Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Filter Session Focus:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Sessions' },
              { id: 'Learn', label: 'Learn' },
              { id: 'Practice', label: 'Practice' },
              { id: 'Past-paper practice', label: 'Past-Paper Drills' },
              { id: 'Final review', label: 'Final Review' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTypeFilter(t.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors text-[11px] ${
                  selectedTypeFilter === t.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day-by-Day Timeline */}
      <div className="space-y-4">
        {sessionsByDay.size === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No revision sessions match the selected filter. Try selecting "All Sessions".
          </div>
        ) : (
          Array.from(sessionsByDay.keys())
          .sort((a, b) => a - b)
          .map((dayNum) => {
            const daySessions = sessionsByDay.get(dayNum) || [];
            const dateStr = daySessions[0]?.dateStr || `Day ${dayNum}`;
            const isAllCompleted = daySessions.every((s) => s.completed);

            return (
              <div
                key={dayNum}
                className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs"
              >
                {/* Day Header */}
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-indigo-300 text-sm tracking-wide">
                      DAY {dayNum}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-xs font-medium text-slate-300">{dateStr}</span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{daySessions.length} Study Blocks</span>
                    {isAllCompleted && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 aspect-square" />
                        <span>Day Complete</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Sessions List */}
                <div className="p-4 sm:p-5 divide-y divide-slate-100 space-y-3">
                  {daySessions.map((session) => {
                    const badge = sessionTypeBadges[session.sessionType];

                    return (
                      <div
                        key={session.id}
                        className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs transition-opacity ${
                          session.completed ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        {/* Checkbox & Topic Details */}
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onToggleSession(session.id)}
                            className="mt-0.5 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                            title={session.completed ? 'Mark uncompleted' : 'Mark completed'}
                            aria-label={session.completed ? 'Mark uncompleted' : 'Mark completed'}
                          >
                            {session.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 aspect-square" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 shrink-0 aspect-square" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {session.sessionType}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {session.topicName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                                ({session.durationMinutes} mins)
                              </span>
                            </div>

                            <p className="text-slate-700 leading-normal font-medium">
                              {session.focusNotes}
                            </p>

                            {/* Transparent Reason for Placement */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2 mt-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 aspect-square" />
                              <span>
                                <strong>Placement Reason:</strong> {session.placementReason}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {session.priorityTier} Priority
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
