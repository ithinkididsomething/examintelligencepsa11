import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Layers,
  HelpCircle,
  FileText,
  BookOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  RotateCw,
  Plus,
  ArrowRight,
  Flame,
  BrainCircuit,
  Lightbulb,
  ShieldAlert,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExamDocument, Flashcard, ExtractedQuestion, RevisionCheatSheet, Syllabus, Course } from '../types';
import {
  generateFlashcardsWithGemini,
  generateQuestionsWithGemini,
  generateCheatSheetWithGemini,
  explainConceptWithGemini,
} from '../services/geminiService';

export type GeminiModalMode = 'flashcards' | 'questions' | 'cheat_sheet' | 'explain';

interface GeminiGeneratorModalProps {
  isOpen: boolean;
  initialMode?: GeminiModalMode;
  initialDocId?: string;
  initialTopicName?: string;
  initialNotesExcerpt?: string;
  documents: ExamDocument[];
  syllabus?: Syllabus;
  course?: Course;
  onClose: () => void;
  onAddFlashcards: (newCards: Flashcard[]) => void;
  onAddQuestions: (newQuestions: ExtractedQuestion[]) => void;
}

export const GeminiGeneratorModal: React.FC<GeminiGeneratorModalProps> = ({
  isOpen,
  initialMode = 'flashcards',
  initialDocId,
  initialTopicName = '',
  initialNotesExcerpt = '',
  documents,
  syllabus,
  course,
  onClose,
  onAddFlashcards,
  onAddQuestions,
}) => {
  const [mode, setMode] = useState<GeminiModalMode>(initialMode);
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocId || documents.find((d) => d.category === 'lecture_notes')?.id || documents[0]?.id || ''
  );
  const [customText, setCustomText] = useState<string>(initialNotesExcerpt);
  const [useCustomText, setUseCustomText] = useState<boolean>(Boolean(initialNotesExcerpt));

  // Configuration options
  const [cardCount, setCardCount] = useState<number>(8);
  const [cardCategory, setCardCategory] = useState<string>('All');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questionType, setQuestionType] = useState<string>('Mixed');
  const [targetTopic, setTargetTopic] = useState<string>(initialTopicName);
  const [targetUnit, setTargetUnit] = useState<number | 'auto'>('auto');
  const [explainPrompt, setExplainPrompt] = useState<string>(initialTopicName ? `Explain ${initialTopicName} in detail for exams` : '');

  // Loading & Result States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<ExtractedQuestion[]>([]);
  const [generatedCheatSheet, setGeneratedCheatSheet] = useState<RevisionCheatSheet | null>(null);
  const [generatedExplanation, setGeneratedExplanation] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedStatus, setAddedStatus] = useState<string | null>(null);

  // Sync initial parameters when opened
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialDocId) setSelectedDocId(initialDocId);
      if (initialTopicName) {
        setTargetTopic(initialTopicName);
        setExplainPrompt(`Explain ${initialTopicName} in detail for exams`);
      }
      if (initialNotesExcerpt) {
        setCustomText(initialNotesExcerpt);
        setUseCustomText(true);
      }
      setErrorMessage(null);
      setAddedStatus(null);
    }
  }, [isOpen, initialMode, initialDocId, initialTopicName, initialNotesExcerpt]);

  if (!isOpen) return null;

  // Selected document
  const isAllDocs = selectedDocId === 'all-docs';
  const selectedDoc = isAllDocs ? null : documents.find((d) => d.id === selectedDocId) || documents[0];
  const notesSourceText = useCustomText
    ? customText
    : isAllDocs
    ? documents
        .map(
          (d) =>
            `=== ${d.category === 'lecture_notes' ? 'LECTURE NOTES' : 'EXAM PAPER'}: ${d.filename} ===\n${d.rawText}`
        )
        .join('\n\n')
        .slice(0, 25000)
    : selectedDoc?.rawText || '';

  const handleCopy = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    if (!notesSourceText.trim() && mode !== 'explain') {
      setErrorMessage('Please select a notes document with text content, or paste notes excerpts.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAddedStatus(null);

    const targetDocName = isAllDocs
      ? 'All Uploaded Course Documents'
      : selectedDoc
      ? selectedDoc.filename
      : 'Custom Notes';

    try {
      if (mode === 'flashcards') {
        const cards = await generateFlashcardsWithGemini({
          notesText: notesSourceText,
          docName: targetDocName,
          docId: isAllDocs ? undefined : selectedDoc?.id,
          unitNumber: targetUnit === 'auto' ? undefined : targetUnit,
          topicName: targetTopic || undefined,
          count: cardCount,
          categoryFilter: cardCategory,
          courseName: course?.name,
          courseCode: course?.code,
          courseTags: course?.tags,
        });
        setGeneratedCards(cards);
      } else if (mode === 'questions') {
        const questions = await generateQuestionsWithGemini({
          notesText: notesSourceText,
          docName: targetDocName,
          docId: isAllDocs ? undefined : selectedDoc?.id,
          unitNumber: targetUnit === 'auto' ? undefined : targetUnit,
          count: questionCount,
          questionType,
          syllabus,
          courseName: course?.name,
          courseCode: course?.code,
          courseTags: course?.tags,
        });
        setGeneratedQuestions(questions);
      } else if (mode === 'cheat_sheet') {
        const sheet = await generateCheatSheetWithGemini(
          notesSourceText,
          targetDocName
        );
        setGeneratedCheatSheet(sheet);
      } else if (mode === 'explain') {
        const prompt = explainPrompt || 'Explain the key exam concepts in these notes.';
        const explanation = await explainConceptWithGemini(prompt, notesSourceText);
        setGeneratedExplanation(explanation);
      }
    } catch (err: any) {
      console.error('Gemini error:', err);
      setErrorMessage(err.message || 'An error occurred while connecting to the Gemini engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAllCards = () => {
    if (generatedCards.length === 0) return;
    onAddFlashcards(generatedCards);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setAddedStatus(`Successfully added ${generatedCards.length} flashcard(s) to your study deck!`);
  };

  const handleSaveAllQuestions = () => {
    if (generatedQuestions.length === 0) return;
    onAddQuestions(generatedQuestions);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setAddedStatus(`Successfully added ${generatedQuestions.length} exam question(s) to your Question Bank!`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 shrink-0 aspect-square" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Gemini Academic Intelligence</h2>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Transform lecture notes, textbook excerpts, and slides into study flashcards, exam questions & cheat sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 shrink-0 aspect-square" />
          </button>
        </div>

        {/* Feature Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => {
              setMode('flashcards');
              setAddedStatus(null);
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap ${
              mode === 'flashcards'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 aspect-square" />
            <span>Study Flashcards</span>
            {generatedCards.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                {generatedCards.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setMode('questions');
              setAddedStatus(null);
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap ${
              mode === 'questions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0 aspect-square" />
            <span>Exam Practice Questions</span>
            {generatedQuestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                {generatedQuestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setMode('cheat_sheet');
              setAddedStatus(null);
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap ${
              mode === 'cheat_sheet'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 aspect-square" />
            <span>Cheat Sheet & Exam Traps</span>
          </button>

          <button
            onClick={() => {
              setMode('explain');
              setAddedStatus(null);
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap ${
              mode === 'explain'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-4 h-4 shrink-0 aspect-square" />
            <span>Concept Tutor & Q&A</span>
          </button>
        </div>

        {/* Modal Body: Two columns or single scrollable area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          {/* Source Document Selection Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                <span>Notes Material Source</span>
              </label>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUseCustomText(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    !useCustomText
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Uploaded Document
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomText(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    useCustomText
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Custom Excerpt / Paste Text
                </button>
              </div>
            </div>

            {!useCustomText ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="all-docs">
                      📚 [Knowledge Base] All {documents.length} Uploaded Documents Combined
                    </option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.category === 'lecture_notes' ? '📖 [Notes]' : '📄 [Exam Paper]'} {doc.filename} ({doc.rawText.length > 0 ? `${Math.round(doc.rawText.length / 1000)}k chars` : 'Empty'})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 self-center whitespace-nowrap">
                    {isAllDocs
                      ? `${documents.reduce((acc, d) => acc + d.rawText.length, 0)} total chars`
                      : `${selectedDoc?.rawText.length || 0} characters available`}
                  </span>
                </div>

                {/* Document Type Intelligence Info */}
                {isAllDocs ? (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                    <span>Gemini will analyze across all {documents.length} uploaded papers & notes to formulate comprehensive question flashcards.</span>
                  </p>
                ) : selectedDoc?.category === 'exam_paper' ? (
                  <p className="text-[11px] text-blue-800 bg-blue-50/70 border border-blue-200/80 rounded-lg p-2 font-medium flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 aspect-square" />
                    <span>Past Exam Paper: Gemini will formulate study flashcards based directly on questions asked in this examination paper, with model solutions and marks.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2 font-medium flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
                    <span>Lecture Notes: Gemini will formulate clear questions for core concepts, governing formulas, definitions, and derivations.</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Paste lecture notes paragraphs, slide content, textbook chapter excerpts, or formula lists here..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Paste any raw notes or slide transcript</span>
                  <span>{customText.length} characters</span>
                </div>
              </div>
            )}
          </div>

          {/* Config Controls based on Active Mode */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Generation Parameters
            </h3>

            {mode === 'flashcards' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Card Count
                  </label>
                  <select
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={5}>5 Flashcards (Quick)</option>
                    <option value={8}>8 Flashcards (Balanced)</option>
                    <option value={12}>12 Flashcards (Deep)</option>
                    <option value={16}>16 Flashcards (Exhaustive)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Category Filter
                  </label>
                  <select
                    value={cardCategory}
                    onChange={(e) => setCardCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All">All Categories (Mix)</option>
                    <option value="Formula">Formulas & Equations</option>
                    <option value="Definition">Definitions & Terminology</option>
                    <option value="Concept">High-Yield Concepts</option>
                    <option value="Exam Question">Exam-Style Questions</option>
                    <option value="Derivation">Derivations & Proofs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Unit Assignment
                  </label>
                  <select
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="auto">🤖 Auto (Gemini Guesses Subject & Unit)</option>
                    {syllabus?.units.map((u) => (
                      <option key={u.number} value={u.number}>
                        Unit {u.number}: {u.title.slice(0, 22)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Topic Focus (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetTopic}
                    onChange={(e) => setTargetTopic(e.target.value)}
                    placeholder="Auto-guess from document text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {mode === 'questions' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Question Count
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={3}>3 Questions (Focused)</option>
                    <option value={5}>5 Questions (Standard Exam)</option>
                    <option value={8}>8 Questions (Full Mock Paper)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Question Style
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Mixed">Mixed Types (Theory + Numerical)</option>
                    <option value="Theory">Theory & Explanations</option>
                    <option value="Numerical">Numerical Problems</option>
                    <option value="Derivation">Mathematical Derivations</option>
                    <option value="Conceptual">Conceptual & Reasoning</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Target Unit
                  </label>
                  <select
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {syllabus?.units.map((u) => (
                      <option key={u.number} value={u.number}>
                        Unit {u.number}: {u.title.slice(0, 22)}...
                      </option>
                    )) || (
                      <>
                        <option value={1}>Unit 1</option>
                        <option value={2}>Unit 2</option>
                        <option value={3}>Unit 3</option>
                        <option value={4}>Unit 4</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Exam Session Style
                  </label>
                  <select
                    defaultValue="End-Sem"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="End-Sem">End-Semester Final</option>
                    <option value="Midterm">Midterm / MST</option>
                    <option value="Quiz">Quick Classroom Quiz</option>
                  </select>
                </div>
              </div>
            )}

            {mode === 'cheat_sheet' && (
              <p className="text-xs text-slate-600">
                Gemini will scan the notes content and construct a structured revision cheat sheet with mathematical formulas, exact definitions examiners score for, and pitfalls to watch out for.
              </p>
            )}

            {mode === 'explain' && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  What concept or formula do you want Gemini to clarify?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={explainPrompt}
                    onChange={(e) => setExplainPrompt(e.target.value)}
                    placeholder="e.g., Explain why avalanche breakdown has a positive temperature coefficient"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Action Trigger Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-500 shrink-0 aspect-square" />
                <span>Powered by Gemini 3.8 Flash server-side intelligence</span>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 aspect-square" />
                    <span>Analyzing Notes & Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200 shrink-0 aspect-square" />
                    <span>
                      {mode === 'flashcards' && `Generate ${cardCount} Flashcards`}
                      {mode === 'questions' && `Synthesize ${questionCount} Exam Questions`}
                      {mode === 'cheat_sheet' && 'Generate Revision Cheat Sheet'}
                      {mode === 'explain' && 'Explain with Gemini Tutor'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback & Alerts */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start space-x-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 aspect-square mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Generation Notice: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {addedStatus && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center space-x-2.5 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 aspect-square" />
              <span>{addedStatus}</span>
            </div>
          )}

          {/* Generated Results Presentation */}
          {/* 1. Flashcards Results */}
          {mode === 'flashcards' && generatedCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Generated Flashcards ({generatedCards.length})
                  </h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                    Ready to Study
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllCards}
                  className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 aspect-square" />
                  <span>Add All to Deck ({generatedCards.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedCards.map((card, idx) => (
                  <div
                    key={card.id}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                        <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {card.category}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              card.difficulty === 'Easy'
                                ? 'bg-emerald-50 text-emerald-700'
                                : card.difficulty === 'Hard'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {card.difficulty}
                          </span>
                          {card.examMarks && (
                            <span className="text-indigo-600 font-bold">{card.examMarks}m</span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {card.front}
                      </h4>

                      <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed">
                        {card.back}
                      </p>

                      {card.keyFormula && (
                        <div className="mt-2 text-[10px] font-mono bg-indigo-50/60 text-indigo-900 p-1.5 rounded border border-indigo-100">
                          <span className="font-semibold">Formula: </span> {card.keyFormula}
                        </div>
                      )}

                      {card.hint && (
                        <p className="mt-1 text-[10px] text-amber-700 italic">
                          💡 Hint: {card.hint}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[180px]">{card.topicName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onAddFlashcards([card]);
                          confetti({ particleCount: 20, spread: 40 });
                          setAddedStatus(`Added "${card.front.slice(0, 30)}..." to deck!`);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center space-x-1"
                      >
                        <span>Add this card</span>
                        <Plus className="w-3 h-3 shrink-0 aspect-square" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Questions Results */}
          {mode === 'questions' && generatedQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Synthesized Past-Exam Questions ({generatedQuestions.length})
                  </h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                    With Rubrics
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllQuestions}
                  className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 aspect-square" />
                  <span>Add All to Question Bank ({generatedQuestions.length})</span>
                </button>
              </div>

              <div className="space-y-3">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-indigo-300 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 text-white">
                          {q.rawQuestionNumber}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {q.questionType}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {q.marks} Marks
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px]">
                        <span className="font-semibold text-slate-500">
                          Unit {q.unitNumber || 1}: {q.mappedTopicName || 'General'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onAddQuestions([q]);
                            confetti({ particleCount: 20, spread: 40 });
                            setAddedStatus(`Added ${q.rawQuestionNumber} to question bank!`);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3 shrink-0 aspect-square" />
                          <span>Add to Bank</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-900 leading-relaxed">
                      {q.cleanedText}
                    </p>

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 aspect-square" />
                        <span>Examiner Model Solution & Marking Rubric</span>
                      </div>
                      <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed font-sans">
                        {q.mappingReason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Cheat Sheet Results */}
          {mode === 'cheat_sheet' && generatedCheatSheet && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {generatedCheatSheet.title}
                  </h3>
                  <button
                    onClick={() => handleCopy('cs-summary', generatedCheatSheet.executiveSummary)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                  >
                    {copiedId === 'cs-summary' ? <Check className="w-3.5 h-3.5 shrink-0 aspect-square text-emerald-600" /> : <Copy className="w-3.5 h-3.5 shrink-0 aspect-square" />}
                    <span>{copiedId === 'cs-summary' ? 'Copied' : 'Copy Summary'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {generatedCheatSheet.executiveSummary}
                </p>
              </div>

              {/* Formulas */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                  <span>High-Yield Formula Sheet</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {generatedCheatSheet.cheatSheetFormulas.map((f, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200/90 rounded-lg p-2.5 space-y-1 font-mono text-[11px]"
                    >
                      <div className="font-bold text-indigo-900 text-xs">{f.formula}</div>
                      <div className="font-sans text-[11px] text-slate-600">{f.meaning}</div>
                      {f.examApplication && (
                        <div className="font-sans text-[10px] text-emerald-700 font-medium">
                          Exam Use: {f.examApplication}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Traps */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-2xs space-y-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 aspect-square" />
                  <span>Common Exam Traps & Examiner Pitfalls</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-800">
                  {generatedCheatSheet.commonExamTraps.map((trap, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{trap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Definitions */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                  <span>Key Exam Terminology & Definitions</span>
                </h4>
                <div className="space-y-2">
                  {generatedCheatSheet.highYieldDefinitions.map((d, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <span className="font-bold text-slate-900">{d.term}: </span>
                      <span className="text-slate-700">{d.definition}</span>
                      {d.keyKeywords && (
                        <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                          Keywords for marks: {d.keyKeywords}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Tutor / Explanation Results */}
          {mode === 'explain' && generatedExplanation && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-600 shrink-0 aspect-square" />
                  <span>Gemini Academic Tutor Explanation</span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy('tutor-exp', generatedExplanation)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                >
                  {copiedId === 'tutor-exp' ? <Check className="w-3.5 h-3.5 shrink-0 aspect-square text-emerald-600" /> : <Copy className="w-3.5 h-3.5 shrink-0 aspect-square" />}
                  <span>{copiedId === 'tutor-exp' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans space-y-2">
                {generatedExplanation}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {mode === 'flashcards' && `${generatedCards.length} flashcard(s) generated`}
            {mode === 'questions' && `${generatedQuestions.length} question(s) synthesized`}
            {mode === 'cheat_sheet' && (generatedCheatSheet ? 'Cheat sheet ready' : 'Ready to generate')}
            {mode === 'explain' && (generatedExplanation ? 'Explanation ready' : 'Ask anything')}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            {mode === 'flashcards' && generatedCards.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAllCards}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 aspect-square" />
                <span>Save {generatedCards.length} to Flashcards</span>
              </button>
            )}
            {mode === 'questions' && generatedQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAllQuestions}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 aspect-square" />
                <span>Save {generatedQuestions.length} to Questions</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
