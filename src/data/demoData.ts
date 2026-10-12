import { Course, ExamDocument, ExtractedQuestion, Syllabus } from '../types';

/**
 * The application now starts completely empty (subject-agnostic). A course is
 * created automatically from the first uploaded document, or manually through
 * the New Course modal. There is no built-in subject-specific demo dataset.
 */

export const EMPTY_DOCUMENTS: ExamDocument[] = [];
export const EMPTY_QUESTIONS: ExtractedQuestion[] = [];

export function createEmptyCourse(): Course {
  return {
    id: `course-${Date.now()}`,
    name: 'Untitled Course',
    code: 'EXAM-101',
    semester: 'Semester 1',
    examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availableStudyHoursPerDay: 4,
    isDemo: false,
    tags: [],
  };
}

export function createEmptySyllabus(courseId: string): Syllabus {
  return { courseId, units: [] };
}

/**
 * Derives a reasonable course shell from an uploaded document's detected subject.
 * The name/code are used only as initial placeholders until the AI analyzer
 * refines the detected subject and tags.
 */
export function deriveCourseFromDocument(
  base: Course,
  detectedSubject: string,
  detectedTags: string[],
  filename: string
): Course {
  const subject = detectedSubject?.trim();
  const codeMatch = filename.match(/\b([A-Z]{2,5}\s?-?\s?\d{2,4})\b/);
  const code = codeMatch ? codeMatch[1].replace(/\s+/g, '') : base.code;
  return {
    ...base,
    name: subject && subject.length > 1 ? subject : base.name,
    code,
    tags: detectedTags && detectedTags.length > 0 ? detectedTags : base.tags,
  };
}
