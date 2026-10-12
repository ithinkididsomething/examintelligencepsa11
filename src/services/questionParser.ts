import { ExtractedQuestion, ReviewStatus } from '../types';

export interface RawParsedQuestion {
  rawQuestionNumber: string;
  questionNumber: number;
  subQuestion?: string;
  originalText: string;
  cleanedText: string;
  marks: number | null;
  pageNumber: number;
  extractionConfidence: number;
  qualityFlags: string[];
  reviewStatus: ReviewStatus;
}

/**
 * Clean OCR text without destroying math notation or technical formulas
 */
export function cleanOCRText(text: string): { cleaned: string; flags: string[]; confidence: number } {
  const flags: string[] = [];
  let confidence = 95;

  if (!text || text.trim().length === 0) {
    return { cleaned: '', flags: ['empty_text'], confidence: 0 };
  }

  let cleaned = text;

  // Remove common exam header artifacts
  cleaned = cleaned.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
  cleaned = cleaned.replace(/Roll\s*No\.?\s*[:\-]?\s*[\w\d]*/gi, '');
  cleaned = cleaned.replace(/Time\s*Allowed\s*[:\-]?\s*[\d\.\s\w]+/gi, '');
  cleaned = cleaned.replace(/Maximum\s*Marks\s*[:\-]?\s*\d+/gi, '');
  cleaned = cleaned.replace(/Note\s*:\s*Attempt\s+all\s+questions\.?/gi, '');

  // Strip private-use glyphs / replacement chars / control chars left by PDF fonts
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F\uE000-\uF8FF\uFFFD]/g, ' ');

  // Normalize excessive whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // Remove stray CJK bracket glyphs left behind by PDF extraction marks parsing
  // (e.g. "〔 4 Marks )" -> after marks stripped, leftover "〔 )" is junk).
  cleaned = cleaned.replace(/[〔〕〘〙「」【】〈〉《》]/g, ' ').replace(/\s+/g, ' ').trim();

  // Strip leading/ trailing dangling brackets, dots and whitespace from question text
  cleaned = cleaned.replace(/^[\s\.[\]()]+/, '').replace(/[\s\][\]()〕」》]+$/, '').trim();

  // Remove any leftover standalone marks tags ("10 Marks]", "(5 marks)") that survived parsing
  cleaned = cleaned
    .replace(/\b\d+(?:\.\d+)?\s*[Mm]arks?\b/g, ' ')
    .replace(/^[\s\][\]()]+/, '')
    .replace(/[\s\][\]()〕」》]+$/, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Check for suspicious OCR garbage (high concentration of random symbols)
  const suspiciousSymbols = cleaned.match(/[^\w\s\.,;:!?\(\)\[\]\{\}\+\-\*\/=\<\>\\%µΩπ\^~"']/g);
  if (suspiciousSymbols && suspiciousSymbols.length > 5 && suspiciousSymbols.length / cleaned.length > 0.08) {
    flags.push('suspicious_ocr');
    confidence -= 25;
  }

  // Check for extremely short extracted questions
  if (cleaned.length < 20) {
    flags.push('extremely_short');
    confidence -= 30;
  }

  // Fix common OCR broken characters (e.g., 'l' instead of '1' in marks or formulas, or broken hyphens)
  cleaned = cleaned.replace(/—|–/g, '-');

  return { cleaned: cleaned.trim(), flags, confidence: Math.max(10, Math.min(100, confidence)) };
}

/**
 * Extracts marks from question text
 * Supports [5], (5 marks), 5 Marks, 5M, Marks: 5, [10], (a) ... [7]
 */
export function extractMarks(text: string): { marks: number | null; textWithoutMarks: string } {
  // Regex patterns for marks
  const patterns = [
    /(?:\[|\()(\d+(?:\.\d+)?)\s*(?:marks?|mark|m)?(?:\)|\])/i,
    /Marks\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /\b(\d+(?:\.\d+)?)\s*(?:marks?|M)\b/i,
    /\[(\d+)\]/,
    /\((\d+)\)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val >= 1 && val <= 50) { // realistic university question marks
        // remove the marks tag from the question text cleanly
        const textWithout = text.replace(match[0], '').trim();
        return { marks: val, textWithoutMarks: textWithout };
      }
    }
  }

  return { marks: null, textWithoutMarks: text };
}

/**
 * Parses raw exam paper text into individual structured questions
 */
export function parseExamPaperText(
  rawText: string,
  paperId: string,
  paperName: string,
  paperYear: number,
  paperSession: string
): RawParsedQuestion[] {
  // Strip leading bullet / list glyphs and zero-width chars that PDF extraction
  // tends to prepend to each line (e.g. "●   Q.1 (a) 5 Marks]").
  const stripBullets = (l: string) =>
    l.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/^[\s\u25CF\u25CB\u2022\u25AA\u25E6\u2023\u2043\u2219\-\*\u27A4>]+/u, '').trim();

  const lines = rawText.split('\n').map(stripBullets).filter(Boolean);
  const questions: RawParsedQuestion[] = [];

  // If the paper uses explicit "Q.1" notation, only trust those headers so that
  // subject/section headings like "1. Engineering Graphics" aren't parsed as questions.
  const usesQNotation = /(?:^|\n)\s*[\u25CF\u25CB\u2022\-\*]?\s*Q(?:uestion)?\s*\.?\s*\d/i.test(rawText);
  // Match question headers like:
  // Q1, Q.1, Q 1, Question 1, 1., 1), Q1(a), Q2(b), (a), (b), (i), (ii)
  const questionHeaderRegex = usesQNotation
    ? /^(?:Q(?:uestion)?\s*\.?\s*(\d+))\s*(?:\(([a-z0-9ivx]+)\))?/i
    : /^(?:(?:Q(?:uestion)?\s*\.?\s*(\d+)|(\d+)[\.\)]))\s*(?:\(([a-z0-9ivx]+)\))?/i;
  const subQuestionHeaderRegex = /^\(([a-z0-9ivx]+)\)\s+/i;
  const isSkipLine = (l: string) =>
    /^(or|\(or\)|i{1,3}|[ivx]+)\)?\s*$/i.test(l) ||
    /^class\s+test\s*[-–—]?\s*\d*/i.test(l) ||
    /^attempt\s+(all|any)\s+/i.test(l);

  let hasStarted = false;
  let currentQNum = 1;
  let currentSubQ: string | undefined = undefined;
  let currentRawNum = 'Q1';
  let currentTextBuffer: string[] = [];
  let currentPage = 1;

  function commitCurrentQuestion() {
    if (currentTextBuffer.length === 0) return;
    const fullRawText = currentTextBuffer.join(' ').trim();
    if (fullRawText.length < 5) return;

    const { marks, textWithoutMarks } = extractMarks(fullRawText);
    const { cleaned, flags, confidence } = cleanOCRText(textWithoutMarks);

    const qualityFlags = [...flags];
    if (marks === null) {
      qualityFlags.push('missing_marks');
    }

    let status: ReviewStatus = 'Accepted';
    if (qualityFlags.includes('extremely_short') || qualityFlags.includes('suspicious_ocr') || confidence < 60) {
      status = 'Needs Review';
    } else if (qualityFlags.includes('missing_marks')) {
      status = 'Needs Review';
    }

    questions.push({
      rawQuestionNumber: currentRawNum,
      questionNumber: currentQNum,
      subQuestion: currentSubQ,
      originalText: fullRawText,
      cleanedText: cleaned,
      marks: marks,
      pageNumber: currentPage,
      extractionConfidence: confidence,
      qualityFlags,
      reviewStatus: status,
    });

    currentTextBuffer = [];
  }

  for (const line of lines) {
    // Detect page boundary
    if (/---+\s*Page\s*(\d+)\s*---+/i.test(line) || /^Page\s+(\d+)/i.test(line)) {
      const pMatch = line.match(/\d+/);
      if (pMatch) {
        currentPage = parseInt(pMatch[0], 10);
      }
      continue;
    }

    if (isSkipLine(line)) continue;

    const qMatch = line.match(questionHeaderRegex);
    if (qMatch) {
      if (!hasStarted) {
        // Discard all preamble (headers, course names, instructions) until first question
        hasStarted = true;
        currentTextBuffer = [];
      } else {
        commitCurrentQuestion();
      }
      const numStr = qMatch[1] || qMatch[2];
      currentQNum = parseInt(numStr, 10) || currentQNum + 1;
      currentSubQ = qMatch[3] || undefined;
      currentRawNum = currentSubQ ? `Q${currentQNum}(${currentSubQ})` : `Q${currentQNum}`;

      // strip the question marker from the line text
      const remaining = line.replace(questionHeaderRegex, '').trim();
      if (remaining) {
        currentTextBuffer.push(remaining);
      }
      continue;
    }

    if (!hasStarted) continue;

    const subMatch = line.match(subQuestionHeaderRegex);
    if (subMatch && currentTextBuffer.length > 0) {
      // Sub-question transition like (b) or (ii)
      commitCurrentQuestion();
      currentSubQ = subMatch[1];
      currentRawNum = `Q${currentQNum}(${currentSubQ})`;
      const remaining = line.replace(subQuestionHeaderRegex, '').trim();
      if (remaining) {
        currentTextBuffer.push(remaining);
      }
      continue;
    }

    // Regular line continuation
    currentTextBuffer.push(line);
  }

  // Commit last question
  commitCurrentQuestion();

  // If no questions were detected with standard regex, split by double newlines or paragraph blocks
  if (questions.length === 0 && rawText.trim().length > 30) {
    const blocks = rawText.split(/\n\s*\n/).filter(b => b.trim().length > 15);
    blocks.forEach((block, idx) => {
      const qNum = idx + 1;
      const { marks, textWithoutMarks } = extractMarks(block.trim());
      const { cleaned, flags, confidence } = cleanOCRText(textWithoutMarks);
      const qualityFlags = [...flags, 'missing_question_number'];
      if (marks === null) qualityFlags.push('missing_marks');

      questions.push({
        rawQuestionNumber: `Q${qNum}`,
        questionNumber: qNum,
        subQuestion: undefined,
        originalText: block.trim(),
        cleanedText: cleaned,
        marks,
        pageNumber: 1,
        extractionConfidence: Math.max(30, confidence - 20),
        qualityFlags,
        reviewStatus: 'Needs Review',
      });
    });
  }

  return questions;
}
