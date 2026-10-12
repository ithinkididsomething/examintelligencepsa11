/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { createEmptyCourse, createEmptySyllabus, deriveCourseFromDocument } from './data/demoData';
import {
  Course,
  DataQualityReport,
  ExamDocument,
  ExtractedQuestion,
  Flashcard,
  Syllabus,
  SyllabusUnit,
  TopicAnalytics,
  WorkspaceExport,
} from './types';
import { calculateTopicAnalytics } from './services/analyticsEngine';
import { generateRevisionPlan } from './services/revisionPlanner';
import { classifyQuestionType, estimateDifficulty } from './services/classifier';
import { mapQuestionToTopic } from './services/topicMatcher';
import { parseExamPaperText } from './services/questionParser';
import { analyzeNotesDocument } from './services/notesAnalyzer';

import { Header } from './components/Header';
import { DataQualityBanner } from './components/DataQualityBanner';
import { StudyPrioritiesView } from './components/StudyPrioritiesView';
import { AnalyticsView } from './components/AnalyticsView';
import { DocumentUploadView } from './components/DocumentUploadView';
import { QuestionExplorerView } from './components/QuestionExplorerView';
import { SyllabusView } from './components/SyllabusView';
import { RevisionPlannerView } from './components/RevisionPlannerView';
import { NotesAnalysisView } from './components/NotesAnalysisView';
import { FlashcardsView } from './components/FlashcardsView';
import { WhyModal } from './components/WhyModal';
import { DocumentInspectorModal } from './components/DocumentInspectorModal';
import { NewCourseModal } from './components/NewCourseModal';
import { AnalyzeConfirmModal } from './components/AnalyzeConfirmModal';
import { GeminiGeneratorModal, GeminiModalMode } from './components/GeminiGeneratorModal';
import { buildFlashcardsFromAllDocuments } from './services/flashcardService';
import {
  analyzeDocumentWithGemini,
  batchAnalyzeDocumentsWithGemini,
  extractExamQuestionsWithGemini,
  generateSectionQuestionsWithGemini,
} from './services/geminiService';
import {
  syllabusUnitsFromBundle,
  notesAnalysisFromBundle,
  flashcardsFromBundle,
  mapRawQuestions,
} from './services/aiBundleMapper';

export default function App() {
  // Course State (starts empty; auto-created from the first uploaded document)
  const [course, setCourse] = useState<Course>(() => createEmptyCourse());
  const [syllabus, setSyllabus] = useState<Syllabus>(() => createEmptySyllabus(''));
  const [documents, setDocuments] = useState<ExamDocument[]>([]);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // App Navigation & Controls
  const [activeTab, setActiveTab] = useState<string>('papers');
  const [examDate, setExamDate] = useState<string>(course.examDate);
  const [dailyHours, setDailyHours] = useState<number>(course.availableStudyHoursPerDay);

  // Modal State
  const [whyModalTopic, setWhyModalTopic] = useState<TopicAnalytics | null>(null);
  const [inspectingDoc, setInspectingDoc] = useState<ExamDocument | null>(null);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);

  // Gemini Academic Intelligence Modal State
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiModalMode, setGeminiModalMode] = useState<GeminiModalMode>('flashcards');
  const [geminiModalDocId, setGeminiModalDocId] = useState<string | undefined>(undefined);
  const [geminiModalTopicName, setGeminiModalTopicName] = useState<string | undefined>(undefined);
  const [geminiModalExcerpt, setGeminiModalExcerpt] = useState<string | undefined>(undefined);
  const [isAnalyzingAllDocuments, setIsAnalyzingAllDocuments] = useState(false);
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState('');

  // Autonomous document analysis state
  const [pendingDocs, setPendingDocs] = useState<ExamDocument[] | null>(null);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [autoAnalyzeMessage, setAutoAnalyzeMessage] = useState('');
  const [autoGenProgress, setAutoGenProgress] = useState<{
    label: string;
    current: number;
    total: number;
    questions: number;
  } | null>(null);
  const [autoAnalyzeAlways, setAutoAnalyzeAlways] = useState<boolean>(() => {
    try {
      return localStorage.getItem('exam_auto_analyze') === '1';
    } catch {
      return false;
    }
  });

  // Synchronize examDate / dailyHours when course changes
  useEffect(() => {
    setExamDate(course.examDate);
    setDailyHours(course.availableStudyHoursPerDay);
  }, [course]);

  // Unique years represented across papers
  const allYears = useMemo(() => {
    const years = documents.map((d) => d.year).filter(Boolean);
    return Array.from(new Set(years)).sort((a, b) => a - b);
  }, [documents]);

  // Notes Documents & Active Notes Selection
  const [selectedNotesDocId, setSelectedNotesDocId] = useState<string | null>(null);
  const notesDocuments = useMemo(() => {
    return documents.filter((d) => d.category === 'lecture_notes' || d.notesAnalysis !== undefined);
  }, [documents]);

  const activeNotesDoc = useMemo(() => {
    if (selectedNotesDocId) {
      const found = documents.find((d) => d.id === selectedNotesDocId);
      if (found) return found;
    }
    return notesDocuments[0] || null;
  }, [selectedNotesDocId, notesDocuments, documents]);

  // Real-time deterministic topic analytics
  const topicAnalytics = useMemo(() => {
    const examPapersCount = documents.filter((d) => d.category !== 'lecture_notes').length;
    return calculateTopicAnalytics(
      questions,
      syllabus,
      Math.max(examPapersCount, 1),
      allYears,
      activeNotesDoc?.notesAnalysis?.topicCoverages
    );
  }, [questions, syllabus, documents, allYears, activeNotesDoc]);

  // Real-time personalized revision plan
  const [completedSessionIds, setCompletedSessionIds] = useState<Set<string>>(new Set());
  const [practicedQuestionIds, setPracticedQuestionIds] = useState<Set<string>>(new Set());

  const handleTogglePracticedQuestion = (questionId: string) => {
    setPracticedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const revisionPlanBase = useMemo(() => {
    return generateRevisionPlan(course.id, examDate, dailyHours, topicAnalytics, syllabus);
  }, [course.id, examDate, dailyHours, topicAnalytics, syllabus]);

  // Merge completion status with generated revision plan
  const revisionPlan = useMemo(() => {
    return {
      ...revisionPlanBase,
      sessions: revisionPlanBase.sessions.map((s) => ({
        ...s,
        completed: completedSessionIds.has(s.id),
      })),
    };
  }, [revisionPlanBase, completedSessionIds]);

  // Data Quality Audit Report
  const dataQualityReport: DataQualityReport = useMemo(() => {
    const totalDocs = documents.length;
    const totalQ = questions.length;
    const accepted = questions.filter((q) => q.reviewStatus === 'Accepted').length;
    const needsReview = questions.filter((q) => q.reviewStatus === 'Needs Review').length;
    const rejected = questions.filter((q) => q.reviewStatus === 'Rejected').length;
    const missingMarks = questions.filter((q) => q.marks === null).length;
    const unmapped = questions.filter((q) => !q.mappedTopicId).length;
    const lowConf = questions.filter((q) => q.mappingConfidence === 'Low').length;

    const warnings: string[] = [];

    if (totalDocs < 2 && totalDocs > 0) {
      warnings.push('Only 1 paper uploaded. Trend analysis requires at least 2 distinct exam sessions.');
    }
    if (needsReview > 0) {
      warnings.push(`${needsReview} question(s) flagged for review due to short text, missing marks, or low OCR score.`);
    }
    if (missingMarks > 0) {
      warnings.push(`${missingMarks} question(s) without detected marks; mark weightage calculation assumes 0 until verified.`);
    }
    if (unmapped > 0) {
      warnings.push(`${unmapped} question(s) could not be mapped to any syllabus topic.`);
    }

    // Deterministic overall data quality score
    let score = 95;
    if (totalDocs < 2) score -= 15;
    if (totalQ > 0) {
      const reviewRatio = needsReview / totalQ;
      score -= Math.round(reviewRatio * 20);
      const missingMarksRatio = missingMarks / totalQ;
      score -= Math.round(missingMarksRatio * 15);
      const unmappedRatio = unmapped / totalQ;
      score -= Math.round(unmappedRatio * 15);
    } else {
      score = totalDocs === 0 ? 100 : 40;
    }

    return {
      overallConfidenceScore: Math.max(20, Math.min(99, score)),
      totalDocuments: totalDocs,
      totalQuestions: totalQ,
      acceptedQuestionsCount: accepted,
      needsReviewQuestionsCount: needsReview,
      rejectedQuestionsCount: rejected,
      missingMarksCount: missingMarks,
      unmappedQuestionsCount: unmapped,
      lowConfidenceMappingsCount: lowConf,
      yearsSpan: allYears.length,
      warnings,
    };
  }, [documents, questions, allYears]);

  // Autonomous multi-document analysis: notes, flashcards, exhaustive questions, cheat sheet
  const runDocumentAutoGeneration = async (docs: ExamDocument[]) => {
    setIsAutoAnalyzing(true);
    setIsAnalyzingAllDocuments(true);
    const initialMsg = `Analyzing ${docs.length} document${docs.length === 1 ? '' : 's'} with Gemini...`;
    setAutoAnalyzeMessage(initialMsg);
    setAnalysisProgressMessage(initialMsg);
    setAutoGenProgress({ label: initialMsg, current: 0, total: docs.length, questions: 0 });

    const allUnits: SyllabusUnit[] = [];
    const docPatches = new Map<string, Partial<ExamDocument>>();
    const allQuestions: ExtractedQuestion[] = [];
    const allFlashcards: Flashcard[] = [];
    let detectedSubject = '';
    let detectedTags: string[] = [];
    let anySuccess = false;
    let totalQuestions = 0;

    const normalizeQ = (text: string) =>
      (text || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
        .slice(0, 140);

    const announce = (
      label: string,
      current: number,
      total: number
    ) => {
      setAutoAnalyzeMessage(label);
      setAnalysisProgressMessage(label);
      setAutoGenProgress({ label, current, total, questions: totalQuestions });
    };

    try {
      for (let di = 0; di < docs.length; di++) {
        const doc = docs[di];
        announce(
          `Analyzing structure of ${doc.filename} (${di + 1}/${docs.length})...`,
          di,
          docs.length
        );

        const bundle = await analyzeDocumentWithGemini({
          documentText: doc.rawText,
          docName: doc.filename,
          category: doc.category,
          courseName: course.name,
          courseCode: course.code,
          courseTags: course.tags,
        });

        if (!bundle) {
          docPatches.set(doc.id, {
            warnings: [...doc.warnings, 'AI analysis unavailable for this document; used deterministic extraction.'],
          });
          continue;
        }

        anySuccess = true;
        if (!detectedSubject && bundle.detectedSubject) detectedSubject = bundle.detectedSubject;
        if (detectedTags.length === 0 && bundle.detectedTags?.length) detectedTags = bundle.detectedTags;

        const units = syllabusUnitsFromBundle(bundle, doc.id);
        allUnits.push(...units);

        const docInfo = { id: doc.id, filename: doc.filename, year: doc.year, session: doc.session };
        const isNotes = doc.category === 'lecture_notes';

        if (isNotes) {
          // Lecture notes: guarantee >= 4 questions for every definable section (topic)
          let sectionsWithUnit = units
            .filter((u) => u.topics.length > 0)
            .map((u) => ({
              unit: u,
              sections: u.topics.map((t) => ({ name: t.name, description: t.description })),
            }));

          // If the model found no granular topics, synthesize a single section
          if (sectionsWithUnit.length === 0) {
            sectionsWithUnit = [
              {
                unit: { id: `unit-ai-${doc.id}-1`, number: 1, title: detectedSubject || 'Core Concepts', topics: [] },
                sections: [
                  {
                    name: detectedSubject || 'Core Concepts',
                    description: (bundle.notesSummary || '').slice(0, 160),
                  },
                ],
              },
            ];
          }

          for (let si = 0; si < sectionsWithUnit.length; si++) {
            const { unit, sections } = sectionsWithUnit[si];
            announce(
              `Generating questions for "${unit.title}" — ${sections.length} section(s), min 4 each (${si + 1}/${sectionsWithUnit.length})...`,
              si,
              sectionsWithUnit.length
            );

            const rawQs = await generateSectionQuestionsWithGemini({
              documentText: doc.rawText,
              docName: doc.filename,
              detectedSubject: bundle.detectedSubject,
              unitNumber: unit.number,
              unitTitle: unit.title,
              sections,
              minPerSection: 4,
              courseName: course.name,
              courseCode: course.code,
              courseTags: course.tags,
            });

            const mapped = mapRawQuestions(rawQs, docInfo, units.length > 0 ? units : [unit]);
            allQuestions.push(...mapped);
            totalQuestions += mapped.length;
          }
        } else {
          // Exam paper: exhaustively extract EVERY question
          announce(`Extracting every question from ${doc.filename}...`, di, docs.length);
          const rawQs = await extractExamQuestionsWithGemini({
            documentText: doc.rawText,
            docName: doc.filename,
            detectedSubject: bundle.detectedSubject,
            courseName: course.name,
            courseCode: course.code,
            courseTags: course.tags,
          });
          const mapped = mapRawQuestions(rawQs, docInfo, units);
          allQuestions.push(...mapped);
          totalQuestions += mapped.length;
        }

        const patch: Partial<ExamDocument> = {
          detectedSubject: bundle.detectedSubject,
          aiSummary: bundle.notesSummary,
          aiKeyTakeaways: bundle.keyTakeaways,
        };
        if (bundle.cheatSheet) patch.cheatSheet = bundle.cheatSheet;
        if (isNotes) {
          patch.notesAnalysis = notesAnalysisFromBundle(doc.id, doc.filename, bundle, units);
        }
        docPatches.set(doc.id, patch);

        allFlashcards.push(
          ...flashcardsFromBundle(bundle, { id: doc.id, filename: doc.filename }, units)
        );
      }

      if (anySuccess) {
        // Auto-create / refine the course from the detected subject
        setCourse((prev) => {
          if (prev.name === 'Untitled Course' && detectedSubject) {
            return deriveCourseFromDocument(prev, detectedSubject, detectedTags, docs[0].filename);
          }
          return prev;
        });

        // Merge AI-derived syllabus units (dedupe by unit title)
        if (allUnits.length > 0) {
          setSyllabus((prev) => {
            const existingTitles = new Set(prev.units.map((u) => u.title.toLowerCase()));
            const freshUnits = allUnits.filter((u) => !existingTitles.has(u.title.toLowerCase()));
            if (freshUnits.length === 0) return prev;
            return { courseId: prev.courseId || course.id, units: [...prev.units, ...freshUnits] };
          });
        }

        if (docPatches.size > 0) {
          setDocuments((prev) =>
            prev.map((d) => (docPatches.has(d.id) ? { ...d, ...docPatches.get(d.id) } : d))
          );
        }

        if (allQuestions.length > 0) {
          setQuestions((prev) => {
            const seen = new Set(prev.map((q) => normalizeQ(q.cleanedText)));
            const uniqueNew = allQuestions.filter((q) => {
              const key = normalizeQ(q.cleanedText);
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return [...uniqueNew, ...prev];
          });
        }

        if (allFlashcards.length > 0) {
          setFlashcards((prev) => {
            const seen = new Set(prev.map((c) => c.front.trim().toLowerCase()));
            const unique = allFlashcards.filter((c) => !seen.has(c.front.trim().toLowerCase()));
            return [...unique, ...prev];
          });
        }

        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.warn('Autonomous document analysis failed:', err);
    } finally {
      setIsAutoAnalyzing(false);
      setIsAnalyzingAllDocuments(false);
      setAutoAnalyzeMessage('');
      setAnalysisProgressMessage('');
      setAutoGenProgress(null);
      setPendingDocs(null);
    }
  };

  const handleConfirmAnalyze = (always: boolean) => {
    if (always) {
      setAutoAnalyzeAlways(true);
      try {
        localStorage.setItem('exam_auto_analyze', '1');
      } catch {
        /* ignore */
      }
    }
    const docs = pendingDocs || [];
    if (docs.length > 0) {
      runDocumentAutoGeneration(docs);
    } else {
      setPendingDocs(null);
    }
  };

  const handleSkipAnalyze = () => setPendingDocs(null);

  // Handler for adding uploaded documents
  const handleAddDocuments = (newDocs: ExamDocument[], newParsedQuestions: any[]) => {
    const workDocs = newDocs.map((d) => ({ ...d, courseId: course.id }));

    // Process new questions with classifier & topic mapping
    const fullyProcessed: ExtractedQuestion[] = newParsedQuestions.map((raw) => {
      const typeResult = classifyQuestionType(raw.cleanedText);
      const diffResult = estimateDifficulty(raw.cleanedText, raw.marks, typeResult.questionType);
      const mapResult = mapQuestionToTopic(raw.cleanedText, syllabus);

      return {
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        paperId: raw.paperId,
        paperName: raw.paperName,
        paperYear: raw.paperYear,
        paperSession: raw.paperSession,
        pageNumber: raw.pageNumber || 1,
        rawQuestionNumber: raw.rawQuestionNumber,
        questionNumber: raw.questionNumber,
        subQuestion: raw.subQuestion,
        originalText: raw.originalText,
        cleanedText: raw.cleanedText,
        marks: raw.marks,
        extractionConfidence: raw.extractionConfidence,
        reviewStatus: raw.reviewStatus,
        qualityFlags: raw.qualityFlags || [],
        questionType: typeResult.questionType,
        typeConfidence: typeResult.typeConfidence,
        typeReason: typeResult.typeReason,
        difficulty: diffResult.difficulty,
        difficultyConfidence: diffResult.difficultyConfidence,
        difficultyReason: diffResult.difficultyReason,
        mappedTopicId: mapResult.mappedTopicId,
        mappedTopicName: mapResult.mappedTopicName,
        unitNumber: mapResult.unitNumber,
        mappingConfidence: mapResult.mappingConfidence,
        mappingConfidenceScore: mapResult.mappingConfidenceScore,
        mappingReason: mapResult.mappingReason,
        mappingMethod: mapResult.mappingMethod,
        alternativeTopics: mapResult.alternativeTopics,
      };
    });

    const newFlashcards = buildFlashcardsFromAllDocuments(workDocs, fullyProcessed, syllabus);

    setDocuments((prev) => [...prev, ...workDocs]);
    setQuestions((prev) => [...prev, ...fullyProcessed]);
    if (newFlashcards.length > 0) {
      setFlashcards((prev) => [...newFlashcards, ...prev]);
    }
    setActiveTab('papers');

    // Trigger autonomous generation (per-document confirmation unless opted out)
    const analyzable = workDocs.filter(
      (d) => d.rawText.trim().length > 0 && d.processingStage !== 'failed'
    );
    if (analyzable.length > 0) {
      if (autoAnalyzeAlways) {
        runDocumentAutoGeneration(analyzable);
      } else {
        setPendingDocs(analyzable);
      }
    }
  };

  // Automatically analyze all uploaded papers and notes with Gemini to form clear question flashcards
  const handleAutoGenerateAllFlashcards = async () => {
    setIsAnalyzingAllDocuments(true);
    setAnalysisProgressMessage(
      `Analyzing ${documents.length} uploaded papers and lecture notes with Gemini...`
    );

    try {
      const aiCards = await batchAnalyzeDocumentsWithGemini(
        documents.map((d) => ({
          ...d,
          category: d.category || 'exam_paper',
        })),
        4,
        course.name,
        course.code,
        course.tags
      );
      if (aiCards.length > 0) {
        setFlashcards((prev) => {
          const seen = new Set(prev.map((c) => c.front.trim().toLowerCase()));
          const newUnique = aiCards.filter((c) => !seen.has(c.front.trim().toLowerCase()));
          return [...newUnique, ...prev];
        });
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        setIsAnalyzingAllDocuments(false);
        setAnalysisProgressMessage('');
        return;
      }
    } catch (err) {
      console.warn('Batch Gemini analysis fallback:', err);
    } finally {
      setIsAnalyzingAllDocuments(false);
      setAnalysisProgressMessage('');
    }

    // High-fidelity fallback across all documents & questions
    const allCards = buildFlashcardsFromAllDocuments(documents, questions, syllabus);
    setFlashcards(allCards);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  // Handler for deleting a document and its questions
  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setQuestions((prev) => prev.filter((q) => q.paperId !== docId));
    if (selectedNotesDocId === docId) {
      setSelectedNotesDocId(null);
    }
  };

  // Gemini Academic Intelligence Handlers
  const handleOpenGeminiModal = (
    mode: GeminiModalMode = 'flashcards',
    docId?: string,
    topicName?: string,
    excerpt?: string
  ) => {
    setGeminiModalMode(mode);
    setGeminiModalDocId(docId || activeNotesDoc?.id || documents[0]?.id);
    setGeminiModalTopicName(topicName || '');
    setGeminiModalExcerpt(excerpt || '');
    setIsGeminiModalOpen(true);
  };

  const handleAddGeminiFlashcards = (newCards: Flashcard[]) => {
    setFlashcards((prev) => [...newCards, ...prev]);
  };

  const handleAddGeminiQuestions = (newQuestions: ExtractedQuestion[]) => {
    setQuestions((prev) => [...newQuestions, ...prev]);
  };

  // Handler for updating a single question
  const handleUpdateQuestion = (updated: ExtractedQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  };

  // Handler for updating syllabus
  const handleUpdateSyllabus = (updated: Syllabus) => {
    setSyllabus(updated);
    // Re-map existing questions with new syllabus topics
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.mappingMethod === 'manual') return q; // Preserve manual overrides
        const reMapped = mapQuestionToTopic(q.cleanedText, updated);
        return {
          ...q,
          mappedTopicId: reMapped.mappedTopicId,
          mappedTopicName: reMapped.mappedTopicName,
          unitNumber: reMapped.unitNumber,
          mappingConfidence: reMapped.mappingConfidence,
          mappingConfidenceScore: reMapped.mappingConfidenceScore,
          mappingReason: reMapped.mappingReason,
          mappingMethod: reMapped.mappingMethod,
          alternativeTopics: reMapped.alternativeTopics,
        };
      })
    );
  };

  // Handler for saving edited raw text for a document
  const handleSaveDocumentRawText = (docId: string, updatedText: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;

    if (doc.category === 'lecture_notes' || doc.notesAnalysis !== undefined) {
      const updatedAnalysis = analyzeNotesDocument(doc.id, doc.filename, updatedText, syllabus);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                rawText: updatedText,
                notesAnalysis: updatedAnalysis,
                warnings: [],
              }
            : d
        )
      );
      return;
    }

    // Re-detect questions from updated raw text for exam papers
    const reParsed = parseExamPaperText(
      updatedText,
      doc.id,
      doc.filename,
      doc.year,
      doc.session
    );

    const reProcessed: ExtractedQuestion[] = reParsed.map((raw) => {
      const typeResult = classifyQuestionType(raw.cleanedText);
      const diffResult = estimateDifficulty(raw.cleanedText, raw.marks, typeResult.questionType);
      const mapResult = mapQuestionToTopic(raw.cleanedText, syllabus);

      return {
        id: `q-reparsed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        paperId: doc.id,
        paperName: doc.filename,
        paperYear: doc.year,
        paperSession: doc.session,
        pageNumber: raw.pageNumber,
        rawQuestionNumber: raw.rawQuestionNumber,
        questionNumber: raw.questionNumber,
        subQuestion: raw.subQuestion,
        originalText: raw.originalText,
        cleanedText: raw.cleanedText,
        marks: raw.marks,
        extractionConfidence: raw.extractionConfidence,
        reviewStatus: raw.reviewStatus,
        qualityFlags: raw.qualityFlags,
        questionType: typeResult.questionType,
        typeConfidence: typeResult.typeConfidence,
        typeReason: typeResult.typeReason,
        difficulty: diffResult.difficulty,
        difficultyConfidence: diffResult.difficultyConfidence,
        difficultyReason: diffResult.difficultyReason,
        mappedTopicId: mapResult.mappedTopicId,
        mappedTopicName: mapResult.mappedTopicName,
        unitNumber: mapResult.unitNumber,
        mappingConfidence: mapResult.mappingConfidence,
        mappingConfidenceScore: mapResult.mappingConfidenceScore,
        mappingReason: mapResult.mappingReason,
        mappingMethod: mapResult.mappingMethod,
        alternativeTopics: mapResult.alternativeTopics,
      };
    });

    // Update document
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              rawText: updatedText,
              extractedQuestionsCount: reProcessed.length,
              warnings: [],
            }
          : d
      )
    );

    // Replace questions for this paper
    setQuestions((prev) => [
      ...prev.filter((q) => q.paperId !== docId),
      ...reProcessed,
    ]);
  };

  // Toggle completed revision session
  const handleToggleSession = (sessionId: string) => {
    setCompletedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
        // Small confetti trigger when completing a session
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 },
        });
      }
      return next;
    });
  };

  // Flashcard Handlers
  const handleUpdateFlashcard = (updated: Flashcard) => {
    setFlashcards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleAddFlashcard = (newCard: Flashcard) => {
    setFlashcards((prev) => [newCard, ...prev]);
  };

  // Clear the entire workspace (fresh start)
  const handleClearWorkspace = () => {
    const freshCourse = createEmptyCourse();
    setCourse(freshCourse);
    setSyllabus(createEmptySyllabus(freshCourse.id));
    setDocuments([]);
    setQuestions([]);
    setFlashcards([]);
    setSelectedNotesDocId(null);
    setExamDate(freshCourse.examDate);
    setDailyHours(freshCourse.availableStudyHoursPerDay);
    setCompletedSessionIds(new Set());
    setPracticedQuestionIds(new Set());
    setActiveTab('papers');
  };

  // Create new blank or custom course
  const handleCreateCourse = (newCourse: Course) => {
    setCourse(newCourse);
    setDocuments([]);
    setQuestions([]);
    setFlashcards([]);
    setSelectedNotesDocId(null);
    // Start with an empty syllabus; it is populated from uploaded documents or manually.
    setSyllabus(createEmptySyllabus(newCourse.id));
    setExamDate(newCourse.examDate);
    setDailyHours(newCourse.availableStudyHoursPerDay);
    setCompletedSessionIds(new Set());
    setPracticedQuestionIds(new Set());
    setActiveTab('papers');
  };

  // Handler for dynamically updating course tags
  const handleUpdateCourseTags = (newTags: string[]) => {
    setCourse((prev) => ({
      ...prev,
      tags: newTags,
    }));
  };

  // Export the entire workspace to a downloadable JSON file
  const handleExportWorkspace = () => {
    const payload: WorkspaceExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      course,
      syllabus,
      documents,
      questions,
      flashcards,
      examDate,
      dailyHours,
      completedSessionIds: Array.from(completedSessionIds),
      practicedQuestionIds: Array.from(practicedQuestionIds),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(course.code || 'workspace').replace(/\s+/g, '_')}-exam-intelligence.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import a previously exported workspace JSON, restoring it exactly
  const handleImportWorkspace = (data: any) => {
    if (!data || typeof data !== 'object' || !data.course) {
      window.alert('Invalid workspace file. Please select a valid exported JSON file.');
      return;
    }

    const restoredCourse: Course = data.course;
    setCourse(restoredCourse);
    setSyllabus(
      data.syllabus && Array.isArray(data.syllabus.units)
        ? data.syllabus
        : createEmptySyllabus(restoredCourse.id)
    );
    setDocuments(Array.isArray(data.documents) ? data.documents : []);
    setQuestions(Array.isArray(data.questions) ? data.questions : []);
    setFlashcards(Array.isArray(data.flashcards) ? data.flashcards : []);
    setExamDate(data.examDate || restoredCourse.examDate);
    setDailyHours(
      typeof data.dailyHours === 'number' ? data.dailyHours : restoredCourse.availableStudyHoursPerDay
    );
    setCompletedSessionIds(new Set(Array.isArray(data.completedSessionIds) ? data.completedSessionIds : []));
    setPracticedQuestionIds(new Set(Array.isArray(data.practicedQuestionIds) ? data.practicedQuestionIds : []));
    setSelectedNotesDocId(null);
    setActiveTab('priorities');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* App Header & Navigation */}
      <Header
        currentCourse={course}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCourse={() => setIsNewCourseModalOpen(true)}
        onResetDemoData={handleClearWorkspace}
        onOpenGeminiModal={() => handleOpenGeminiModal('flashcards')}
        onUpdateCourseTags={handleUpdateCourseTags}
        onExportWorkspace={handleExportWorkspace}
        onImportWorkspace={handleImportWorkspace}
        examDate={examDate}
        setExamDate={setExamDate}
        dailyHours={dailyHours}
        setDailyHours={setDailyHours}
      />

      {/* Global Data Quality & Knowledge Base Integrity Banner */}
      <DataQualityBanner
        report={dataQualityReport}
        onNavigateToReview={() => setActiveTab('questions')}
        onNavigateToDocuments={() => setActiveTab('papers')}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeTab === 'priorities' && (
          <StudyPrioritiesView
            course={course}
            analytics={topicAnalytics}
            onOpenWhyModal={(topic) => setWhyModalTopic(topic)}
            onNavigateToRevision={() => setActiveTab('revision')}
            onNavigateToAnalytics={() => setActiveTab('analytics')}
            onNavigateToFlashcards={() => setActiveTab('flashcards')}
            practicedQuestionIds={practicedQuestionIds}
            onTogglePracticedQuestion={handleTogglePracticedQuestion}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsView
            flashcards={flashcards}
            documents={documents}
            syllabus={syllabus}
            onUpdateFlashcard={handleUpdateFlashcard}
            onAddFlashcard={handleAddFlashcard}
            onNavigateToNotes={() => setActiveTab('notes')}
            onNavigateToQuestions={() => setActiveTab('questions')}
            onOpenGeminiGenerator={() => handleOpenGeminiModal('flashcards')}
            onAutoGenerateAllFlashcards={handleAutoGenerateAllFlashcards}
            isAnalyzingDocuments={isAnalyzingAllDocuments}
            analyzingProgressMessage={analysisProgressMessage}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            analytics={topicAnalytics}
            questions={questions}
            allYears={allYears}
            uniquePapersCount={documents.length}
            onOpenWhyModal={(topic) => setWhyModalTopic(topic)}
          />
        )}

        {activeTab === 'papers' && (
          <DocumentUploadView
            documents={documents}
            syllabus={syllabus}
            onAddDocuments={handleAddDocuments}
            onDeleteDocument={handleDeleteDocument}
            onInspectDocument={(doc) => setInspectingDoc(doc)}
            onNavigateToQuestions={() => setActiveTab('questions')}
            onNavigateToNotes={() => setActiveTab('notes')}
            onOpenGeminiModal={handleOpenGeminiModal}
          />
        )}

        {activeTab === 'notes' && (
          <NotesAnalysisView
            notesDocument={activeNotesDoc}
            allDocuments={documents}
            onSelectDocument={(doc) => setSelectedNotesDocId(doc.id)}
            onInspectDocument={(doc) => setInspectingDoc(doc)}
            onNavigateToPriorities={() => setActiveTab('priorities')}
            onOpenWhyModal={(topic) => setWhyModalTopic(topic)}
            onOpenGeminiModal={handleOpenGeminiModal}
          />
        )}

        {activeTab === 'questions' && (
          <QuestionExplorerView
            questions={questions}
            syllabus={syllabus}
            onUpdateQuestion={handleUpdateQuestion}
            onOpenGeminiQuestionGenerator={() => handleOpenGeminiModal('questions')}
          />
        )}

        {activeTab === 'syllabus' && (
          <SyllabusView
            syllabus={syllabus}
            onUpdateSyllabus={handleUpdateSyllabus}
          />
        )}

        {activeTab === 'revision' && (
          <RevisionPlannerView
            plan={revisionPlan}
            onToggleSession={handleToggleSession}
            onRegeneratePlan={() => {
              // triggers re-calc by updating study hours slightly or re-generating
              setCompletedSessionIds(new Set());
            }}
            examDate={examDate}
            setExamDate={setExamDate}
            dailyHours={dailyHours}
            setDailyHours={setDailyHours}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Exam Intelligence Assistant · Works with any subject · Transparent exam analysis & study optimization.
          </p>
          <div className="flex items-center space-x-4 text-slate-600">
            <span>Deterministic Analytics</span>
            <span>·</span>
            <span>Grounded in your uploads</span>
            <span>·</span>
            <button
              onClick={handleClearWorkspace}
              className="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors"
            >
              Clear Workspace
            </button>
          </div>
        </div>
      </footer>

      {/* Why This Topic Modal */}
      {whyModalTopic && (
        <WhyModal
          topic={whyModalTopic}
          onClose={() => setWhyModalTopic(null)}
          onInspectQuestion={(qId) => {
            setWhyModalTopic(null);
            setActiveTab('questions');
          }}
          practicedQuestionIds={practicedQuestionIds}
          onTogglePracticedQuestion={handleTogglePracticedQuestion}
        />
      )}

      {/* Document OCR & Raw Text Inspector Modal */}
      {inspectingDoc && (
        <DocumentInspectorModal
          document={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
          onSaveRawText={handleSaveDocumentRawText}
        />
      )}

      {/* New Course Modal */}
      <NewCourseModal
        isOpen={isNewCourseModalOpen}
        onClose={() => setIsNewCourseModalOpen(false)}
        onCreateCourse={handleCreateCourse}
        onLoadDemo={handleClearWorkspace}
      />

      {/* Per-document auto-generation confirmation */}
      <AnalyzeConfirmModal
        isOpen={pendingDocs !== null}
        documentNames={(pendingDocs || []).map((d) => d.filename)}
        isAnalyzing={isAutoAnalyzing}
        progressMessage={autoAnalyzeMessage}
        progress={autoGenProgress}
        onConfirm={handleConfirmAnalyze}
        onSkip={handleSkipAnalyze}
      />

      {/* Gemini Academic Intelligence Generator Modal */}
      <GeminiGeneratorModal
        isOpen={isGeminiModalOpen}
        initialMode={geminiModalMode}
        initialDocId={geminiModalDocId}
        initialTopicName={geminiModalTopicName}
        initialNotesExcerpt={geminiModalExcerpt}
        documents={documents}
        syllabus={syllabus}
        course={course}
        onClose={() => setIsGeminiModalOpen(false)}
        onAddFlashcards={handleAddGeminiFlashcards}
        onAddQuestions={handleAddGeminiQuestions}
      />
    </div>
  );
}
