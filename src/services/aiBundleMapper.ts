import {
  Difficulty,
  DocumentAnalysisBundle,
  ExtractedQuestion,
  Flashcard,
  FlashcardCategory,
  NotesAnalysisResult,
  QuestionType,
  SyllabusTopic,
  SyllabusUnit,
  TopicNotesCoverage,
} from '../types';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'topic';
}

function toDifficulty(value: string): Difficulty {
  return ['Easy', 'Medium', 'Hard'].includes(value) ? (value as Difficulty) : 'Medium';
}

function toQuestionType(value: string): QuestionType {
  return [
    'Theory',
    'Numerical',
    'Derivation',
    'Definition',
    'Conceptual',
    'Problem Solving',
    'Mixed',
  ].includes(value)
    ? (value as QuestionType)
    : 'Theory';
}

function toCategory(value: string): FlashcardCategory {
  return ['Formula', 'Definition', 'Concept', 'Exam Question', 'Derivation'].includes(value)
    ? (value as FlashcardCategory)
    : 'Concept';
}

/**
 * Builds syllabus units/topics from an AI analysis bundle, using deterministic
 * ids derived from the document id + topic slug so notes coverage and questions
 * can reference the same topic ids.
 */
export function syllabusUnitsFromBundle(
  bundle: DocumentAnalysisBundle,
  docId: string
): SyllabusUnit[] {
  if (!bundle.units || bundle.units.length === 0) return [];

  return bundle.units.map((unit, uIdx) => {
    const unitId = `unit-ai-${docId}-${unit.number || uIdx + 1}`;
    const topics: SyllabusTopic[] = (unit.topics || []).map((t) => ({
      id: `topic-ai-${docId}-${slugify(t.name)}`,
      unitId,
      unitNumber: unit.number || uIdx + 1,
      name: t.name,
      description: t.description || '',
      keywords: Array.isArray(t.keywords) ? t.keywords : [],
      synonyms: Array.isArray(t.synonyms) ? t.synonyms : [],
      userConfidence: 'unrated',
    }));
    return {
      id: unitId,
      number: unit.number || uIdx + 1,
      title: unit.title || `Unit ${uIdx + 1}`,
      topics,
    };
  });
}

/**
 * Builds a NotesAnalysisResult from an AI bundle, keyed to the syllabus units
 * derived from the same bundle.
 */
export function notesAnalysisFromBundle(
  docId: string,
  docName: string,
  bundle: DocumentAnalysisBundle,
  units: SyllabusUnit[]
): NotesAnalysisResult {
  const topicCoverages: TopicNotesCoverage[] = [];

  units.forEach((unit) => {
    unit.topics.forEach((topic) => {
      const topicFormulas = bundle.formulas
        .filter((f) => f.topicName && topic.name.toLowerCase().includes(f.topicName.toLowerCase()))
        .map((f) => f.formula);
      const topicDefs = bundle.definitions
        .filter((d) => d.topicName && topic.name.toLowerCase().includes(d.topicName.toLowerCase()))
        .map((d) => d.definition);

      topicCoverages.push({
        topicId: topic.id,
        topicName: topic.name,
        unitNumber: unit.number,
        coverageStatus: 'Comprehensive',
        pageReferences: [],
        keyFormulas: topicFormulas.slice(0, 4),
        keyDefinitions: topicDefs.slice(0, 3),
        notesExcerpt: topic.description || '',
        studyAction: 'Covered by AI document analysis. Review definitions, formulas, and worked examples.',
      });
    });
  });

  const totalTopics = topicCoverages.length;

  return {
    documentId: docId,
    documentName: docName,
    totalPages: Math.max(1, Math.ceil((bundle.notesSummary?.length || 1) / 1200)),
    overallCoverageScore: bundle.overallCoverageScore ?? 80,
    highPriorityCoverageScore: bundle.overallCoverageScore ?? 80,
    topicsCoveredCount: totalTopics,
    totalSyllabusTopics: totalTopics,
    criticalGaps: [],
    topicCoverages,
    extractedFormulas: bundle.formulas.map((f, i) => ({
      id: `${docId}-f-${i}`,
      formula: f.formula,
      label: f.label,
      topicName: f.topicName,
      unitNumber: f.unitNumber || 1,
      page: 1,
    })),
    extractedDefinitions: bundle.definitions.map((d, i) => ({
      id: `${docId}-d-${i}`,
      term: d.term,
      definition: d.definition,
      topicName: d.topicName,
      unitNumber: d.unitNumber || 1,
      page: 1,
    })),
    keyTakeaways: bundle.keyTakeaways || [],
    notesQualityScore: bundle.overallCoverageScore ?? 80,
  };
}

function findTopicByName(units: SyllabusUnit[], name: string): SyllabusTopic | undefined {
  const lower = (name || '').toLowerCase();
  for (const u of units) {
    for (const t of u.topics) {
      if (t.name.toLowerCase() === lower) return t;
      if (lower && (t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()))) return t;
    }
  }
  return undefined;
}

/**
 * Raw AI question shape (matches DocumentAnalysisBundle.questions and the output
 * of the extract / section-generation endpoints).
 */
export interface RawMappableQuestion {
  questionNumber?: string;
  questionText: string;
  questionType?: string;
  difficulty?: string;
  marks?: number;
  topicName?: string;
  modelAnswer?: string;
  markingRubric?: string;
}

/**
 * Converts a raw list of AI question objects into the app's ExtractedQuestion
 * shape, mapping each to a topic id from the provided units where possible.
 */
export function mapRawQuestions(
  rawQuestions: RawMappableQuestion[],
  doc: { id: string; filename: string; year: number; session: string },
  units: SyllabusUnit[]
): ExtractedQuestion[] {
  return (rawQuestions || []).map((q, idx) => {
    const topic = findTopicByName(units, q.topicName || '');
    const qType = toQuestionType(q.questionType || '');
    const diff = toDifficulty(q.difficulty || '');
    const marksVal = typeof q.marks === 'number' ? q.marks : 5;

    return {
      id: `q-ai-${doc.id}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      paperId: doc.id,
      paperName: `${doc.filename} (AI)` ,
      paperYear: doc.year,
      paperSession: doc.session,
      pageNumber: 1,
      rawQuestionNumber: q.questionNumber || `Q${idx + 1}`,
      questionNumber: idx + 1,
      originalText: q.questionText,
      cleanedText: q.questionText,
      marks: marksVal,
      extractionConfidence: 96,
      reviewStatus: 'Accepted',
      qualityFlags: [],
      questionType: qType,
      typeConfidence: 94,
      typeReason: `Classified by AI document analyzer as ${qType}.`,
      difficulty: diff,
      difficultyConfidence: 90,
      difficultyReason: `AI-rated as ${diff} based on solution depth and mark allocation.`,
      mappedTopicId: topic?.id || null,
      mappedTopicName: topic?.name || q.topicName || null,
      unitNumber: topic?.unitNumber,
      mappingConfidence: topic ? 'High' : 'Medium',
      mappingConfidenceScore: topic ? 92 : 70,
      mappingReason: q.modelAnswer
        ? `AI-generated from document. Model answer: ${q.modelAnswer.slice(0, 160)}${q.modelAnswer.length > 160 ? '…' : ''}`
        : 'AI-generated question mapped to the document topic.',
      mappingMethod: 'ai_assisted',
      alternativeTopics: [],
    };
  });
}

/**
 * Converts AI bundle questions into the app's ExtractedQuestion shape.
 */
export function questionsFromBundle(
  bundle: DocumentAnalysisBundle,
  doc: { id: string; filename: string; year: number; session: string },
  units: SyllabusUnit[]
): ExtractedQuestion[] {
  return mapRawQuestions(bundle.questions || [], doc, units);
}

/**
 * Converts AI bundle flashcards into the app's Flashcard shape.
 */
export function flashcardsFromBundle(
  bundle: DocumentAnalysisBundle,
  doc: { id: string; filename: string },
  units: SyllabusUnit[]
): Flashcard[] {
  return (bundle.flashcards || []).map((c, idx) => {
    const topic = findTopicByName(units, c.topicName);
    return {
      id: `fc-ai-${doc.id}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      front: c.front,
      back: c.back,
      category: toCategory(c.category),
      unitNumber: topic?.unitNumber || 1,
      unitTitle: `Unit ${topic?.unitNumber || 1}`,
      topicId: topic?.id,
      topicName: topic?.name || c.topicName || 'General Topic',
      sourceDocName: `${doc.filename} (AI)`,
      sourceDocId: doc.id,
      difficulty: toDifficulty(c.difficulty),
      masteryStatus: 'unrated',
      timesReviewed: 0,
      keyFormula: c.keyFormula || undefined,
      hint: c.hint || undefined,
      examMarks: typeof c.examMarks === 'number' ? c.examMarks : undefined,
    };
  });
}
