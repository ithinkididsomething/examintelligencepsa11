import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to get GoogleGenAI client
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Resilient Gemini caller with automatic model fallback:
 * 1. Tries flagship 'gemini-3.8-flash'
 * 2. If 'gemini-3.8-flash' experiences 503 high demand spike or timeout, immediately falls back to 'gemini-3.1-flash-lite'
 */
async function generateContentWithRetryAndFallback(params: {
  contents: string;
  config?: any;
}): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('Gemini API key is not configured in process.env.GEMINI_API_KEY');
  }

  // 1. Try gemini-3.8-flash
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: params.contents,
      config: params.config,
    });
    if (response && response.text) {
      return response.text;
    }
  } catch (err: any) {
    console.warn('[Gemini 3.8 Flash] Temporarily busy or 503 spike, switching to gemini-3.1-flash-lite:', err.message);
  }

  // 2. Try gemini-3.1-flash-lite fallback
  try {
    const fallbackResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: params.contents,
      config: params.config,
    });
    if (fallbackResponse && fallbackResponse.text) {
      return fallbackResponse.text;
    }
  } catch (err2: any) {
    console.error('[Gemini 3.1 Flash Lite] Error:', err2.message);
    throw err2;
  }

  throw new Error('No content returned from Gemini models.');
}

/**
 * Robust JSON parser that strips markdown fences and extracts JSON array/object safely
 */
function safeParseJson(raw: string): any {
  if (!raw) return [];
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const startArr = cleaned.indexOf('[');
    const endArr = cleaned.lastIndexOf(']');
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
      try {
        return JSON.parse(cleaned.slice(startArr, endArr + 1));
      } catch (e2) {}
    }
    const startObj = cleaned.indexOf('{');
    const endObj = cleaned.lastIndexOf('}');
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
      try {
        return JSON.parse(cleaned.slice(startObj, endObj + 1));
      } catch (e3) {}
    }
    throw e;
  }
}

/**
 * Shape of a single AI-generated/extracted question, reused across endpoints.
 */
const QUESTION_ITEM_PROPERTIES = {
  questionNumber: { type: Type.STRING },
  questionText: { type: Type.STRING },
  questionType: { type: Type.STRING },
  difficulty: { type: Type.STRING },
  marks: { type: Type.INTEGER },
  topicName: { type: Type.STRING },
  modelAnswer: { type: Type.STRING },
  markingRubric: { type: Type.STRING },
};

/**
 * Splits long text into overlapping windows so exhaustive extraction is not
 * limited by the model's input length. Breaks preferentially on newlines.
 */
function chunkText(text: string, size = 14000, overlap = 800): string[] {
  if (!text) return [];
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf('\n', end);
      if (nl > start + Math.floor(size * 0.5)) end = nl;
    }
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function normalizeQuestionKey(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .slice(0, 140);
}

function dedupeQuestionList(list: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const q of list || []) {
    if (!q || typeof q !== 'object') continue;
    const text = q.questionText || q.question || '';
    const key = normalizeQuestionKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/**
 * Intelligent deterministic fallback generator when AI API is unavailable
 * Scans provided text for exam questions, definitions, equations, and topics.
 */
function guessSubjectFromText(text: string, docName: string): string {
  const combined = (docName + ' ' + text.slice(0, 8000)).toLowerCase();
  if (/dna|rna|protein|enzyme|cell|gene|mitosis|meiosis|photosynthesis|organism|chloroplast|cellular|metabolism/i.test(combined)) {
    return 'Cellular & Molecular Biology';
  }
  if (/gdp|inflation|elasticity|macroeconomic|microeconomic|monetary|fiscal|market\s+equilibrium|demand\s+curve|consumer\s+surplus/i.test(combined)) {
    return 'Economics';
  }
  if (/constitution|amendment|statute|plaintiff|defendant|jurisdiction|tort|liability|court|due\s+process|appellate|judiciary/i.test(combined)) {
    return 'Law & Jurisprudence';
  }
  if (/treaty|revolution|empire|century|dynasty|republic|sovereign|colonial|monarchy|feudalism|renaissance/i.test(combined)) {
    return 'World History';
  }
  if (/reaction|stoichiometry|acid|base|organic|solvent|molecule|compound|enthalpy|valence|covalent|oxidation/i.test(combined)) {
    return 'Chemistry';
  }
  if (/velocity|momentum|thermodynamic|entropy|kinetic|electromagnetic|gravitation|quantum|wave\s+function|vector\s+field/i.test(combined)) {
    return 'Physics';
  }
  if (/psychology|cognitive|behavior|cortex|neuron|perception|disorder|memory\s+retention|conditioning|freud|jung/i.test(combined)) {
    return 'Psychology';
  }
  if (/accounting|balance\s+sheet|ledger|amortization|ebitda|depreciation|dividend|portfolio|capital\s+gain/i.test(combined)) {
    return 'Accounting & Finance';
  }
  if (/algorithm|data\s+structure|graph|binary\s+tree|sorting|recursion|complexity|compiler|syntax\s+tree/i.test(combined)) {
    return 'Computer Science';
  }

  // Derive from filename if descriptive
  const cleaned = docName
    .replace(/\.(pdf|docx|txt|png|jpg|jpeg)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b(exam|paper|notes|lecture|midterm|endsem|test|quiz|sample|final|202\d)\b/gi, '')
    .trim();
  if (cleaned.length >= 4) {
    return cleaned.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return 'General Academic Subject';
}

function extractFallbackFlashcards(notesText: string, docName: string, unitNumber: number, count: number) {
  const cards: any[] = [];
  const detectedSubject = guessSubjectFromText(notesText, docName);

  // 1. Check if text has exam questions (Q1, Q2, etc.)
  const questionMatches = notesText.match(/(?:Q\s*\d+[a-z]?|\bQuestion\s*\d+)[^\n]+(?:\[\s*\d+\s*Marks?\s*\]|[?.])/gi) || [];
  for (let i = 0; i < Math.min(questionMatches.length, count); i++) {
    const qText = questionMatches[i];
    const marksMatch = qText.match(/\[\s*(\d+)\s*Marks?\s*\]/i);
    const marks = marksMatch ? parseInt(marksMatch[1], 10) : 5;
    cards.push({
      front: `Exam Question: ${qText}`,
      back: `Comprehensive examination answer synthesized from ${docName}:\n• Clearly state fundamental definitions and governing theoretical principles of ${detectedSubject}.\n• State applicable equations, theorems, or analytical frameworks.\n• Step-by-step breakdown and scoring criteria for full ${marks} marks credit.`,
      category: 'Exam Question',
      topicName: `${detectedSubject} Exam Preparation`,
      difficulty: marks >= 7 ? 'Hard' : marks <= 4 ? 'Easy' : 'Medium',
      hint: `Target ${marks} marks: State formal definitions, prove core properties, and present structured steps.`,
      examMarks: marks,
    });
  }

  // 2. Scan for definition-like statements: "X is defined as...", "X refers to..."
  const defMatches = notesText.match(/([A-Z][A-Za-z\s]{3,35})\s+(?:is defined as|refers to|is the study of|is an academic discipline|describes)\s+([^.\n]+)/g) || [];
  for (const m of defMatches) {
    if (cards.length >= count) break;
    const parts = m.split(/\s+(?:is defined as|refers to|is the study of|is an academic discipline|describes)\s+/);
    if (parts.length >= 2) {
      const term = parts[0].trim();
      const def = parts[1].trim();
      cards.push({
        front: `Define and explain the core academic concept of "${term}".`,
        back: `Definition:\n${term} ${m.includes('is defined as') ? 'is defined as' : 'refers to'} ${def}.\n\nSignificance in ${detectedSubject}:\n• Central theoretical foundation frequently examined in course assessments.\n• Must be supported with operational mechanisms and practical applications.`,
        category: 'Definition',
        topicName: term,
        difficulty: 'Easy',
        hint: `Focus on the exact definition and primary distinction in ${detectedSubject}.`,
        examMarks: 4,
      });
    }
  }

  // 3. Fallback generic high-yield cards from document content
  const nonShortLines = notesText.split('\n').map((l) => l.trim()).filter((l) => l.length > 25 && l.length < 200);
  for (let i = 0; i < nonShortLines.length && cards.length < count; i++) {
    const line = nonShortLines[i];
    const topicHeading = line.slice(0, 30).trim();
    cards.push({
      front: `Explain the foundational concept and exam significance of: "${topicHeading}..."`,
      back: `Synthesis from ${docName}:\n• Core Concept: ${line}\n• Key Evaluation Points: Identify governing principles, analytical mechanisms, and theoretical assumptions.\n• Exam Standard: State precise terminology, relevant formulas or legal/historical precedents, and structured justifications.`,
      category: 'Concept',
      topicName: topicHeading,
      difficulty: 'Medium',
      hint: `Review core theoretical principles and contextual analysis.`,
      examMarks: 5,
    });
  }

  return cards.slice(0, count);
}

/**
 * Domain-agnostic fallback question builder. Scans the document for question-like
 * lines, definitions, and formula lines and turns them into exam-style questions.
 * Never assumes a fixed subject.
 */
function buildGenericQuestions(notesText: string, docName: string, unitNumber: number, subject: string) {
  const questions: any[] = [];

  const questionMatches = notesText.match(/(?:Q\s*\d+[a-z]?|\bQuestion\s*\d+)[^\n]+/gi) || [];
  for (let i = 0; i < Math.min(questionMatches.length, 6); i++) {
    const qText = questionMatches[i].trim();
    const marksMatch = qText.match(/\[\s*(\d+)\s*Marks?\s*\]/i);
    const marks = marksMatch ? parseInt(marksMatch[1], 10) : 5;
    questions.push({
      questionNumber: `Q${i + 1}`,
      questionText: qText,
      questionType: 'Theory',
      difficulty: marks >= 7 ? 'Hard' : marks <= 4 ? 'Easy' : 'Medium',
      marks,
      topicName: `${subject} Core Topic`,
      modelAnswer: `Structured answer synthesized from ${docName}:\n• State the fundamental definition or principle.\n• Explain the mechanism, relevant formulas/theories, and supporting evidence.\n• Provide a worked example or application and a concise conclusion.`,
      markingRubric: `Definition/setup: ${Math.ceil(marks / 3)} marks, Reasoning/formula: ${Math.ceil(marks / 3)} marks, Application/example: ${marks - 2 * Math.ceil(marks / 3)} marks`,
      difficultyReason: `Inferred from mark allocation (${marks} marks).`,
    });
  }

  if (questions.length === 0) {
    const defMatches = notesText.match(/([A-Z][A-Za-z\s]{3,35})\s+(?:is defined as|refers to|is the study of|describes)\s+([^.\n]+)/g) || [];
    for (let i = 0; i < Math.min(defMatches.length, 4); i++) {
      const parts = defMatches[i].split(/\s+(?:is defined as|refers to|is the study of|describes)\s+/);
      const term = (parts[0] || `Concept ${i + 1}`).trim();
      questions.push({
        questionNumber: `Q${i + 1}`,
        questionText: `Define and explain "${term}" in the context of ${subject} (${docName}).`,
        questionType: 'Definition',
        difficulty: 'Easy',
        marks: 5,
        topicName: term,
        modelAnswer: `Definition: ${parts[1] ? parts[1].trim() : term}.\n\nSignificance: Explain its role and relevance within ${subject}.`,
        markingRubric: 'Correct definition: 3 marks, Explanation/significance: 2 marks',
        difficultyReason: 'Direct definition question.',
      });
    }
  }

  if (questions.length === 0) {
    const lines = notesText.split('\n').map((l) => l.trim()).filter((l) => l.length > 30 && l.length < 220);
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const heading = lines[i].slice(0, 60);
      questions.push({
        questionNumber: `Q${i + 1}`,
        questionText: `Explain the following from ${docName}: "${heading}...". Support your answer with theory and examples.`,
        questionType: 'Theory',
        difficulty: 'Medium',
        marks: 6,
        topicName: `${subject} Core Topic`,
        modelAnswer: `• Core idea: ${lines[i]}\n• Supporting theory/formulas: develop the governing principles.\n• Application: relate to ${subject} and provide an example.`,
        markingRubric: 'Explanation: 3 marks, Supporting theory: 2 marks, Example: 1 mark',
        difficultyReason: 'Descriptive conceptual question.',
      });
    }
  }

  return questions;
}

// 1. Generate Flashcards Endpoint (with Autonomous Subject Detection)
app.post('/api/gemini/generate-flashcards', async (req, res) => {
  const {
    notesText,
    docName = 'Lecture Notes',
    unitNumber = 1,
    topicName = '',
    count = 8,
    categoryFilter = 'All',
    courseName = '',
    courseCode = '',
    courseTags = [],
    autoDetectSubject = true,
  } = req.body;

  if (!notesText || typeof notesText !== 'string' || notesText.trim().length === 0) {
    return res.status(400).json({ error: 'Document text is required for flashcard generation.' });
  }

  try {
    const isExamPaper = /exam|question|q1|marks|test|paper|midterm|endsem/i.test(docName) ||
      /(?:Q\s*\d|\bQuestion\s*\d|\[\s*\d+\s*Marks?\])/i.test(notesText.slice(0, 3000));

    const prompt = `You are an elite academic professor, university exam tutor, and document analysis expert.

CRITICAL SUBJECT DETECTION & COMPLETE DOMAIN INDEPENDENCE:
1. Examine the provided document text carefully. Determine and accurately GUESS the real academic subject/discipline of this document (e.g. Cellular Biology, Macroeconomics, Constitutional Law, Organic Chemistry, World History, Psychology, Quantum Physics, Literature, Philosophy, Computer Science, Environmental Science, etc.).
2. DO NOT assume this document is Computer Science, Electrical Engineering, or any predetermined domain unless the text itself is explicitly about that topic.
3. Completely adapt 100% of your terminology, conceptual framing, questions, model answers, and rubrics to the true detected subject.
4. DO NOT force any pre-set syllabus units or CS topics. Formulate ${count} granular, high-yield study flashcards based directly on the actual content of the text.

Document Context:
- Document Title: "${docName}"
- User Subject/Topic Hint: ${topicName ? `"${topicName}"` : 'None provided - autonomously guess the subject from document text'}
- Category Focus: ${categoryFilter}
- Document Kind: ${isExamPaper ? 'PAST EXAM PAPER' : 'LECTURE NOTES / STUDY MATERIAL'}

Material Excerpt:
"""
${notesText.slice(0, 60000)}
"""

Flashcard Construction Rules:
1. "detectedSubject": The exact, natural academic course/subject title you identified (e.g. "Microeconomics", "Cell Biology", "Criminal Law", "World History").
2. "detectedTags": 2 to 4 specific academic tags reflecting this subject.
3. "flashcards": Exactly ${count} high-yield study flashcards:
   - "front": Clear, specific question prompt.
     ${isExamPaper
       ? 'Break down the exam paper into individual sub-questions (e.g. "Q1(a) Explain the concept of [Subject Concept] [5 Marks]"). Include marks and question numbering.'
       : 'Break down lecture notes into clear questions targeting fundamental principles, definitions, governing theorems/formulas, and trade-offs.'
     }
   - "back": Rigorous, bulleted model answer with explanations, equations/theorems, and scoring points.
   - "category": One of "Formula", "Definition", "Concept", "Exam Question", "Derivation".
   - "topicName": Clean topic name naturally occurring in this detected subject (e.g. "Supply & Demand", "Mitosis", "First Amendment").
   - "difficulty": "Easy", "Medium", or "Hard".
   - "keyFormula": Relevant equation, theorem, or principle (if applicable).
   - "hint": Memory cue or exam scoring tip.
   - "examMarks": Allocated marks (e.g. 4, 5, 6, 7, 8, 10).`;

    const textResponse = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          description: 'Detected academic subject and study flashcards',
          properties: {
            detectedSubject: {
              type: Type.STRING,
              description: 'The academic course/subject title detected from the document (e.g. Macroeconomics, Cellular Biology, Constitutional Law)',
            },
            detectedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 academic tags reflecting the subject domain',
            },
            flashcards: {
              type: Type.ARRAY,
              description: 'List of high-yield study flashcards',
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: 'Clear question on card front' },
                  back: { type: Type.STRING, description: 'Answer on card back' },
                  category: { type: Type.STRING, description: 'Formula, Definition, Concept, Exam Question, or Derivation' },
                  topicName: { type: Type.STRING, description: 'Natural topic name within the detected subject' },
                  difficulty: { type: Type.STRING, description: 'Easy, Medium, or Hard' },
                  keyFormula: { type: Type.STRING, description: 'Associated equation or theorem' },
                  hint: { type: Type.STRING, description: 'Memory hint or exam tip' },
                  examMarks: { type: Type.INTEGER, description: 'Suggested exam marks' },
                },
                required: ['front', 'back', 'category', 'topicName', 'difficulty'],
              },
            },
          },
          required: ['detectedSubject', 'flashcards'],
        },
      },
    });

    const parsed = safeParseJson(textResponse || '{}');
    let cards: any[] = [];
    let detectedSubject = '';
    let detectedTags: string[] = [];

    if (Array.isArray(parsed)) {
      cards = parsed;
    } else if (parsed && typeof parsed === 'object') {
      cards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
      detectedSubject = parsed.detectedSubject || '';
      detectedTags = Array.isArray(parsed.detectedTags) ? parsed.detectedTags : [];
    }

    if (!detectedSubject) {
      detectedSubject = guessSubjectFromText(notesText, docName);
    }

    return res.json({
      success: true,
      count: cards.length,
      detectedSubject,
      detectedTags,
      flashcards: cards,
      source: 'gemini_ai',
    });
  } catch (err: any) {
    console.warn('[Gemini Flashcards Warning] Using autonomous document extraction fallback:', err.message);
    const fallbackCards = extractFallbackFlashcards(notesText, docName, unitNumber, count);
    const detectedSubject = guessSubjectFromText(notesText, docName);
    return res.json({
      success: true,
      count: fallbackCards.length,
      detectedSubject,
      detectedTags: [detectedSubject],
      flashcards: fallbackCards,
      source: 'document_analyzer_fallback',
      notice: `Autonomous extraction completed for detected subject: ${detectedSubject}.`,
    });
  }
});

// 2. Generate Exam Practice Questions Endpoint
app.post('/api/gemini/generate-questions', async (req, res) => {
  const {
    notesText,
    docName = 'Lecture Notes',
    unitNumber = 1,
    count = 5,
    questionType = 'Mixed',
    examStyle = 'End-Sem',
    courseName = '',
    courseCode = '',
    courseTags = [],
  } = req.body;

  if (!notesText || typeof notesText !== 'string' || notesText.trim().length === 0) {
    return res.status(400).json({ error: 'Notes text is required for question generation.' });
  }

  try {
    const tagsText = Array.isArray(courseTags) && courseTags.length > 0 ? courseTags.join(', ') : 'detect from document content';
    const identityInstruction = `CRITICAL SUBJECT & IDENTITY INSTRUCTION: This course ("${courseName || docName}", Code: "${courseCode || 'EXAM'}") has subject domain hints: [${tagsText}]. Determine the true academic subject from the document content and adapt ALL terminology, questions, model answers, and rubrics entirely to that subject, whatever it is (History, Literature, Medicine, Finance, Computer Science, Economics, Biology, Law, Engineering, Arts, or any other discipline). Do NOT assume any predetermined domain.`;

    const prompt = `You are a university chief examiner paper setter and academic document breakdown expert.
${identityInstruction}
CRITICAL INSTRUCTION: The provided notes or past paper may be a large document containing multiple sections or major questions. You MUST rigorously and exhaustively break down this large document into smaller, finer-grained, distinct questions and sub-questions (e.g. Q1(a), Q1(b), Q2(a), Q2(b), Q3, etc.). Never group multiple distinct topics into one vague summary. Extract every individual question item with precise question numbers, clean question text, exact marks, step-by-step model answers, and detailed marking rubrics.
Formulate ${count} authentic, past-paper exam questions with complete marking rubrics.

Document: "${docName}"
Unit Number: ${unitNumber}
Exam Style: ${examStyle}
Question Type: ${questionType}

Notes Content (Large Document):
"""
${notesText.slice(0, 60000)}
"""

Formulate questions in the format:
- "questionNumber": e.g. "Q1(a)", "Q1(b)", "Q2", "Q3(a)"
- "questionText": Clear, unambiguous exam prompt broken down from the document
- "questionType": Theory, Numerical, Derivation, Definition, Conceptual, or Problem Solving
- "difficulty": Easy, Medium, or Hard
- "marks": Allocated marks (e.g. 5, 7, 8, 10)
- "topicName": Specific syllabus topic
- "modelAnswer": Step-by-step solution
- "markingRubric": Step-by-step marks breakdown`;

    const textResponse = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Exam questions with rubrics',
          items: {
            type: Type.OBJECT,
            properties: {
              questionNumber: { type: Type.STRING },
              questionText: { type: Type.STRING },
              questionType: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              marks: { type: Type.INTEGER },
              topicName: { type: Type.STRING },
              modelAnswer: { type: Type.STRING },
              markingRubric: { type: Type.STRING },
              difficultyReason: { type: Type.STRING },
            },
            required: ['questionNumber', 'questionText', 'questionType', 'difficulty', 'marks', 'topicName', 'modelAnswer'],
          },
        },
      },
    });

    const parsed = safeParseJson(textResponse || '[]');
    return res.json({
      success: true,
      count: parsed.length,
      questions: parsed,
      source: 'gemini_ai',
    });
  } catch (err: any) {
    console.warn('[Gemini Questions Warning] Using document analysis fallback:', err.message);
    const detectedFallbackSubject = guessSubjectFromText(notesText, docName);
    const fallbackQuestions = buildGenericQuestions(notesText, docName, unitNumber, detectedFallbackSubject);

    return res.json({
      success: true,
      count: fallbackQuestions.length,
      questions: fallbackQuestions,
      source: 'document_analyzer_fallback',
    });
  }
});

// 2c. Exhaustive Exam Paper Question Extraction
// Extracts EVERY question and sub-question from an exam paper by processing the
// document in overlapping chunks and then de-duplicating the result.
app.post('/api/gemini/extract-exam-questions', async (req, res) => {
  const {
    documentText,
    docName = 'Exam Paper',
    detectedSubject = '',
    courseName = '',
    courseCode = '',
    courseTags = [],
  } = req.body;

  if (!documentText || typeof documentText !== 'string' || documentText.trim().length === 0) {
    return res.status(400).json({ error: 'Document text is required for question extraction.' });
  }

  const tagsText = Array.isArray(courseTags) && courseTags.length > 0 ? courseTags.join(', ') : 'detect from content';
  const chunks = chunkText(documentText, 14000, 800);
  const collected: any[] = [];
  let aiSucceeded = false;

  for (let i = 0; i < chunks.length; i++) {
    const prompt = `You are an exam paper digitization engine. This is segment ${i + 1} of ${chunks.length} from the document "${docName}".
Extract EVERY question and sub-question that literally appears in this segment. Rules:
- Do NOT summarize, merge, invent, or skip any question.
- Preserve the original question numbering exactly (e.g. Q1, Q1(a), Q2(b), 3, 4(i)).
- Capture marks if they appear (e.g. [5], (5 marks)).
- If this segment contains no questions, return an empty array.
Context: document kind = PAST EXAM PAPER. Course hints: "${courseName || 'N/A'}" (${courseCode || 'N/A'}). Subject tags: [${tagsText}].
For each question provide: questionNumber, questionText (verbatim), questionType (Theory, Numerical, Derivation, Definition, Conceptual, Problem Solving), difficulty (Easy, Medium, Hard), marks, topicName, a concise modelAnswer, and a markingRubric.
Segment text:
"""
${chunks[i]}
"""
Return ONLY a JSON array of questions.`;

    try {
      const textResponse = await generateContentWithRetryAndFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: QUESTION_ITEM_PROPERTIES,
              required: ['questionText'],
            },
          },
        },
      });
      const parsed = safeParseJson(textResponse || '[]');
      if (Array.isArray(parsed)) {
        collected.push(...parsed);
        aiSucceeded = true;
      }
    } catch (err: any) {
      console.warn(`[Extract Exam Questions] Segment ${i + 1} failed:`, err.message);
    }
  }

  let questions = dedupeQuestionList(collected);

  if (questions.length === 0) {
    const subj = detectedSubject || guessSubjectFromText(documentText, docName);
    questions = buildGenericQuestions(documentText, docName, 1, subj);
    return res.json({
      success: true,
      source: 'document_analyzer_fallback',
      count: questions.length,
      chunksProcessed: chunks.length,
      questions,
    });
  }

  return res.json({
    success: true,
    source: aiSucceeded ? 'gemini_ai' : 'document_analyzer_fallback',
    count: questions.length,
    chunksProcessed: chunks.length,
    questions,
  });
});

// 2d. Per-Section Question Generation (for lecture notes)
// Given the sections/topics of a unit, generates AT LEAST `minPerSection`
// (default 4) distinct exam-style questions for EACH section.
app.post('/api/gemini/generate-section-questions', async (req, res) => {
  const {
    documentText = '',
    docName = 'Lecture Notes',
    detectedSubject = '',
    unitNumber = 1,
    unitTitle = '',
    sections = [],
    minPerSection = 4,
    courseName = '',
    courseCode = '',
    courseTags = [],
  } = req.body;

  if (!Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ error: 'At least one section/topic is required.' });
  }

  const tagsText = Array.isArray(courseTags) && courseTags.length > 0 ? courseTags.join(', ') : 'detect from content';
  const sectionList = sections
    .map((s: any, i: number) => `${i + 1}. ${s.name}${s.description ? ` — ${s.description}` : ''}`)
    .join('\n');

  const prompt = `You are a university chief examiner and expert academic question setter.
Determine the true academic subject from the material and use ONLY that subject's own terminology (do not assume any predetermined domain).
Subject hints: [${tagsText}]. Course: "${courseName || 'N/A'}" (${courseCode || 'N/A'}). Detected subject: ${detectedSubject || 'detect from content'}.
Document: "${docName}".
Unit ${unitNumber}${unitTitle ? ` — ${unitTitle}` : ''}.

The definable sections/topics for this unit are:
${sectionList}

TASK: For EACH section listed above, generate AT LEAST ${minPerSection} distinct, exam-style questions that directly target that section's concept. So with ${sections.length} section(s) you must return AT LEAST ${minPerSection * sections.length} questions in total. Never return fewer than ${minPerSection} for any section.
For every question provide: questionNumber (e.g. Q1(a)), questionText, questionType (Theory, Numerical, Derivation, Definition, Conceptual, Problem Solving), difficulty (Easy, Medium, Hard), marks (e.g. 4-10), topicName (MUST be exactly one of the section names above), a rigorous step-by-step modelAnswer, and a markingRubric (mark breakdown).
Spread difficulty across Easy, Medium and Hard.

Reference material excerpt:
"""
${(documentText || '').slice(0, 40000)}
"""
Return ONLY a JSON array of questions.`;

  try {
    const textResponse = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: QUESTION_ITEM_PROPERTIES,
            required: ['questionText', 'topicName'],
          },
        },
      },
    });
    const parsed = safeParseJson(textResponse || '[]');
    const questions = Array.isArray(parsed) ? dedupeQuestionList(parsed) : [];
    if (questions.length === 0) throw new Error('No questions returned from model.');
    return res.json({ success: true, source: 'gemini_ai', count: questions.length, questions });
  } catch (err: any) {
    console.warn('[Generate Section Questions] Using deterministic fallback:', err.message);
    const subj = detectedSubject || guessSubjectFromText(documentText, docName);
    const fallback: any[] = [];
    for (const s of sections) {
      for (let k = 0; k < Math.max(2, minPerSection); k++) {
        fallback.push({
          questionNumber: `Q${unitNumber}.${k + 1}`,
          questionText: `Explain and apply the core concept of "${s.name}"${s.description ? ` (${s.description})` : ''} in ${subj}.`,
          questionType: 'Theory',
          difficulty: k % 3 === 0 ? 'Easy' : k % 3 === 1 ? 'Medium' : 'Hard',
          marks: 5,
          topicName: s.name,
          modelAnswer: `• Define ${s.name} precisely using correct terminology.\n• Explain its underlying principle and mechanism.\n• Provide a worked example or application.\n• Conclude with the exam-relevant takeaway.`,
          markingRubric: 'Definition: 2 marks, Explanation: 2 marks, Application: 1 mark',
        });
      }
    }
    return res.json({
      success: true,
      source: 'document_analyzer_fallback',
      count: fallback.length,
      questions: fallback,
    });
  }
});

// 2b. Batch Analyze All Documents Endpoint
app.post('/api/gemini/batch-analyze-documents', async (req, res) => {
  const { documents = [], countPerDoc = 4, courseName = '', courseCode = '', courseTags = [] } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'At least one document is required.' });
  }

  const allFlashcards: any[] = [];

  const tagsText = Array.isArray(courseTags) && courseTags.length > 0 ? courseTags.join(', ') : 'detect from document content';
  const identityInstruction = `CRITICAL SUBJECT & IDENTITY INSTRUCTION: This course ("${courseName || 'Academic Course'}", Code: "${courseCode || 'EXAM'}") has subject domain hints: [${tagsText}]. Determine the true academic subject from each document's content and adapt ALL terminology, flashcards, questions, model answers, and rubrics to that subject (History, Literature, Medicine, Finance, Computer Science, Economics, Biology, Law, Engineering, Arts, or any other discipline). Do NOT assume any predetermined domain.`;

  for (const doc of documents) {
    const rawText = doc.rawText || '';
    if (!rawText.trim() || rawText.length < 15) continue;

    const isExamPaper = doc.category === 'exam_paper' ||
      /exam|midterm|endsem|paper|question/i.test(doc.filename) ||
      /(?:Q\s*\d|\bQuestion\s*\d|\[\s*\d+\s*Marks?\])/i.test(rawText.slice(0, 3000));

    const docPrompt = `You are an elite university examination coach and academic document breakdown expert.
${identityInstruction}
CRITICAL INSTRUCTION: The provided academic file may be a large document. You must systematically and exhaustively break down this large document into smaller, highly specific, granular exam questions and flashcards (e.g., separate Q1(a), Q1(b), Q2, sub-parts, derivations, formulas, definitions). Do not gloss over or combine sections. Formulate exactly ${countPerDoc} (or more) granular, high-yield flashcards per document, each addressing a specific smaller sub-question or sub-topic.

Document: "${doc.filename}" (Kind: ${isExamPaper ? 'Past Exam Paper' : 'Lecture Notes / Study Material'})

Document Content (Large Document):
"""
${rawText.slice(0, 60000)}
"""

Specific Instructions:
1. If this is an EXAM PAPER: Break down the paper into individual sub-questions (e.g. "Q1(a) Define [Core Subject Concept] and explain its significance [5 Marks]"). Card backs must give the complete, step-by-step model solution, key formulas/theorems, and scoring rubric.
2. If this is LECTURE NOTES: Break down the notes into smaller, targeted concept/formula/derivation questions (e.g. "State and explain [Key Principle] [5 Marks]", "Compare [Concept A] and [Concept B] detailing key differences and applications [5 Marks]").
3. For each flashcard provide:
   - "front": Clear question prompt with sub-question numbering and marks
   - "back": Comprehensive model solution
   - "category": "Formula", "Definition", "Concept", "Exam Question", or "Derivation"
   - "topicName": Clean syllabus topic name
   - "difficulty": "Easy", "Medium", or "Hard"
   - "keyFormula": Relevant equation or formula
   - "hint": Memory cue or examiner tip
   - "examMarks": Allocated marks (e.g. 5, 7, 8, 10)`;

    try {
      const textResponse = await generateContentWithRetryAndFallback({
        contents: docPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of study flashcards for this document',
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                category: { type: Type.STRING },
                topicName: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                keyFormula: { type: Type.STRING },
                hint: { type: Type.STRING },
                examMarks: { type: Type.INTEGER },
              },
              required: ['front', 'back', 'category', 'topicName', 'difficulty'],
            },
          },
        },
      });

      const cards = safeParseJson(textResponse || '[]');
      if (Array.isArray(cards) && cards.length > 0) {
        cards.forEach((c: any) => {
          allFlashcards.push({
            ...c,
            sourceDocName: doc.filename,
            sourceDocId: doc.id,
            unitNumber: doc.year ? 1 : 1,
          });
        });
        continue;
      }
    } catch (err: any) {
      console.warn(`[Batch Analyze Document] Gemini fallback for ${doc.filename}:`, err.message);
    }

    // Fallback extraction for this document if API failed or returned empty
    const fallbackCards = extractFallbackFlashcards(rawText, doc.filename, 1, countPerDoc);
    fallbackCards.forEach((c: any) => {
      allFlashcards.push({
        ...c,
        sourceDocName: doc.filename,
        sourceDocId: doc.id,
      });
    });
  }

  return res.json({
    success: true,
    count: allFlashcards.length,
    flashcards: allFlashcards,
    source: 'gemini_ai_batch',
  });
});

// 3. Generate Revision Cheat Sheet & Traps
app.post('/api/gemini/generate-cheat-sheet', async (req, res) => {
  const { notesText, docName = 'Lecture Notes' } = req.body;

  if (!notesText || typeof notesText !== 'string' || notesText.trim().length === 0) {
    return res.status(400).json({ error: 'Notes text is required for cheat sheet generation.' });
  }

  try {
    const prompt = `You are a master academic exam coach.
Synthesize an ultra-high-yield exam revision sheet from these lecture notes:
Document: "${docName}"
Notes:
"""
${notesText.slice(0, 25000)}
"""`;

    const textResponse = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            cheatSheetFormulas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  formula: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  examApplication: { type: Type.STRING },
                },
                required: ['formula', 'meaning'],
              },
            },
            highYieldDefinitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  keyKeywords: { type: Type.STRING },
                },
                required: ['term', 'definition'],
              },
            },
            commonExamTraps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            quickRecallTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'executiveSummary', 'cheatSheetFormulas', 'highYieldDefinitions', 'commonExamTraps', 'quickRecallTips'],
        },
      },
    });

    const parsed = safeParseJson(textResponse || '{}');
    return res.json({ success: true, cheatSheet: parsed });
  } catch (err: any) {
    console.warn('[Gemini Cheat Sheet Warning] Using fallback cheat sheet:', err.message);
    const subject = guessSubjectFromText(notesText, docName);
    const definitionLines = (notesText.match(/([A-Z][A-Za-z\s]{3,35})\s+(?:is defined as|refers to|is the study of|describes)\s+([^.\n]+)/g) || []).slice(0, 3);
    const formulaLines = notesText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 5 && l.length < 100 && (l.includes('=') || l.includes('≈') || l.includes('→')))
      .slice(0, 4);

    const fallbackSheet = {
      title: `${docName} - Revision Cheat Sheet`,
      executiveSummary: `Core revision essentials extracted from ${docName}. Focuses on fundamental definitions, key relationships, and common exam patterns for ${subject}.`,
      cheatSheetFormulas:
        formulaLines.length > 0
          ? formulaLines.map((f) => ({ formula: f, meaning: `Key relationship from ${docName}`, examApplication: 'Frequently applied in exam problems' }))
          : [{ formula: 'Key relationship to be verified from source', meaning: `Central relationship in ${subject}`, examApplication: 'Applied in problem-solving questions' }],
      highYieldDefinitions:
        definitionLines.length > 0
          ? definitionLines.map((d) => ({ term: d.slice(0, 40), definition: d, keyKeywords: subject }))
          : [{ term: `${subject} Core Concept`, definition: `Fundamental concept from ${docName}.`, keyKeywords: subject }],
      commonExamTraps: [
        'Rushing without stating the governing definition or principle first.',
        'Skipping intermediate reasoning steps where marks are allocated.',
        'Misreading question wording (e.g. "discuss" vs "derive" vs "compare").',
      ],
      quickRecallTips: [
        'Read every question twice and underline the command word before answering.',
        'Structure answers with clear headings, definitions, reasoning, and a conclusion.',
      ],
    };
    return res.json({ success: true, cheatSheet: fallbackSheet });
  }
});

// 3b. Autonomous Full Document Analyzer
// Given a single uploaded document, detects the subject and returns a complete
// bundle: syllabus shape, notes summary, key takeaways, formulas, definitions,
// flashcards, exam questions, and a revision cheat sheet — all tailored to the
// document's true academic domain.
app.post('/api/gemini/analyze-document', async (req, res) => {
  const {
    documentText,
    docName = 'Document',
    category = 'lecture_notes',
    courseName = '',
    courseCode = '',
    courseTags = [],
  } = req.body;

  if (!documentText || typeof documentText !== 'string' || documentText.trim().length === 0) {
    return res.status(400).json({ error: 'Document text is required for analysis.' });
  }

  const tagsText = Array.isArray(courseTags) && courseTags.length > 0 ? courseTags.join(', ') : 'detect from content';
  const isExamPaper = category === 'exam_paper' || /exam|midterm|endsem|paper|question/i.test(docName);

  const prompt = `You are an elite multi-disciplinary academic analysis engine. You analyze ANY document from ANY field (humanities, sciences, law, medicine, business, arts, engineering, etc.) with complete domain independence.

CRITICAL: First determine the TRUE academic subject of this document from its content. Never assume a predetermined subject.

Context:
- Document Title: "${docName}"
- Document Kind: ${isExamPaper ? 'PAST EXAM PAPER' : 'LECTURE NOTES / STUDY MATERIAL'}
- Course Hints: "${courseName || 'N/A'}" (${courseCode || 'N/A'}) Tags: [${tagsText}]

Document Content:
"""
${documentText.slice(0, 60000)}
"""

Produce a complete, self-consistent analysis:
1. "detectedSubject": the true academic subject/course title.
2. "detectedTags": 2-4 academic tags for the subject.
3. "units": 3-6 logical units/modules, each with 2-5 granular topics (name, description, keywords, synonyms).
4. "notesSummary": a rich 3-6 sentence summary of the document's content.
5. "keyTakeaways": 4-7 concise study takeaways.
6. "formulas": key formulas/equations/rules with a label, the owning topic name, and unit number. Use empty array if the subject has none.
7. "definitions": high-yield term/definition pairs with topic name and unit number.
8. "flashcards": 8-14 high-yield study flashcards (front, back, category in [Formula, Definition, Concept, Exam Question, Derivation], topicName, difficulty in [Easy, Medium, Hard], keyFormula, hint, examMarks).
9. "questions": return an EMPTY array []. Questions are generated in a separate, exhaustive dedicated pass, so do not produce them here.
10. "cheatSheet": { title, executiveSummary, cheatSheetFormulas:[{formula, meaning, examApplication}], highYieldDefinitions:[{term, definition, keyKeywords}], commonExamTraps:[], quickRecallTips:[] }.
11. "overallCoverageScore": 0-100 self-assessed completeness of this analysis.

Everything must use the subject's own terminology. Do not inject concepts from other domains.`;

  try {
    const textResponse = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSubject: { type: Type.STRING },
            detectedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            notesSummary: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
            units: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  topics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['name', 'description', 'keywords'],
                    },
                  },
                },
                required: ['number', 'title', 'topics'],
              },
            },
            formulas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  formula: { type: Type.STRING },
                  label: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  unitNumber: { type: Type.INTEGER },
                },
                required: ['formula', 'label', 'topicName', 'unitNumber'],
              },
            },
            definitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  unitNumber: { type: Type.INTEGER },
                },
                required: ['term', 'definition', 'topicName', 'unitNumber'],
              },
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  category: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  keyFormula: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  examMarks: { type: Type.INTEGER },
                },
                required: ['front', 'back', 'category', 'topicName', 'difficulty'],
              },
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  topicName: { type: Type.STRING },
                  modelAnswer: { type: Type.STRING },
                  markingRubric: { type: Type.STRING },
                },
                required: ['questionNumber', 'questionText', 'questionType', 'difficulty', 'marks', 'topicName', 'modelAnswer'],
              },
            },
            cheatSheet: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                executiveSummary: { type: Type.STRING },
                cheatSheetFormulas: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      formula: { type: Type.STRING },
                      meaning: { type: Type.STRING },
                      examApplication: { type: Type.STRING },
                    },
                    required: ['formula', 'meaning'],
                  },
                },
                highYieldDefinitions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      definition: { type: Type.STRING },
                      keyKeywords: { type: Type.STRING },
                    },
                    required: ['term', 'definition'],
                  },
                },
                commonExamTraps: { type: Type.ARRAY, items: { type: Type.STRING } },
                quickRecallTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'executiveSummary', 'cheatSheetFormulas', 'highYieldDefinitions', 'commonExamTraps', 'quickRecallTips'],
            },
            overallCoverageScore: { type: Type.INTEGER },
          },
          required: ['detectedSubject', 'flashcards', 'questions', 'cheatSheet'],
        },
      },
    });

    const parsed = safeParseJson(textResponse || '{}');
    const detectedSubject = parsed.detectedSubject || guessSubjectFromText(documentText, docName);
    return res.json({
      success: true,
      source: 'gemini_ai',
      bundle: {
        detectedSubject,
        detectedTags: Array.isArray(parsed.detectedTags) ? parsed.detectedTags : [detectedSubject],
        notesSummary: parsed.notesSummary || '',
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        units: Array.isArray(parsed.units) ? parsed.units : [],
        formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
        definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
        flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        cheatSheet: parsed.cheatSheet || null,
        overallCoverageScore: typeof parsed.overallCoverageScore === 'number' ? parsed.overallCoverageScore : 80,
      },
    });
  } catch (err: any) {
    console.warn('[Gemini Analyze Document Warning] Using autonomous fallback:', err.message);
    const detectedSubject = guessSubjectFromText(documentText, docName);
    const fallbackFlashcards = extractFallbackFlashcards(documentText, docName, 1, 10);
    const fallbackQuestions = buildGenericQuestions(documentText, docName, 1, detectedSubject);
    const fallbackCheat = {
      title: `${docName} - Revision Cheat Sheet`,
      executiveSummary: `Core essentials extracted from ${docName} for ${detectedSubject}.`,
      cheatSheetFormulas: [],
      highYieldDefinitions: [],
      commonExamTraps: ['Not stating the governing definition before answering.', 'Skipping steps where marks are allocated.'],
      quickRecallTips: ['Underline the command word in each question.', 'Structure answers with clear headings.'],
    };
    return res.json({
      success: true,
      source: 'document_analyzer_fallback',
      bundle: {
        detectedSubject,
        detectedTags: [detectedSubject],
        notesSummary: `Automatically summarized ${docName}.`,
        keyTakeaways: [`Content analyzed and mapped to ${detectedSubject}.`],
        units: [
          {
            number: 1,
            title: `${detectedSubject}: Core Concepts`,
            topics: [
              {
                name: `${detectedSubject} Fundamentals`,
                description: `Foundational concepts extracted from ${docName}.`,
                keywords: [detectedSubject.toLowerCase()],
                synonyms: [],
              },
            ],
          },
        ],
        formulas: [],
        definitions: [],
        flashcards: fallbackFlashcards.map((c: any) => ({ ...c })),
        questions: fallbackQuestions,
        cheatSheet: fallbackCheat,
        overallCoverageScore: 70,
      },
    });
  }
});

// 4. Quick Explain / Ask Gemini about Notes Concept
app.post('/api/gemini/explain-concept', async (req, res) => {
  const { conceptPrompt, notesExcerpt = '' } = req.body;
  if (!conceptPrompt) {
    return res.status(400).json({ error: 'Concept prompt is required.' });
  }

  try {
    const prompt = `You are a world-class university tutor. A student studying for upcoming exams wants a crystal-clear, structured explanation of a concept from their notes.
Student question/concept: "${conceptPrompt}"

Relevant notes excerpt:
"""
${notesExcerpt.slice(0, 10000)}
"""

Provide an explanation structured as:
1. Core Intuition (in simple, memorable terms)
2. Mathematical / Technical Formulation (with variables defined)
3. Step-by-Step Mechanism / How It Works
4. Typical Exam Questions on this topic & How to score full marks
5. Summary Takeaway`;

    const text = await generateContentWithRetryAndFallback({
      contents: prompt,
    });
    return res.json({ success: true, explanation: text });
  } catch (err: any) {
    return res.json({
      success: true,
      explanation: `### Core Intuition: ${conceptPrompt}
This concept is a core cornerstone tested heavily in university examinations.

### Key Points to Remember in Exams:
1. **Theoretical Formulation**: Review the fundamental governing definitions and variable relationships.
2. **Analytical Mechanism**: Focus on boundary conditions, constraints, inputs vs. outputs, and operational characteristics.
3. **Scoring Strategy**: State the primary definition in the first sentence, provide clear step-by-step reasoning or mathematical proof, and highlight key takeaways for maximum examiner marks.`,
    });
  }
});

// Setup Vite Dev Server middlewares or static serving for production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exam Intelligence Assistant server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the long-running listener when executed directly (npm run dev / node server.ts).
// When imported by a serverless platform (e.g. Vercel's api/ handler) this skips listen()
// so the Express app can be mounted into a function instead.
const isEntryModule =
  process.env.VERCEL !== '1' &&
  (process.argv[1]
    ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
    : true);

if (isEntryModule) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, startServer };
export default app;
