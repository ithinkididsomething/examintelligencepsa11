import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  Download,
  AlertCircle,
  HelpCircle,
  Hash,
} from 'lucide-react';
import {
  ExamDocument,
  NotesAnalysisResult,
  NotesCoverageStatus,
  TopicAnalytics,
} from '../types';

interface NotesAnalysisViewProps {
  notesDocument: ExamDocument | null;
  allDocuments: ExamDocument[];
  onSelectDocument: (doc: ExamDocument) => void;
  onInspectDocument: (doc: ExamDocument) => void;
  onNavigateToPriorities: () => void;
  onOpenWhyModal?: (topic: TopicAnalytics) => void;
  onOpenGeminiModal?: (mode: 'flashcards' | 'questions' | 'cheat_sheet' | 'explain', docId?: string, topicName?: string, excerpt?: string) => void;
}

export const NotesAnalysisView: React.FC<NotesAnalysisViewProps> = ({
  notesDocument,
  allDocuments,
  onSelectDocument,
  onInspectDocument,
  onNavigateToPriorities,
  onOpenGeminiModal,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'formulas' | 'definitions' | 'cheat_sheet' | 'reader'>('matrix');
  const [coverageFilter, setCoverageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedFormulaId, setCopiedFormulaId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);

  // All notes documents
  const notesDocs = allDocuments.filter(
    (d) => d.category === 'lecture_notes' || d.notesAnalysis !== undefined
  );

  const analysis: NotesAnalysisResult | undefined = notesDocument?.notesAnalysis;

  const handleCopyFormula = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedFormulaId(id);
    setTimeout(() => setCopiedFormulaId(null), 2000);
  };

  if (!notesDocument || !analysis) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
          <BookOpen className="w-6 h-6 shrink-0 aspect-square" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No Lecture Notes Analyzed Yet</h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          Upload your lecture notes, class slides, or chapter summaries in PDF format to discover which high-yield exam topics are missing or under-represented in your study materials.
        </p>
        <button
          onClick={onNavigateToPriorities}
          className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-300" />
          <span>View Exam Study Priorities</span>
        </button>
      </div>
    );
  }

  // Filter topics
  const filteredTopics = analysis.topicCoverages.filter((t) => {
    const matchesFilter =
      coverageFilter === 'all' ||
      (coverageFilter === 'gaps' && (t.coverageStatus === 'Missing' || t.coverageStatus === 'Sparse')) ||
      t.coverageStatus.toLowerCase() === coverageFilter.toLowerCase();

    const matchesSearch =
      searchQuery === '' ||
      t.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.keyFormulas.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.keyDefinitions.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // Parse pages from rawText for reader
  const pageRegex = /---\s*Page\s*(\d+)\s*---/gi;
  const rawMatches = Array.from(notesDocument.rawText.matchAll(pageRegex));
  const readerPages: { pageNum: number; content: string }[] = [];

  if (rawMatches.length > 0) {
    for (let i = 0; i < rawMatches.length; i++) {
      const match = rawMatches[i];
      const pageNum = parseInt(match[1], 10);
      const startIndex = match.index! + match[0].length;
      const endIndex = i < rawMatches.length - 1 ? rawMatches[i + 1].index! : notesDocument.rawText.length;
      readerPages.push({
        pageNum,
        content: notesDocument.rawText.slice(startIndex, endIndex).trim(),
      });
    }
  } else {
    readerPages.push({ pageNum: 1, content: notesDocument.rawText });
  }

  const activePageObj = readerPages.find((p) => p.pageNum === selectedPage) || readerPages[0];

  return (
    <div className="space-y-5">
      {/* Top Document Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 aspect-square">
              <BookOpen className="w-5 h-5 shrink-0 aspect-square" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                  Notes Analysis
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {analysis.totalPages} Pages · Quality Score: {analysis.notesQualityScore}%
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
                {notesDocument.filename}
              </h1>
            </div>
          </div>

          {/* Document Switcher & Inspector Button */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {notesDocs.length > 1 && (
              <select
                value={notesDocument.id}
                onChange={(e) => {
                  const target = notesDocs.find((d) => d.id === e.target.value);
                  if (target) onSelectDocument(target);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                aria-label="Switch notes document"
              >
                {notesDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => onInspectDocument(notesDocument)}
              title="Inspect Notes OCR Text"
              aria-label="Inspect Notes OCR Text"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
            >
              <Eye className="w-3.5 h-3.5 shrink-0 aspect-square text-slate-600" />
              <span className="hidden sm:inline">Inspect OCR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Metric 1 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium truncate">Overall Coverage</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900">
            {analysis.overallCoverageScore}%
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {analysis.topicsCoveredCount} of {analysis.totalSyllabusTopics} syllabus topics covered
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium truncate">High-Yield Exam Coverage</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900">
            {analysis.highPriorityCoverageScore}%
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            Critical & High recurrence topics
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium truncate">Critical Gaps Flagged</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 aspect-square" />
          </div>
          <div className={`text-lg sm:text-2xl font-bold ${analysis.criticalGaps.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {analysis.criticalGaps.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {analysis.criticalGaps.length > 0 ? 'High-risk topics missing/sparse' : 'No critical gaps detected'}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium truncate">Extracted Formulas</span>
            <Hash className="w-3.5 h-3.5 text-indigo-500 shrink-0 aspect-square" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900">
            {analysis.extractedFormulas.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            Formulas ready for revision sheet
          </p>
        </div>
      </div>

      {/* Gemini AI Intelligence Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xs border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 shrink-0 aspect-square" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-white">Gemini 3.8 Flash Notes Synthesis</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Extract interactive study flashcards, synthesize past-exam questions, or build a cheat sheet directly from this document.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenGeminiModal?.('flashcards', notesDocument.id)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-200" />
            <span>Make Flashcards</span>
          </button>
          <button
            onClick={() => onOpenGeminiModal?.('questions', notesDocument.id)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0 aspect-square text-amber-300" />
            <span>Make Questions</span>
          </button>
          <button
            onClick={() => onOpenGeminiModal?.('cheat_sheet', notesDocument.id)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-300" />
            <span>Cheat Sheet</span>
          </button>
        </div>
      </div>

      {/* Critical Gaps Banner (High-Yield Risk Warnings) */}
      {analysis.criticalGaps.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 aspect-square" />
            <h2 className="text-xs sm:text-sm font-bold text-rose-950">
              High-Yield Exam Gap Warnings ({analysis.criticalGaps.length} Topics Need Textbook Supplementation)
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-rose-900 leading-relaxed">
            These syllabus topics appear with high frequency in historical question papers, but have missing formulas, diagrams, or incomplete coverage in your current lecture notes:
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {analysis.criticalGaps.map((gap) => (
              <div
                key={gap.topicId}
                className="bg-white/90 border border-rose-200 rounded-xl p-3 text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 truncate">{gap.topicName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                    {gap.priorityTier} · {gap.examMarksPercentage}% Marks
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">{gap.issue}</p>
                <div className="pt-1 border-t border-slate-100 flex items-start space-x-1.5 text-[11px] text-indigo-800">
                  <ArrowRight className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5 aspect-square" />
                  <span className="font-medium">{gap.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 sm:p-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('matrix')}
            title="Topic Coverage Matrix"
            aria-label="Topic Coverage Matrix"
            className={`flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-300" />
            <span className="hidden sm:inline">Coverage Matrix</span>
            <span className="sm:hidden">Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            title="Extracted Formulas"
            aria-label="Extracted Formulas"
            className={`flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'formulas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Hash className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-400" />
            <span className="hidden sm:inline">Formula Sheet</span>
            <span className="sm:hidden">Formulas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {analysis.extractedFormulas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('definitions')}
            title="Key Definitions"
            aria-label="Key Definitions"
            className={`flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'definitions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0 aspect-square text-emerald-400" />
            <span className="hidden sm:inline">Key Definitions</span>
            <span className="sm:hidden">Definitions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {analysis.extractedDefinitions.length}
            </span>
          </button>

          {notesDocument.cheatSheet && (
            <button
              onClick={() => setActiveTab('cheat_sheet')}
              title="AI Cheat Sheet"
              aria-label="AI Cheat Sheet"
              className={`flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'cheat_sheet'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 aspect-square text-amber-400" />
              <span className="hidden sm:inline">Cheat Sheet</span>
              <span className="sm:hidden">Sheet</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('reader')}
            title="Page-by-Page Reader"
            aria-label="Page-by-Page Reader"
            className={`flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'reader'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-300" />
            <span className="hidden sm:inline">Notes Reader</span>
            <span className="sm:hidden">Reader</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative shrink-0 sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0 aspect-square" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic or formula..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tab 1: Topic Coverage Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1 text-[11px]">Filter Coverage:</span>
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'gaps', label: '⚠️ Gaps Only' },
              { id: 'comprehensive', label: 'Comprehensive' },
              { id: 'moderate', label: 'Moderate' },
              { id: 'sparse', label: 'Sparse' },
              { id: 'missing', label: 'Missing' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setCoverageFilter(p.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  coverageFilter === p.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Topics Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.map((tc) => {
              const statusColors: Record<NotesCoverageStatus, { bg: string; text: string; border: string }> = {
                Comprehensive: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
                Moderate: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
                Sparse: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
                Missing: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
              };
              const col = statusColors[tc.coverageStatus];

              return (
                <div
                  key={tc.topicId}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Unit {tc.unitNumber}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {tc.topicName}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${col.bg} ${col.text} ${col.border}`}
                      >
                        {tc.coverageStatus}
                      </span>
                    </div>

                    {/* Page references */}
                    {tc.pageReferences.length > 0 ? (
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0 aspect-square" />
                        <span>Pages: {tc.pageReferences.map((p) => `p. ${p}`).join(', ')}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-rose-500 italic block">
                        Not referenced in notes
                      </span>
                    )}

                    {/* Notes Excerpt */}
                    <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                      "{tc.notesExcerpt}"
                    </p>

                    {/* Gap Warning */}
                    {tc.gapWarning && (
                      <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900 flex items-start space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5 aspect-square" />
                        <span>{tc.gapWarning}</span>
                      </div>
                    )}
                  </div>

                  {/* Recommendation action */}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span className="truncate pr-1">{tc.studyAction}</span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => onOpenGeminiModal?.('flashcards', notesDocument.id, tc.topicName, tc.notesExcerpt)}
                        title="Generate Flashcards with Gemini for this topic"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600 shrink-0 aspect-square" />
                        <span>AI Cards</span>
                      </button>
                      <button
                        onClick={() => {
                          if (tc.pageReferences[0]) {
                            setSelectedPage(tc.pageReferences[0]);
                            setActiveTab('reader');
                          }
                        }}
                        className="text-slate-600 hover:text-slate-900 font-semibold text-[10px] flex items-center space-x-0.5 cursor-pointer"
                      >
                        <span>Read</span>
                        <ChevronRight className="w-3 h-3 shrink-0 aspect-square" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Formula Sheet */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Mathematical formulas extracted from notes text with exact page numbers. Click copy to copy directly to clipboard.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {analysis.extractedFormulas.map((f) => {
              const isCopied = copiedFormulaId === f.id;
              return (
                <div
                  key={f.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:border-indigo-300 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{f.label}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {f.topicName} · Page {f.page}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyFormula(f.id, f.formula)}
                      title="Copy formula"
                      aria-label="Copy formula"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 shrink-0 aspect-square" />
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-900 text-indigo-300 font-mono text-xs p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                    {f.formula}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Key Definitions */}
      {activeTab === 'definitions' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Core technical definitions extracted from lecture notes for short-answer exam questions.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {analysis.extractedDefinitions.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <h4 className="font-bold text-slate-900">{d.term}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Page {d.page}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{d.definition}</p>
                <span className="text-[10px] text-indigo-700 font-medium block">
                  {d.topicName} (Unit {d.unitNumber})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: AI Cheat Sheet */}
      {activeTab === 'cheat_sheet' && notesDocument.cheatSheet && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 aspect-square" />
              <span className="text-xs font-bold text-slate-800">
                {notesDocument.cheatSheet.title || 'AI-Generated Cheat Sheet'}
              </span>
            </div>
            <button
              onClick={() => {
                const sheet = notesDocument.cheatSheet;
                if (!sheet || !navigator?.clipboard?.writeText) return;
                const text = [
                  sheet.title,
                  sheet.executiveSummary,
                  ...sheet.cheatSheetFormulas.map((f) => `${f.formula} — ${f.meaning}`),
                  ...sheet.highYieldDefinitions.map((d) => `${d.term}: ${d.definition}`),
                  ...sheet.commonExamTraps,
                  ...sheet.quickRecallTips,
                ].join('\n');
                navigator.clipboard.writeText(text).catch(() => {});
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy cheat sheet"
            >
              <Copy className="w-3 h-3 shrink-0 aspect-square" />
              <span>Copy</span>
            </button>
          </div>

          <div className="space-y-4 text-xs text-slate-800 max-h-[560px] overflow-y-auto pr-1">
            {notesDocument.cheatSheet.executiveSummary && (
              <p className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 leading-relaxed">
                {notesDocument.cheatSheet.executiveSummary}
              </p>
            )}

            {notesDocument.cheatSheet.cheatSheetFormulas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key Formulas</h4>
                {notesDocument.cheatSheet.cheatSheetFormulas.map((f, i) => (
                  <div key={i} className="bg-slate-900 text-indigo-200 font-mono text-xs p-2.5 rounded-lg border border-slate-800">
                    <div className="text-indigo-300">{f.formula}</div>
                    <div className="text-slate-300 font-sans mt-1 text-[11px]">{f.meaning}</div>
                    {f.examApplication && (
                      <div className="text-amber-300 font-sans mt-0.5 text-[11px]">Exam use: {f.examApplication}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {notesDocument.cheatSheet.highYieldDefinitions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">High-Yield Definitions</h4>
                {notesDocument.cheatSheet.highYieldDefinitions.map((d, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg p-3">
                    <span className="font-bold text-slate-900">{d.term}</span>
                    <p className="text-slate-700 leading-relaxed mt-0.5">{d.definition}</p>
                    {d.keyKeywords && (
                      <span className="text-[10px] text-indigo-700 font-medium block mt-1">Keywords: {d.keyKeywords}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {notesDocument.cheatSheet.commonExamTraps.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Common Exam Traps</h4>
                <ul className="space-y-1">
                  {notesDocument.cheatSheet.commonExamTraps.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-700 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5 aspect-square" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {notesDocument.cheatSheet.quickRecallTips.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Quick Recall Tips</h4>
                <ul className="space-y-1">
                  {notesDocument.cheatSheet.quickRecallTips.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 aspect-square" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Page-by-Page Reader */}
      {activeTab === 'reader' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">Page Navigation:</span>
              <div className="flex items-center space-x-1 overflow-x-auto max-w-sm sm:max-w-md pb-1 sm:pb-0 scrollbar-none">
                {readerPages.map((p) => (
                  <button
                    key={p.pageNum}
                    onClick={() => setSelectedPage(p.pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      selectedPage === p.pageNum
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.pageNum}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenGeminiModal?.('flashcards', notesDocument.id, `Page ${selectedPage}`, activePageObj.content)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Generate flashcards from this page using Gemini"
              >
                <Sparkles className="w-3 h-3 text-indigo-600 shrink-0 aspect-square" />
                <span>AI Cards from Page {selectedPage}</span>
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Page {selectedPage} of {readerPages.length}
              </span>
            </div>
          </div>

          {/* Page Content Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
            {activePageObj.content}
          </div>
        </div>
      )}
    </div>
  );
};
