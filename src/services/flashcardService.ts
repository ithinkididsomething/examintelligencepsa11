import {
  ExamDocument,
  ExtractedQuestion,
  Flashcard,
  FlashcardCategory,
  Syllabus,
} from '../types';

/**
 * There are no built-in subject-specific seed flashcards. Flashcards are built
 * exclusively from the user's uploaded documents and Gemini analysis, so the
 * app adapts to any academic subject.
 */
export const DEFAULT_FLASHCARDS: Flashcard[] = [];

/**
 * Synthesizes a clear, subject-agnostic model answer for a past exam question.
 * For a fully subject-aware answer, the Gemini analysis flow is used; this is a
 * deterministic fallback that works for any discipline.
 */
function getModelAnswerForQuestion(q: ExtractedQuestion): {
  answer: string;
  keyFormula?: string;
  hint?: string;
} {
  const marks = q.marks || 5;
  const topic = q.mappedTopicName || 'the topic';

  return {
    answer: `• Structure your answer around the command word (definition, explanation, derivation, or comparison).\n• State the governing definition or principle for ${topic} first.\n• Provide the relevant reasoning, formulas, or evidence in clear steps.\n• Apply it to the question with a worked example where appropriate.\n• Finish with a concise conclusion tied to the question.`,
    hint: `Target ${marks} marks: definition/setup, structured reasoning, and an application or example.`,
  };
}

/**
 * Automatically builds study flashcards from the currently uploaded papers,
 * lecture notes, and their extracted questions.
 */
export function buildFlashcardsFromAllDocuments(
  documents: ExamDocument[],
  questions: ExtractedQuestion[],
  syllabus?: Syllabus
): Flashcard[] {
  const cards: Flashcard[] = [];
  const seenPrompts = new Set<string>();

  // 1. Process all Extracted Questions from Exam Papers
  questions.forEach((q) => {
    const cleanPrompt = q.cleanedText.trim();
    if (!cleanPrompt || seenPrompts.has(cleanPrompt.toLowerCase())) return;
    seenPrompts.add(cleanPrompt.toLowerCase());

    const modelSolution = getModelAnswerForQuestion(q);
    const marksLabel = q.marks ? ` [${q.marks} Marks]` : '';
    const qNum = q.rawQuestionNumber ? `${q.rawQuestionNumber}: ` : '';

    const cat: FlashcardCategory =
      q.questionType === 'Numerical'
        ? 'Formula'
        : q.questionType === 'Derivation'
        ? 'Derivation'
        : q.questionType === 'Definition'
        ? 'Definition'
        : 'Exam Question';

    cards.push({
      id: `fc-paper-${q.id}`,
      front: `${qNum}${cleanPrompt}${marksLabel}`,
      back: modelSolution.answer,
      category: cat,
      unitNumber: q.unitNumber || 1,
      unitTitle: `Unit ${q.unitNumber || 1}`,
      topicId: q.mappedTopicId || undefined,
      topicName: q.mappedTopicName || 'General Exam Topic',
      sourceDocName: `${q.paperName} (${q.rawQuestionNumber})`,
      sourceDocId: q.paperId,
      sourcePage: q.pageNumber || 1,
      difficulty: q.difficulty || 'Medium',
      masteryStatus: 'unrated',
      timesReviewed: 0,
      keyFormula: modelSolution.keyFormula,
      hint: modelSolution.hint,
      examMarks: q.marks || undefined,
    });
  });

  // 2. Extract formulas & definitions from any lecture notes documents
  documents.forEach((doc) => {
    if (doc.category === 'lecture_notes' || doc.notesAnalysis) {
      const analysis = doc.notesAnalysis;
      if (analysis?.extractedFormulas) {
        analysis.extractedFormulas.forEach((f) => {
          const frontPrompt = `State the formula and parameter definitions for ${f.label} [5 Marks].`;
          if (seenPrompts.has(frontPrompt.toLowerCase())) return;
          seenPrompts.add(frontPrompt.toLowerCase());
          cards.push({
            id: `fc-formula-${doc.id}-${f.id}`,
            front: frontPrompt,
            back: `• Formula / Relationship: ${f.formula}\n\n• Course Context: Tested under ${f.topicName} (Unit ${f.unitNumber}).\n• Application: High-yield concept for exam problems.`,
            category: 'Formula',
            unitNumber: f.unitNumber || 1,
            unitTitle: `Unit ${f.unitNumber || 1}`,
            topicName: f.topicName,
            sourceDocName: `${doc.filename} (Page ${f.page})`,
            sourceDocId: doc.id,
            sourcePage: f.page,
            difficulty: 'Medium',
            masteryStatus: 'unrated',
            timesReviewed: 0,
            keyFormula: f.formula,
            examMarks: 5,
            hint: `Memorize: ${f.formula}`,
          });
        });
      }

      if (analysis?.extractedDefinitions) {
        analysis.extractedDefinitions.forEach((d) => {
          const frontPrompt = `Define "${d.term}" and explain its importance [4 Marks].`;
          if (seenPrompts.has(frontPrompt.toLowerCase())) return;
          seenPrompts.add(frontPrompt.toLowerCase());
          cards.push({
            id: `fc-def-${doc.id}-${d.id}`,
            front: frontPrompt,
            back: `• Definition:\n${d.definition}\n\n• Unit ${d.unitNumber} (${d.topicName}).\n• Examiner Tip: Quote an exact, formal definition for full marks.`,
            category: 'Definition',
            unitNumber: d.unitNumber || 1,
            unitTitle: `Unit ${d.unitNumber || 1}`,
            topicName: d.topicName,
            sourceDocName: `${doc.filename} (Page ${d.page})`,
            sourceDocId: doc.id,
            sourcePage: d.page,
            difficulty: 'Easy',
            masteryStatus: 'unrated',
            timesReviewed: 0,
            examMarks: 4,
            hint: `Key definition for ${d.term}`,
          });
        });
      }
    }
  });

  return cards;
}

/**
 * Dynamically generate additional flashcards from knowledge base content
 */
export function generateFlashcardsFromKnowledgeBase({
  topicName,
  unitNumber,
  sourceText,
  syllabus,
  category = 'Concept',
}: {
  topicName: string;
  unitNumber: number;
  sourceText?: string;
  syllabus?: Syllabus;
  category?: FlashcardCategory;
}): Flashcard[] {
  const generated: Flashcard[] = [];
  const idPrefix = `fc-custom-${Date.now()}`;

  if (sourceText && sourceText.length > 20) {
    const sentences = sourceText.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 15);
    if (sentences.length >= 2) {
      generated.push({
        id: `${idPrefix}-1`,
        front: `Key Concept: What is the core principle of ${topicName}?`,
        back: sentences.slice(0, 3).join('. ') + '.',
        category: category,
        unitNumber,
        topicName,
        sourceDocName: 'User Generated / Knowledge Base',
        difficulty: 'Medium',
        masteryStatus: 'unrated',
        timesReviewed: 0,
      });
    }
  }

  if (generated.length === 0) {
    generated.push({
      id: `${idPrefix}-default`,
      front: `Explain the fundamental principles of ${topicName} in Unit ${unitNumber}.`,
      back: `Comprehensive review of ${topicName}: key concepts, definitions, and examination relevance derived from Unit ${unitNumber}.`,
      category: category,
      unitNumber,
      topicName,
      sourceDocName: 'Active Course Syllabus',
      difficulty: 'Medium',
      masteryStatus: 'unrated',
      timesReviewed: 0,
    });
  }

  return generated;
}
