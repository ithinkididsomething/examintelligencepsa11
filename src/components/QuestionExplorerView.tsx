import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit2,
  Layers,
  ChevronDown,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  Difficulty,
  ExtractedQuestion,
  QuestionType,
  ReviewStatus,
  Syllabus,
} from '../types';

interface QuestionExplorerViewProps {
  questions: ExtractedQuestion[];
  syllabus: Syllabus;
  onUpdateQuestion: (updated: ExtractedQuestion) => void;
  onOpenGeminiQuestionGenerator?: () => void;
}

export const QuestionExplorerView: React.FC<QuestionExplorerViewProps> = ({
  questions,
  syllabus,
  onUpdateQuestion,
  onOpenGeminiQuestionGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedDiffFilter, setSelectedDiffFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState<number | ''>('');
  const [editTopicId, setEditTopicId] = useState<string>('');

  // Extract all topics flat
  const allTopics: { id: string; name: string; unitNumber: number }[] = [];
  syllabus.units.forEach((u) => {
    u.topics.forEach((t) => {
      allTopics.push({ id: t.id, name: t.name, unitNumber: u.number });
    });
  });

  const allYears = Array.from(new Set(questions.map((q) => q.paperYear))).sort((a, b) => b - a);

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchSearch =
      q.cleanedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.rawQuestionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.mappedTopicName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchTopic = selectedTopicFilter === 'ALL' || q.mappedTopicId === selectedTopicFilter;
    const matchType = selectedTypeFilter === 'ALL' || q.questionType === selectedTypeFilter;
    const matchDiff = selectedDiffFilter === 'ALL' || q.difficulty === selectedDiffFilter;
    const matchStatus = selectedStatusFilter === 'ALL' || q.reviewStatus === selectedStatusFilter;
    const matchYear = selectedYearFilter === 'ALL' || q.paperYear.toString() === selectedYearFilter;

    return matchSearch && matchTopic && matchType && matchDiff && matchStatus && matchYear;
  });

  const handleStartEdit = (q: ExtractedQuestion) => {
    setEditingQuestionId(q.id);
    setEditMarks(q.marks !== null ? q.marks : '');
    setEditTopicId(q.mappedTopicId || '');
  };

  const handleSaveEdit = (q: ExtractedQuestion) => {
    const matchedTopic = allTopics.find((t) => t.id === editTopicId);
    const updated: ExtractedQuestion = {
      ...q,
      marks: editMarks === '' ? null : Number(editMarks),
      mappedTopicId: editTopicId || null,
      mappedTopicName: matchedTopic ? matchedTopic.name : null,
      unitNumber: matchedTopic ? matchedTopic.unitNumber : undefined,
      mappingMethod: 'manual',
      mappingConfidence: 'High',
      mappingConfidenceScore: 100,
      mappingReason: 'Manually verified and confirmed by student.',
      reviewStatus: 'Accepted',
      qualityFlags: q.qualityFlags.filter((f) => f !== 'missing_marks' && f !== 'low_confidence'),
    };
    onUpdateQuestion(updated);
    setEditingQuestionId(null);
  };

  const handleStatusChange = (q: ExtractedQuestion, newStatus: ReviewStatus) => {
    onUpdateQuestion({
      ...q,
      reviewStatus: newStatus,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 aspect-square" />
              <span>Questions Explorer & Human-in-the-Loop Review</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review every extracted question, verify marks and syllabus mapping, and inspect OCR confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenGeminiQuestionGenerator && (
              <button
                onClick={onOpenGeminiQuestionGenerator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200 shrink-0 aspect-square" />
                <span>Generate Questions from Notes (Gemini)</span>
              </button>
            )}
            <div className="text-xs text-slate-600 font-medium">
              Showing <strong className="text-slate-900">{filteredQuestions.length}</strong> of {questions.length} questions
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
          {/* Search Input */}
          <div className="relative col-span-2 lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 aspect-square" />
            <input
              type="text"
              placeholder="Search question text or Q number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Year Filter */}
          <div>
            <select
              aria-label="Filter by Exam Year"
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="w-full py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              <option value="ALL">All Years</option>
              {allYears.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  {yr} Papers
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <select
              aria-label="Filter by Topic"
              value={selectedTopicFilter}
              onChange={(e) => setSelectedTopicFilter(e.target.value)}
              className="w-full py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              <option value="ALL">All Topics</option>
              {allTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  U{t.unitNumber}: {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <select
              aria-label="Filter by Question Type"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              <option value="ALL">All Types</option>
              {(['Theory', 'Numerical', 'Derivation', 'Definition', 'Conceptual', 'Problem Solving', 'Mixed'] as QuestionType[]).map((qt) => (
                <option key={qt} value={qt}>
                  {qt}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              aria-label="Filter by Difficulty"
              value={selectedDiffFilter}
              onChange={(e) => setSelectedDiffFilter(e.target.value)}
              className="w-full py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Review Status Filter */}
          <div className="col-span-2 sm:col-span-1">
            <select
              aria-label="Filter by Review Status"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="Accepted">Accepted Only</option>
              <option value="Needs Review">Needs Review Only</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            No questions match your current filters. Clear filters to view questions.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isEditing = editingQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-xs space-y-3 ${
                  q.reviewStatus === 'Needs Review'
                    ? 'border-indigo-300 bg-indigo-50/15'
                    : q.reviewStatus === 'Rejected'
                    ? 'border-rose-200 bg-rose-50/20 opacity-60'
                    : 'border-slate-200/90 hover:border-indigo-300'
                }`}
              >
                {/* Top Meta Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {q.rawQuestionNumber}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-medium">
                      {q.paperYear} {q.paperSession} ({q.paperName})
                    </span>

                    {/* Marks Badge */}
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                      {q.marks !== null ? `${q.marks} Marks` : 'Marks Missing'}
                    </span>

                    {/* Type & Difficulty */}
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {q.questionType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        q.difficulty === 'Hard'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : q.difficulty === 'Medium'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  {/* Review Status Selector */}
                  <div className="flex items-center gap-1 sm:gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleStatusChange(q, 'Accepted')}
                      title="Mark as Accepted"
                      aria-label="Mark as Accepted"
                      className={`w-7 h-7 sm:w-auto p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center sm:justify-start gap-1 shrink-0 cursor-pointer ${
                        q.reviewStatus === 'Accepted'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
                      <span className="hidden sm:inline">Accepted</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(q, 'Needs Review')}
                      title="Flag as Needs Review"
                      aria-label="Flag as Needs Review"
                      className={`w-7 h-7 sm:w-auto p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center sm:justify-start gap-1 shrink-0 cursor-pointer ${
                        q.reviewStatus === 'Needs Review'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                      <span className="hidden sm:inline">Review</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(q, 'Rejected')}
                      title="Mark as Rejected"
                      aria-label="Mark as Rejected"
                      className={`w-7 h-7 sm:w-auto p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center sm:justify-start gap-1 shrink-0 cursor-pointer ${
                        q.reviewStatus === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 aspect-square" />
                      <span className="hidden sm:inline">Reject</span>
                    </button>

                    <button
                      onClick={() => (isEditing ? handleSaveEdit(q) : handleStartEdit(q))}
                      className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                      title="Edit question details"
                      aria-label="Edit question details"
                    >
                      <Edit2 className="w-3.5 h-3.5 shrink-0 aspect-square" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-xs sm:text-sm text-slate-900 font-sans leading-relaxed">
                  {q.cleanedText}
                </div>

                {/* Quality Flags Notice */}
                {q.qualityFlags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {q.qualityFlags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200"
                      >
                        ℹ️ {flag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Edit Form */}
                {isEditing ? (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`edit-marks-${q.id}`} className="font-semibold text-slate-700 block mb-1">
                          Marks Allocation:
                        </label>
                        <input
                          id={`edit-marks-${q.id}`}
                          type="number"
                          value={editMarks}
                          onChange={(e) => setEditMarks(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 5, 8, 10"
                          className="w-full bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-topic-${q.id}`} className="font-semibold text-slate-700 block mb-1">
                          Map to Syllabus Topic:
                        </label>
                        <select
                          id={`edit-topic-${q.id}`}
                          value={editTopicId}
                          onChange={(e) => setEditTopicId(e.target.value)}
                          className="w-full bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Unassigned Topic</option>
                          {allTopics.map((t) => (
                            <option key={t.id} value={t.id}>
                              Unit {t.unitNumber}: {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setEditingQuestionId(null)}
                        className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(q)}
                        className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
                      >
                        Save Question Updates
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Topic Mapping Explanation Strip */
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-medium">Mapped Topic:</span>
                      <strong className="text-slate-900">
                        {q.mappedTopicName || 'Unassigned'}
                      </strong>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-md font-bold uppercase ${
                          q.mappingConfidence === 'High'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.mappingConfidence === 'Medium'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {q.mappingConfidence} ({q.mappingConfidenceScore}%)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 italic max-w-md truncate">
                      {q.mappingReason}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
