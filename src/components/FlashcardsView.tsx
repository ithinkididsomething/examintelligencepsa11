import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  BookOpen,
  FileText,
  Search,
  Filter,
  Volume2,
  Copy,
  Check,
  Award,
  Zap,
  BarChart3,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import { Flashcard, FlashcardCategory, FlashcardMastery, Syllabus, ExamDocument } from '../types';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  documents: ExamDocument[];
  syllabus?: Syllabus;
  onUpdateFlashcard: (card: Flashcard) => void;
  onAddFlashcard: (card: Flashcard) => void;
  onNavigateToNotes?: () => void;
  onNavigateToQuestions?: () => void;
  onOpenGeminiGenerator?: () => void;
  onAutoGenerateAllFlashcards?: () => void;
  isAnalyzingDocuments?: boolean;
  analyzingProgressMessage?: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards,
  documents,
  syllabus,
  onUpdateFlashcard,
  onAddFlashcard,
  onNavigateToNotes,
  onNavigateToQuestions,
  onOpenGeminiGenerator,
  onAutoGenerateAllFlashcards,
  isAnalyzingDocuments = false,
  analyzingProgressMessage = '',
}) => {
  const [selectedUnit, setSelectedUnit] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<FlashcardCategory | 'all'>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'needs_review' | 'mastered' | 'bookmarked'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'study' | 'quiz'>('study');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedDocSource, setSelectedDocSource] = useState<string | 'all'>('all');

  // Derive document sources dynamically with robust matching
  const docSources = useMemo(() => {
    return documents.map((d) => {
      const matchCount = flashcards.filter((c) => {
        if (c.sourceDocId === d.id) return true;
        const name = (c.sourceDocName || '').toLowerCase();
        if (name.includes(d.filename.toLowerCase())) return true;
        if (d.year && name.includes(String(d.year))) return true;
        if (d.category === 'lecture_notes' && (name.includes('lecture notes') || name.includes('notes'))) return true;
        return false;
      }).length;
      return {
        id: d.id,
        filename: d.filename,
        category: d.category || 'exam_paper',
        count: matchCount,
      };
    });
  }, [documents, flashcards]);

  // New Flashcard Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newUnit, setNewUnit] = useState<number>(1);
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<FlashcardCategory>('Concept');
  const [newSource, setNewSource] = useState('Course Knowledge Base');

  // Filtered Cards with reliable document source matching
  const filteredCards = useMemo(() => {
    return flashcards.filter((card) => {
      if (selectedDocSource !== 'all') {
        const targetDoc = documents.find((d) => d.id === selectedDocSource);
        const matchesId = card.sourceDocId === selectedDocSource;
        const name = (card.sourceDocName || '').toLowerCase();
        const matchesFilename = Boolean(targetDoc && name.includes(targetDoc.filename.toLowerCase()));
        const matchesYear = Boolean(targetDoc && targetDoc.year && name.includes(String(targetDoc.year)));
        const matchesNotes = Boolean(targetDoc?.category === 'lecture_notes' && (name.includes('lecture notes') || name.includes('notes')));
        if (!matchesId && !matchesFilename && !matchesYear && !matchesNotes) return false;
      }
      if (selectedUnit !== 'all' && card.unitNumber !== selectedUnit) return false;
      if (selectedCategory !== 'all' && card.category !== selectedCategory) return false;
      if (selectedFilter === 'needs_review' && card.masteryStatus !== 'review' && card.masteryStatus !== 'learning') {
        return false;
      }
      if (selectedFilter === 'mastered' && card.masteryStatus !== 'mastered') return false;
      if (selectedFilter === 'bookmarked' && !card.isBookmarked) return false;
      return true;
    });
  }, [flashcards, selectedDocSource, selectedUnit, selectedCategory, selectedFilter, documents]);

  // Derive available units dynamically from syllabus or cards
  const availableUnits = useMemo(() => {
    if (syllabus && syllabus.units && syllabus.units.length > 0) {
      return syllabus.units.map((u) => u.number);
    }
    const fromCards = Array.from(new Set(flashcards.map((c) => c.unitNumber))).filter(Boolean).sort((a, b) => a - b);
    return fromCards.length > 0 ? fromCards : [1, 2, 3, 4];
  }, [syllabus, flashcards]);

  // Safe clamped index prevents undefined runtime exceptions when filters reduce list size
  const safeIndex = filteredCards.length > 0 ? Math.min(currentIndex, filteredCards.length - 1) : 0;
  const currentCard = filteredCards.length > 0 ? filteredCards[safeIndex] : null;

  // Keep currentIndex in sync when filtered cards change
  useEffect(() => {
    if (currentIndex >= filteredCards.length && filteredCards.length > 0) {
      setCurrentIndex(filteredCards.length - 1);
    }
    setIsFlipped(false);
  }, [filteredCards.length, currentIndex]);

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing or if new card modal is active
      if (isNewModalOpen) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (safeIndex < filteredCards.length - 1) {
          setCurrentIndex(safeIndex + 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        if (safeIndex > 0) {
          setCurrentIndex(safeIndex - 1);
          setIsFlipped(false);
        }
      }
    },
    [safeIndex, filteredCards.length, isNewModalOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleNext = () => {
    if (safeIndex < filteredCards.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleSetMastery = (status: FlashcardMastery) => {
    if (!currentCard) return;
    const updated: Flashcard = {
      ...currentCard,
      masteryStatus: status,
      timesReviewed: (currentCard.timesReviewed || 0) + 1,
      lastReviewedAt: new Date().toISOString(),
    };
    onUpdateFlashcard(updated);
    // Smoothly auto-advance to next card
    if (currentIndex < filteredCards.length - 1) {
      setTimeout(() => {
        handleNext();
      }, 250);
    }
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    onUpdateFlashcard({
      ...currentCard,
      isBookmarked: !currentCard.isBookmarked,
    });
  };

  const handleCopyText = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: `fc-user-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      unitNumber: newUnit,
      topicName: newTopic.trim() || `Unit ${newUnit} General`,
      category: newCategory,
      sourceDocName: newSource.trim() || 'Custom Note',
      difficulty: 'Medium',
      masteryStatus: 'unrated',
      timesReviewed: 0,
    };

    onAddFlashcard(newCard);
    setIsNewModalOpen(false);
    setNewFront('');
    setNewBack('');
    setNewTopic('');
  };

  // Stats calculation
  const totalCards = flashcards.length;
  const masteredCount = flashcards.filter((c) => c.masteryStatus === 'mastered').length;
  const reviewCount = flashcards.filter((c) => c.masteryStatus === 'review' || c.masteryStatus === 'learning').length;
  const bookmarkedCount = flashcards.filter((c) => c.isBookmarked).length;
  const masteryPercentage = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Knowledge Source Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 aspect-square">
            <Zap className="w-5 h-5 shrink-0 aspect-square" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-slate-900">
                Knowledge Base Flashcards
              </h2>
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {totalCards} Active Cards
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Extracted directly from the indexed lecture notes and {documents.length} past examination papers.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onAutoGenerateAllFlashcards && (
            <button
              onClick={onAutoGenerateAllFlashcards}
              disabled={isAnalyzingDocuments}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Automatically analyze all uploaded exam papers and lecture notes to form clear question flashcards"
            >
              {isAnalyzingDocuments ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200 shrink-0 aspect-square" />
              ) : (
                <RotateCw className="w-3.5 h-3.5 text-emerald-200 shrink-0 aspect-square" />
              )}
              <span>{isAnalyzingDocuments ? 'Analyzing Documents...' : 'Auto-Analyze All Documents'}</span>
            </button>
          )}

          {onOpenGeminiGenerator && (
            <button
              onClick={onOpenGeminiGenerator}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200 shrink-0 aspect-square" />
              <span>Generate with Gemini</span>
            </button>
          )}

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0 aspect-square" />
            <span>Add Flashcard</span>
          </button>

          {onNavigateToNotes && (
            <button
              onClick={onNavigateToNotes}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-600 shrink-0 aspect-square" />
              <span>Notes Source</span>
            </button>
          )}
        </div>
      </div>

      {/* Active AI Document Analysis Progress Banner */}
      {isAnalyzingDocuments && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-indigo-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center shrink-0 aspect-square">
              <Loader2 className="w-5 h-5 shrink-0 aspect-square animate-spin text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold text-white">Gemini Academic AI is Analyzing Knowledge Base</h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-semibold uppercase">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/90 mt-0.5">
                {analyzingProgressMessage || 'Scanning uploaded papers and lecture notes to extract exam questions and formulate high-yield study flashcards...'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-indigo-300 self-end sm:self-center shrink-0">Processing in background...</span>
        </div>
      )}

      {/* Mastery Progress & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Overall Mastery</span>
            <span className="font-semibold text-slate-900">{masteryPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block">Mastered Cards</span>
          <span className="text-lg font-bold text-emerald-600 mt-0.5 block">
            {masteredCount} <span className="text-xs text-slate-400 font-normal">/ {totalCards}</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block">Needs Review</span>
          <span className="text-lg font-bold text-amber-600 mt-0.5 block">
            {reviewCount} <span className="text-xs text-slate-400 font-normal">cards</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block">Bookmarked</span>
          <span className="text-lg font-bold text-indigo-600 mt-0.5 block">
            {bookmarkedCount} <span className="text-xs text-slate-400 font-normal">saved</span>
          </span>
        </div>
      </div>

      {/* Filter and Segment Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Unit Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-slate-400 font-medium mr-1">Unit:</span>
            <button
              onClick={() => setSelectedUnit('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedUnit === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Units
            </button>
            {availableUnits.map((u) => (
              <button
                key={u}
                onClick={() => setSelectedUnit(u)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedUnit === u
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Unit {u}
              </button>
            ))}
          </div>

          {/* Category Select */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="Formula">Formulas & Equations</option>
              <option value="Definition">Definitions & Laws</option>
              <option value="Concept">Key Concepts</option>
              <option value="Exam Question">Past Exam Problems</option>
              <option value="Derivation">Derivations</option>
            </select>
          </div>

          {/* Quick Mastery Filter */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                selectedFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({flashcards.length})
            </button>
            <button
              onClick={() => setSelectedFilter('needs_review')}
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                selectedFilter === 'needs_review'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Review ({reviewCount})
            </button>
            <button
              onClick={() => setSelectedFilter('mastered')}
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                selectedFilter === 'mastered'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Mastered ({masteredCount})
            </button>
            <button
              onClick={() => setSelectedFilter('bookmarked')}
              className={`px-2 py-1 rounded-md text-xs font-medium ${
                selectedFilter === 'bookmarked'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Saved ({bookmarkedCount})
            </button>
          </div>
        </div>

        {/* Source Document Filter Row */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-500 font-semibold shrink-0 text-[11px] mr-1">Source Document:</span>
          <button
            onClick={() => setSelectedDocSource('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
              selectedDocSource === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Documents ({flashcards.length})
          </button>
          {docSources.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocSource(doc.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors flex items-center space-x-1.5 ${
                selectedDocSource === doc.id
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{doc.category === 'lecture_notes' ? '📖' : '📄'}</span>
              <span className="truncate max-w-[170px] sm:max-w-[220px]">{doc.filename}</span>
              <span className="opacity-75 font-mono text-[10px]">({doc.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Flashcard Interactive Area */}
      {filteredCards.length === 0 || !currentCard ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto aspect-square">
            <Layers className="w-6 h-6 shrink-0 aspect-square" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No flashcards found</h3>
          <p className="text-xs text-slate-500">
            No cards match the active filters. Try selecting "All Units" or resetting your filter criteria.
          </p>
          <button
            onClick={() => {
              setSelectedUnit('all');
              setSelectedCategory('all');
              setSelectedFilter('all');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors inline-block mt-2"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Card Meta & Navigation Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900">
                Card {safeIndex + 1} of {filteredCards.length}
              </span>
              <span>·</span>
              <span>Unit {currentCard.unitNumber}</span>
              <span>·</span>
              <span className="truncate max-w-[150px] sm:max-w-[220px]">
                {currentCard.topicName}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Space to flip · Arrows to navigate
              </span>
              <button
                onClick={handleToggleBookmark}
                className={`p-1 rounded-md transition-colors ${
                  currentCard.isBookmarked
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={currentCard.isBookmarked ? 'Remove bookmark' : 'Bookmark card'}
              >
                <Bookmark className="w-4 h-4 shrink-0 aspect-square fill-current" />
              </button>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped((prev) => !prev)}
            className="relative w-full min-h-[320px] sm:min-h-[360px] cursor-pointer perspective-1000 select-none group"
          >
            <div
              className={`relative w-full h-full min-h-[320px] sm:min-h-[360px] rounded-2xl border transition-all duration-500 transform-style-preserve-3d shadow-xs hover:shadow-md ${
                isFlipped ? 'rotate-y-180' : ''
              } ${
                isFlipped
                  ? 'bg-white border-indigo-200'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              {/* FRONT SIDE (Prompt / Question / Term) */}
              <div className="absolute inset-0 w-full h-full p-6 sm:p-8 flex flex-col justify-between backface-hidden rounded-2xl">
                <div>
                  {/* Top metadata tags */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {currentCard.category}
                      </span>
                      {currentCard.examMarks && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                          {currentCard.examMarks} Marks
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <RotateCw className="w-3 h-3 shrink-0 aspect-square" />
                      <span>Click to flip</span>
                    </span>
                  </div>

                  {/* Main Question Text */}
                  <div className="mt-4">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {currentCard.front}
                    </h3>

                    {currentCard.hint && (
                      <div className="mt-4 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 shrink-0 aspect-square text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-semibold">Hint: </span>
                          <span>{currentCard.hint}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Source Reference */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[280px]">
                    Source: {currentCard.sourceDocName}
                  </span>
                  <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Reveal Answer →
                  </span>
                </div>
              </div>

              {/* BACK SIDE (Answer / Explanation / Derivation) */}
              <div className="absolute inset-0 w-full h-full p-6 sm:p-8 flex flex-col justify-between backface-hidden rotate-y-180 rounded-2xl bg-slate-900 text-white overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                        {currentCard.category} Solution
                      </span>
                      <span className="text-slate-400">Unit {currentCard.unitNumber}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleCopyText(currentCard.back, currentCard.id, e)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === currentCard.id ? (
                          <Check className="w-3.5 h-3.5 shrink-0 aspect-square text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 shrink-0 aspect-square" />
                        )}
                      </button>
                      <span className="text-[11px] flex items-center gap-1 text-slate-400">
                        <RotateCw className="w-3 h-3 shrink-0 aspect-square" />
                        <span>Flip back</span>
                      </span>
                    </div>
                  </div>

                  {/* Answer Content */}
                  <div className="space-y-3">
                    <div className="text-sm sm:text-base text-slate-100 whitespace-pre-line font-normal leading-relaxed">
                      {currentCard.back}
                    </div>

                    {currentCard.keyFormula && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-800/90 border border-slate-700 font-mono text-xs text-indigo-300">
                        <span className="block text-[10px] text-slate-400 font-sans uppercase font-bold mb-1">
                          Key Equation:
                        </span>
                        {currentCard.keyFormula}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Source Reference */}
                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[320px]">
                    Verified against {currentCard.sourceDocName}
                  </span>
                  <span className="text-slate-300">Review rating below ↓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Self-Rating & Navigation Controls */}
          <div className="space-y-3">
            {/* Rating Buttons */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 pl-1">
                Rate your recall:
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSetMastery('review')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    currentCard.masteryStatus === 'review'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                      : 'border-slate-200 hover:bg-rose-50/50 text-slate-700 hover:text-rose-700'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 aspect-square text-rose-500" />
                  <span>Still Learning</span>
                </button>

                <button
                  onClick={() => handleSetMastery('learning')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    currentCard.masteryStatus === 'learning'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
                      : 'border-slate-200 hover:bg-amber-50/50 text-slate-700 hover:text-amber-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0 aspect-square text-amber-500" />
                  <span>Getting There</span>
                </button>

                <button
                  onClick={() => handleSetMastery('mastered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    currentCard.masteryStatus === 'mastered'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                      : 'border-slate-200 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 aspect-square text-emerald-500" />
                  <span>Mastered</span>
                </button>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={safeIndex === 0}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ChevronLeft className="w-4 h-4 shrink-0 aspect-square" />
                <span>Previous Card</span>
              </button>

              <div className="flex items-center gap-1">
                {filteredCards.slice(0, 10).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsFlipped(false);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      safeIndex === idx
                        ? 'w-6 bg-indigo-600'
                        : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
                {filteredCards.length > 10 && (
                  <span className="text-[10px] text-slate-400 ml-1">
                    +{filteredCards.length - 10}
                  </span>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={safeIndex >= filteredCards.length - 1}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Next Card</span>
                <ChevronRight className="w-4 h-4 shrink-0 aspect-square" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Flashcard Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Add Custom Study Flashcard
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5 shrink-0 aspect-square" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Front (Question / Prompt / Term)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. State the condition for oscillation in a Barkhausen criterion..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Back (Solution / Explanation / Equation)
                </label>
                <textarea
                  rows={4}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. The loop gain must equal unity (|Aβ| = 1) and total phase shift must be 0° or 360°..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none text-slate-800"
                  >
                    {syllabus && syllabus.units && syllabus.units.length > 0
                      ? syllabus.units.map((u) => (
                          <option key={u.number} value={u.number}>
                            Unit {u.number}: {u.title}
                          </option>
                        ))
                      : availableUnits.map((u) => (
                          <option key={u} value={u}>
                            Unit {u}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none text-slate-800"
                  >
                    <option value="Formula">Formula</option>
                    <option value="Definition">Definition</option>
                    <option value="Concept">Concept</option>
                    <option value="Exam Question">Exam Question</option>
                    <option value="Derivation">Derivation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Barkhausen Criterion & Feedback"
                  className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
