export type QuestionType =
  | 'Theory'
  | 'Numerical'
  | 'Derivation'
  | 'Definition'
  | 'Conceptual'
  | 'Problem Solving'
  | 'Mixed'
  | 'Unknown';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ReviewStatus = 'Accepted' | 'Needs Review' | 'Rejected';

export type PriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type UserConfidence = 'unrated' | 'weak' | 'medium' | 'strong';

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'ocr'
  | 'detecting_questions'
  | 'classifying'
  | 'analyzing'
  | 'complete'
  | 'failed';

export interface SyllabusTopic {
  id: string;
  unitId: string;
  unitNumber: number;
  name: string;
  description: string;
  keywords: string[];
  synonyms: string[];
  userConfidence: UserConfidence;
}

export interface SyllabusUnit {
  id: string;
  number: number;
  title: string;
  description?: string;
  topics: SyllabusTopic[];
}

export interface Syllabus {
  courseId: string;
  units: SyllabusUnit[];
}

export interface ExtractedQuestion {
  id: string;
  paperId: string;
  paperName: string;
  paperYear: number;
  paperSession: string;
  pageNumber: number;
  rawQuestionNumber: string;
  questionNumber: number;
  subQuestion?: string;
  originalText: string;
  cleanedText: string;
  marks: number | null;
  extractionConfidence: number; // 0 - 100
  reviewStatus: ReviewStatus;
  qualityFlags: string[]; // e.g., 'missing_marks', 'short_text', 'suspicious_ocr', 'low_confidence'
  
  // Classification
  questionType: QuestionType;
  typeConfidence: number; // 0 - 100
  typeReason: string;
  
  difficulty: Difficulty;
  difficultyConfidence: number; // 0 - 100
  difficultyReason: string;
  
  // Topic Mapping
  mappedTopicId: string | null;
  mappedTopicName: string | null;
  unitNumber?: number;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingConfidenceScore: number; // 0 - 100
  mappingReason: string;
  mappingMethod: 'keyword_match' | 'tf_idf_semantic' | 'exact_phrase' | 'ai_assisted' | 'manual';
  alternativeTopics: Array<{
    topicId: string;
    topicName: string;
    score: number;
    reason: string;
  }>;
}

export type DocumentCategory = 'exam_paper' | 'lecture_notes';

export type NotesCoverageStatus = 'Comprehensive' | 'Moderate' | 'Sparse' | 'Missing';

export interface TopicNotesCoverage {
  topicId: string;
  topicName: string;
  unitNumber: number;
  coverageStatus: NotesCoverageStatus;
  pageReferences: number[];
  keyFormulas: string[];
  keyDefinitions: string[];
  notesExcerpt: string;
  gapWarning?: string;
  studyAction: string;
}

export interface NotesFormula {
  id: string;
  formula: string;
  label: string;
  topicName: string;
  unitNumber: number;
  page: number;
}

export interface NotesDefinition {
  id: string;
  term: string;
  definition: string;
  topicName: string;
  unitNumber: number;
  page: number;
}

export interface NotesCriticalGap {
  topicId: string;
  topicName: string;
  unitNumber: number;
  priorityTier: PriorityTier;
  examMarksPercentage: number;
  issue: string;
  recommendation: string;
}

export interface NotesAnalysisResult {
  documentId: string;
  documentName: string;
  totalPages: number;
  overallCoverageScore: number; // 0 - 100%
  highPriorityCoverageScore: number; // 0 - 100%
  topicsCoveredCount: number;
  totalSyllabusTopics: number;
  criticalGaps: NotesCriticalGap[];
  topicCoverages: TopicNotesCoverage[];
  extractedFormulas: NotesFormula[];
  extractedDefinitions: NotesDefinition[];
  keyTakeaways: string[];
  notesQualityScore: number;
}

export interface ExamDocument {
  id: string;
  courseId: string;
  filename: string;
  fileSize: number; // in bytes
  fileType: 'pdf' | 'png' | 'jpeg' | 'txt';
  category?: DocumentCategory;
  year: number;
  session: string; // 'End-Sem' | 'Midterm' | 'MST-1' | 'MST-2' | 'Winter' | 'Summer' | 'Class Notes'
  uploadDate: string;
  processingStage: ProcessingStage;
  stageProgress: number; // 0 - 100
  rawText: string;
  extractedQuestionsCount: number;
  warnings: string[];
  errorMessage?: string;
  notesAnalysis?: NotesAnalysisResult;
  detectedSubject?: string;
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  cheatSheet?: RevisionCheatSheet;
}

export interface TopicAnalytics {
  topicId: string;
  topicName: string;
  unitNumber: number;
  unitTitle: string;
  appearanceCount: number; // total times asked
  totalPapers: number;
  papersAppearedInCount: number;
  paperAppearanceRate: number; // percentage of papers containing topic (0 - 100)
  totalMarks: number;
  examMarksPercentage: number; // percentage of all observed marks
  avgMarksPerQuestion: number;
  yearsAppeared: number[];
  recentTrend: 'Increasing' | 'Stable' | 'Decreasing' | 'Irregular' | 'Insufficient Data';
  trendReason: string;
  questionTypeDistribution: Record<QuestionType, number>; // percentages
  difficultyDistribution: Record<Difficulty, number>; // percentages
  
  // Study Priority Engine
  studyPriorityScore: number; // 0 - 100
  priorityTier: PriorityTier;
  scoreBreakdown: {
    frequencyScore: number;       // 0 - 100
    marksWeightageScore: number;  // 0 - 100
    recentTrendScore: number;     // 0 - 100
    consistencyScore: number;     // 0 - 100
    difficultyRelevanceScore: number; // 0 - 100
    analysisConfidence: number;   // 0 - 100
  };
  explanation: string;
  historicalQuestions: ExtractedQuestion[];
  notesCoverage?: TopicNotesCoverage;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  examDate: string; // ISO date 'YYYY-MM-DD'
  availableStudyHoursPerDay: number;
  isDemo?: boolean;
  tags?: string[];
}

export interface RevisionSession {
  id: string;
  dayNumber: number;
  dateStr: string;
  topicId: string;
  topicName: string;
  unitTitle: string;
  durationMinutes: number;
  sessionType: 'Learn' | 'Practice' | 'Revision' | 'Past-paper practice' | 'Final review';
  focusNotes: string;
  priorityTier: PriorityTier;
  placementReason: string;
  completed?: boolean;
}

export interface RevisionPlan {
  courseId: string;
  examDate: string;
  availableStudyHoursPerDay: number;
  generatedDate: string;
  totalDays: number;
  totalSessions: number;
  sessions: RevisionSession[];
}

export interface DataQualityReport {
  overallConfidenceScore: number; // 0 - 100
  totalDocuments: number;
  totalQuestions: number;
  acceptedQuestionsCount: number;
  needsReviewQuestionsCount: number;
  rejectedQuestionsCount: number;
  missingMarksCount: number;
  unmappedQuestionsCount: number;
  lowConfidenceMappingsCount: number;
  yearsSpan: number;
  warnings: string[];
}

export type FlashcardCategory =
  | 'Formula'
  | 'Definition'
  | 'Concept'
  | 'Exam Question'
  | 'Derivation';

export type FlashcardMastery = 'unrated' | 'learning' | 'review' | 'mastered';

export interface Flashcard {
  id: string;
  front: string; // Question, Term, or Problem prompt
  back: string; // Answer, Explanation, Formula, or Derivation
  category: FlashcardCategory;
  unitNumber: number;
  unitTitle?: string;
  topicId?: string;
  topicName: string;
  sourceDocName: string; // e.g. "Lecture Notes (p. 3)" or "Dec 2021 End-Sem Q1(a)"
  sourceDocId?: string;
  sourcePage?: number;
  difficulty: Difficulty;
  masteryStatus: FlashcardMastery;
  isBookmarked?: boolean;
  timesReviewed: number;
  lastReviewedAt?: string;
  keyFormula?: string;
  hint?: string;
  examMarks?: number;
}

export interface RevisionCheatSheet {
  title: string;
  executiveSummary: string;
  cheatSheetFormulas: Array<{
    formula: string;
    meaning: string;
    examApplication?: string;
  }>;
  highYieldDefinitions: Array<{
    term: string;
    definition: string;
    keyKeywords?: string;
  }>;
  commonExamTraps: string[];
  quickRecallTips: string[];
}

/**
 * Serializable snapshot of the entire workspace. Exporting produces this object,
 * importing restores the workspace exactly (documents, questions, flashcards, etc.).
 */
export interface WorkspaceExport {
  version: number;
  exportedAt: string;
  course: Course;
  syllabus: Syllabus;
  documents: ExamDocument[];
  questions: ExtractedQuestion[];
  flashcards: Flashcard[];
  examDate: string;
  dailyHours: number;
  completedSessionIds: string[];
  practicedQuestionIds: string[];
}

/**
 * Result bundle returned by the autonomous document analyzer. It is domain-agnostic:
 * the AI detects the real subject and returns notes, syllabus, flashcards, questions,
 * and a cheat sheet tailored to that subject.
 */
export interface DocumentAnalysisBundle {
  detectedSubject: string;
  detectedTags: string[];
  notesSummary: string;
  keyTakeaways: string[];
  units: Array<{
    number: number;
    title: string;
    topics: Array<{
      name: string;
      description: string;
      keywords: string[];
      synonyms?: string[];
    }>;
  }>;
  formulas: Array<{
    formula: string;
    label: string;
    topicName: string;
    unitNumber: number;
  }>;
  definitions: Array<{
    term: string;
    definition: string;
    topicName: string;
    unitNumber: number;
  }>;
  flashcards: Array<{
    front: string;
    back: string;
    category: string;
    topicName: string;
    difficulty: string;
    keyFormula?: string;
    hint?: string;
    examMarks?: number;
  }>;
  questions: Array<{
    questionNumber: string;
    questionText: string;
    questionType: string;
    difficulty: string;
    marks: number;
    topicName: string;
    modelAnswer: string;
    markingRubric?: string;
  }>;
  cheatSheet: RevisionCheatSheet;
  overallCoverageScore: number;
}

