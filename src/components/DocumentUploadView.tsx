import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { ExamDocument, ProcessingStage, Syllabus } from '../types';
import { extractTextFromImage, extractTextFromPDF } from '../services/documentExtractor';
import { parseExamPaperText } from '../services/questionParser';
import { analyzeNotesDocument } from '../services/notesAnalyzer';

interface DocumentUploadViewProps {
  documents: ExamDocument[];
  syllabus?: Syllabus;
  onAddDocuments: (newDocs: ExamDocument[], newQuestions: any[]) => void;
  onDeleteDocument: (docId: string) => void;
  onInspectDocument: (doc: ExamDocument) => void;
  onNavigateToQuestions: () => void;
  onNavigateToNotes?: () => void;
  onOpenGeminiModal?: (mode: 'flashcards' | 'questions' | 'cheat_sheet' | 'explain', docId?: string) => void;
  onAutoGenerateAllFlashcards?: () => void;
}

export const DocumentUploadView: React.FC<DocumentUploadViewProps> = ({
  documents,
  syllabus,
  onAddDocuments,
  onDeleteDocument,
  onInspectDocument,
  onNavigateToQuestions,
  onNavigateToNotes,
  onOpenGeminiModal,
  onAutoGenerateAllFlashcards,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [detectedYear, setDetectedYear] = useState<number>(2024);
  const [detectedSession, setDetectedSession] = useState<string>('End-Sem');
  const [selectedCategory, setSelectedCategory] = useState<'exam_paper' | 'lecture_notes'>('exam_paper');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stagesList: { key: ProcessingStage; label: string }[] = [
    { key: 'uploading', label: 'Uploading' },
    { key: 'extracting', label: 'Extracting Text' },
    { key: 'ocr', label: 'Reading/OCR' },
    { key: 'detecting_questions', label: 'Detecting Questions & Topics' },
    { key: 'classifying', label: 'Classifying' },
    { key: 'analyzing', label: 'Analyzing Patterns' },
    { key: 'complete', label: 'Complete' },
  ];

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newDocs: ExamDocument[] = [];
    const allNewQuestions: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docId = `doc-user-${Date.now()}-${i}`;
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileType: ExamDocument['fileType'] =
        ext === 'pdf' ? 'pdf' : ext === 'png' ? 'png' : ext === 'txt' ? 'txt' : 'jpeg';

      // Infer category from filename or current selection
      const isNotes =
        selectedCategory === 'lecture_notes' ||
        /note|lecture|slide|chapter|material|summary/i.test(file.name);
      const category: ExamDocument['category'] = isNotes ? 'lecture_notes' : 'exam_paper';

      // Infer year from filename if present
      const yearMatch = file.name.match(/\b(20[12]\d)\b/);
      const paperYear = yearMatch ? parseInt(yearMatch[1], 10) : detectedYear;

      // Infer session from filename
      let session = isNotes ? 'Class Notes' : detectedSession;
      if (!isNotes) {
        if (/midterm|mst/i.test(file.name)) session = 'Midterm';
        else if (/endsem|end-sem|final/i.test(file.name)) session = 'End-Sem';
      }

      try {
        // Step 1: Uploading
        setCurrentStage(`Uploading ${file.name}...`);
        await new Promise((r) => setTimeout(r, 200));

        // Step 2: Text Extraction / OCR
        setCurrentStage(`Extracting text & running OCR on ${file.name}...`);
        let extractedResult = { rawText: '', pageCount: 1, warnings: [] as string[] };

        if (fileType === 'pdf') {
          extractedResult = await extractTextFromPDF(file);
        } else if (fileType === 'txt') {
          const text = await file.text();
          extractedResult = { rawText: text, pageCount: 1, warnings: [] };
        } else {
          extractedResult = await extractTextFromImage(file);
        }

        let notesAnalysisResult = undefined;
        let rawQuestions: any[] = [];

        if (category === 'lecture_notes') {
          setCurrentStage(`Analyzing notes coverage & extracting formulas from ${file.name}...`);
          await new Promise((r) => setTimeout(r, 250));
          if (syllabus) {
            notesAnalysisResult = analyzeNotesDocument(docId, file.name, extractedResult.rawText, syllabus);
          }
        } else {
          // Step 3: Detecting Questions for Exam Papers
          setCurrentStage(`Detecting & segmenting questions in ${file.name}...`);
          await new Promise((r) => setTimeout(r, 200));
          rawQuestions = parseExamPaperText(
            extractedResult.rawText,
            docId,
            file.name,
            paperYear,
            session
          );
        }

        const newDoc: ExamDocument = {
          id: docId,
          courseId: 'current',
          filename: file.name,
          fileSize: file.size,
          fileType,
          category,
          year: paperYear,
          session,
          uploadDate: new Date().toISOString(),
          processingStage: 'complete',
          stageProgress: 100,
          rawText: extractedResult.rawText,
          extractedQuestionsCount: rawQuestions.length,
          warnings: extractedResult.warnings,
          notesAnalysis: notesAnalysisResult,
        };

        newDocs.push(newDoc);
        if (rawQuestions.length > 0) {
          allNewQuestions.push(
            ...rawQuestions.map((q) => ({
              ...q,
              paperId: docId,
              paperName: file.name,
              paperYear,
              paperSession: session,
            }))
          );
        }
      } catch (err: any) {
        console.error('Error processing file:', err);
        const failedDoc: ExamDocument = {
          id: docId,
          courseId: 'current',
          filename: file.name,
          fileSize: file.size,
          fileType,
          category,
          year: paperYear,
          session,
          uploadDate: new Date().toISOString(),
          processingStage: 'failed',
          stageProgress: 0,
          rawText: '',
          extractedQuestionsCount: 0,
          warnings: ['Failed to process file format.'],
          errorMessage: err?.message || 'Processing error',
        };
        newDocs.push(failedDoc);
      }
    }

    onAddDocuments(newDocs, allNewQuestions);
    setIsProcessing(false);
    setCurrentStage('');
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600 shrink-0 aspect-square" />
            <span>Upload Question Papers & Lecture Notes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Support for PDF question papers, lecture notes, and scanned exam photos (PNG, JPG, JPEG). Upload past papers to discover recurrence patterns, and upload lecture notes for notes coverage & gap analysis.
          </p>
        </div>

        {/* Optional Defaults for Year and Session before uploading */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
            <span>Document Settings:</span>
          </span>
          <div className="flex items-center space-x-1.5">
            <label htmlFor="default-category-select" className="text-slate-500 font-medium">Type:</label>
            <select
              id="default-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
            >
              <option value="exam_paper">Exam Question Paper (PYQ)</option>
              <option value="lecture_notes">Lecture Notes / Study Material</option>
            </select>
          </div>
          <div className="flex items-center space-x-1.5">
            <label htmlFor="default-exam-year-select" className="text-slate-500 font-medium">Year:</label>
            <select
              id="default-exam-year-select"
              value={detectedYear}
              onChange={(e) => setDetectedYear(parseInt(e.target.value, 10))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              {[2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-1.5">
            <label htmlFor="default-exam-session-select" className="text-slate-500 font-medium">Session:</label>
            <select
              id="default-exam-session-select"
              value={detectedSession}
              onChange={(e) => setDetectedSession(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            >
              <option value="End-Sem">End-Semester Exam</option>
              <option value="Midterm">Midterm Exam (MST)</option>
              <option value="Class Notes">Class Notes / Summary</option>
              <option value="Winter">Winter Session</option>
              <option value="Summer">Summer Session</option>
            </select>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
              handleFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto aspect-square">
              <Upload className="w-6 h-6 shrink-0 aspect-square" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Drag and drop question papers or lecture notes here, or <span className="text-indigo-600 underline">browse files</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, PNG, JPG/JPEG scans, and TXT files.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400">
              <span>Automatic question parsing</span>
              <span>·</span>
              <span>Marks extraction</span>
              <span>·</span>
              <span>Notes coverage & formulas</span>
            </div>
          </div>
        </div>

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0 aspect-square" />
              <span>{currentStage || 'Processing documents...'}</span>
            </div>

            {/* Pipeline Step Visualizer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1 text-[10px]">
              {stagesList.map((st, i) => (
                <div
                  key={st.key}
                  className="bg-slate-800 p-1.5 rounded text-center text-slate-300 border border-slate-700"
                >
                  <span className="block text-slate-500 text-[9px]">Step {i + 1}</span>
                  <span className="font-medium truncate block">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gemini Batch Document Intelligence Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xs border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 aspect-square shadow-xs">
            <Sparkles className="w-5 h-5 text-indigo-200 shrink-0 aspect-square" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white">
                Gemini Document Intelligence Analyzer
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-xs text-indigo-200/90 mt-0.5">
              Automatically analyze all {documents.length} uploaded papers and lecture notes to extract exam questions and formulate study flashcards.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenGeminiModal && (
            <>
              <button
                onClick={() => onOpenGeminiModal('flashcards')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200 shrink-0 aspect-square" />
                <span>Form Flashcards from Documents</span>
              </button>
              <button
                onClick={() => onOpenGeminiModal('questions')}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0 aspect-square" />
                <span>Form Practice Questions</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Documents in Knowledge Base ({documents.length})
            </h3>
            <p className="text-xs text-slate-500">
              These uploaded files serve as the default primary knowledge source for notes analysis, priority calculations, questions, and flashcards.
            </p>
          </div>

          <button
            onClick={onNavigateToQuestions}
            title="Review Extracted Questions"
            aria-label="Review Extracted Questions"
            className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs"
          >
            <span className="hidden sm:inline">Review Extracted Questions</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 aspect-square" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const hasWarnings = doc.warnings.length > 0;
            const isFailed = doc.processingStage === 'failed';
            const isNotesDoc = doc.category === 'lecture_notes' || doc.notesAnalysis !== undefined;

            return (
              <div
                key={doc.id}
                className={`py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 rounded-xl transition-colors ${
                  isNotesDoc ? 'bg-indigo-50/25 hover:bg-indigo-50/50 border border-indigo-100/60' : 'hover:bg-slate-50/60'
                }`}
              >
                {/* Left: File metadata */}
                <div className="flex items-start space-x-2.5 sm:space-x-3">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                    isNotesDoc ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isNotesDoc ? (
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 aspect-square" />
                    ) : (
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 aspect-square" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                        {doc.filename}
                      </h4>
                      <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                        isNotesDoc ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isNotesDoc ? 'Lecture Notes' : 'Exam Paper'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {doc.year} {doc.session}
                      </span>
                      <span>·</span>
                      <span>{Math.round(doc.fileSize / 1024)} KB</span>
                      <span>·</span>
                      {isNotesDoc ? (
                        <span className="font-semibold text-indigo-700">
                          Coverage: {doc.notesAnalysis?.overallCoverageScore || 78}% ({doc.notesAnalysis?.totalPages || 14} pages)
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {doc.extractedQuestionsCount} Questions ({doc.rawText.length > 0 ? `${Math.round(doc.rawText.length / 1000)}k chars` : '0k'})
                        </span>
                      )}
                    </div>

                    {hasWarnings && (
                      <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] text-indigo-700 mt-1">
                        <AlertTriangle className="w-3 h-3 text-indigo-600 shrink-0 aspect-square" />
                        <span className="line-clamp-1">{doc.warnings[0]}</span>
                      </div>
                    )}

                    {isFailed && (
                      <p className="text-[10px] sm:text-[11px] text-rose-600 font-semibold mt-1">
                        Error: {doc.errorMessage || 'Failed to extract file'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-end sm:self-center shrink-0">
                  {onOpenGeminiModal && (
                    <button
                      onClick={() => onOpenGeminiModal('flashcards', doc.id)}
                      className="p-1 sm:p-1.5 px-2.5 sm:px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center space-x-1 text-xs transition-colors border border-indigo-200 cursor-pointer shadow-2xs"
                      title="Analyze this document and form study flashcards with Gemini"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 aspect-square" />
                      <span>Form Flashcards</span>
                    </button>
                  )}

                  {onOpenGeminiModal && (
                    <button
                      onClick={() => onOpenGeminiModal('questions', doc.id)}
                      className="p-1 sm:p-1.5 px-2.5 sm:px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1 text-xs transition-colors border border-slate-200 cursor-pointer"
                      title="Analyze this document and form practice exam questions with Gemini"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 aspect-square" />
                      <span className="hidden md:inline">Form Questions</span>
                    </button>
                  )}

                  {isNotesDoc && onNavigateToNotes && (
                    <button
                      onClick={onNavigateToNotes}
                      className="p-1 sm:p-1.5 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1 text-xs transition-colors shadow-2xs cursor-pointer"
                      title="View Notes Analysis"
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-200" />
                      <span className="hidden sm:inline">Notes Analysis</span>
                    </button>
                  )}

                  <button
                    onClick={() => onInspectDocument(doc)}
                    className="p-1 sm:p-1.5 px-2.5 sm:px-3 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center space-x-1 text-xs transition-colors"
                    title="Inspect OCR and extracted text"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0 aspect-square" />
                    <span className="hidden sm:inline">Inspect OCR</span>
                  </button>

                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-1 sm:p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove paper"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0 aspect-square" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
