import {
  NotesAnalysisResult,
  NotesCriticalGap,
  NotesDefinition,
  NotesFormula,
  Syllabus,
  TopicAnalytics,
  TopicNotesCoverage,
} from '../types';

/**
 * Analyzes lecture notes / study materials against the official syllabus
 * and past exam priority patterns to calculate coverage, identify critical gaps,
 * and extract high-yield formulas and definitions.
 */
export function analyzeNotesDocument(
  docId: string,
  docName: string,
  rawText: string,
  syllabus: Syllabus,
  topicAnalyticsList?: TopicAnalytics[]
): NotesAnalysisResult {
  // Split into pages if page markers exist, or chunk by sections
  const pages: { pageNum: number; text: string }[] = [];
  const pageRegex = /---\s*Page\s*(\d+)\s*---/gi;
  const matches = Array.from(rawText.matchAll(pageRegex));

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const pageNum = parseInt(match[1], 10);
      const startIndex = match.index! + match[0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : rawText.length;
      const pageContent = rawText.slice(startIndex, endIndex).trim();
      pages.push({ pageNum, text: pageContent });
    }
  } else {
    // Treat whole text as page 1 or split every 1500 chars as virtual pages
    const paragraphs = rawText.split(/\n\s*\n/);
    let currentPage = 1;
    let currentBuf = '';
    for (const p of paragraphs) {
      currentBuf += p + '\n\n';
      if (currentBuf.length > 1200) {
        pages.push({ pageNum: currentPage++, text: currentBuf.trim() });
        currentBuf = '';
      }
    }
    if (currentBuf.trim()) {
      pages.push({ pageNum: currentPage, text: currentBuf.trim() });
    }
  }

  const totalPages = Math.max(pages.length, 1);

  // Map analytics by topicId for priority lookup
  const analyticsMap = new Map<string, TopicAnalytics>();
  if (topicAnalyticsList) {
    topicAnalyticsList.forEach((ta) => analyticsMap.set(ta.topicId, ta));
  }

  const topicCoverages: TopicNotesCoverage[] = [];
  const extractedFormulas: NotesFormula[] = [];
  const extractedDefinitions: NotesDefinition[] = [];

  let formulaIdCounter = 1;
  let defIdCounter = 1;

  let totalTopics = 0;
  let coveredTopicsCount = 0;
  let highPriorityTotal = 0;
  let highPriorityCovered = 0;

  for (const unit of syllabus.units) {
    for (const topic of unit.topics) {
      totalTopics++;
      const ta = analyticsMap.get(topic.id);
      const isHighOrCritical = ta?.priorityTier === 'CRITICAL' || ta?.priorityTier === 'HIGH';
      if (isHighOrCritical) {
        highPriorityTotal++;
      }

      // Check occurrences across pages
      const searchTerms = [
        topic.name.toLowerCase(),
        ...topic.keywords.map((k) => k.toLowerCase()),
        ...topic.synonyms.map((s) => s.toLowerCase()),
      ];

      const pagesReferenced: number[] = [];
      let totalMentions = 0;
      let matchedSnippets: string[] = [];

      pages.forEach((p) => {
        const lowerText = p.text.toLowerCase();
        let pageMatched = false;
        for (const term of searchTerms) {
          if (lowerText.includes(term)) {
            pageMatched = true;
            totalMentions++;
            // Grab a 120-char excerpt around match
            const pos = lowerText.indexOf(term);
            const excerpt = p.text.substring(Math.max(0, pos - 40), Math.min(p.text.length, pos + 120)).trim();
            matchedSnippets.push(excerpt);
          }
        }
        if (pageMatched && !pagesReferenced.includes(p.pageNum)) {
          pagesReferenced.push(p.pageNum);
        }
      });

      // Determine coverage status
      let coverageStatus: TopicNotesCoverage['coverageStatus'] = 'Missing';
      if (pagesReferenced.length >= 2 || totalMentions >= 4) {
        coverageStatus = 'Comprehensive';
      } else if (pagesReferenced.length === 1 || totalMentions >= 2) {
        coverageStatus = 'Moderate';
      } else if (totalMentions === 1) {
        coverageStatus = 'Sparse';
      } else {
        coverageStatus = 'Missing';
      }

      if (coverageStatus !== 'Missing') {
        coveredTopicsCount++;
        if (isHighOrCritical) {
          highPriorityCovered++;
        }
      }

      // Extract formulas related to this topic from notes text
      const topicFormulas: string[] = [];
      pagesReferenced.forEach((pageNum) => {
        const pageText = pages.find((p) => p.pageNum === pageNum)?.text || '';
        // Look for equations (lines containing '=' and math symbols)
        const lines = pageText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          const hasRelation = trimmed.includes('=') || trimmed.includes('≈') || trimmed.includes('->') || trimmed.includes('→');
          const hasSymbolOrWord = /[A-Za-z\u0370-\u03FF]/.test(trimmed);
          if (
            hasRelation &&
            hasSymbolOrWord &&
            trimmed.length < 100 &&
            trimmed.length > 5 &&
            !trimmed.startsWith('--') &&
            !/^https?:/i.test(trimmed)
          ) {
            if (!topicFormulas.includes(trimmed)) {
              topicFormulas.push(trimmed);
              extractedFormulas.push({
                id: `f-${formulaIdCounter++}`,
                formula: trimmed,
                label: `${topic.name} equation`,
                topicName: topic.name,
                unitNumber: unit.number,
                page: pageNum,
              });
            }
          }
        }
      });

      // Extract definitions
      const topicDefs: string[] = [];
      pagesReferenced.forEach((pageNum) => {
        const pageText = pages.find((p) => p.pageNum === pageNum)?.text || '';
        const defPatterns = [
          new RegExp(`(${topic.name}|[a-zA-Z\\s]{3,25})\\s+is\\s+defined\\s+as\\s+([^.\\n]{10,120})`, 'i'),
          new RegExp(`(${topic.name}|[a-zA-Z\\s]{3,25})\\s+refers\\s+to\\s+([^.\\n]{10,120})`, 'i'),
          new RegExp(`([A-Za-z0-9\\s]{3,25}):\\s*([^.\\n]{15,140})`, 'i'),
        ];
        for (const pat of defPatterns) {
          const match = pageText.match(pat);
          if (match && match[2]) {
            const term = match[1].trim();
            const defText = match[2].trim();
            if (!topicDefs.includes(defText)) {
              topicDefs.push(defText);
              extractedDefinitions.push({
                id: `d-${defIdCounter++}`,
                term,
                definition: defText,
                topicName: topic.name,
                unitNumber: unit.number,
                page: pageNum,
              });
            }
          }
        }
      });

      // Study recommendation & gap warning
      let gapWarning: string | undefined = undefined;
      let studyAction = 'Notes cover this topic adequately for revision.';

      if (coverageStatus === 'Missing') {
        if (isHighOrCritical) {
          gapWarning = `CRITICAL GAP: High exam priority (${ta?.examMarksPercentage || 0}% marks), but completely absent in notes!`;
          studyAction = `Immediate action: Supplement from standard textbook or peer notes before the exam.`;
        } else {
          gapWarning = 'Topic is not covered in current notes.';
          studyAction = 'Review core definitions from reference textbook if time permits.';
        }
      } else if (coverageStatus === 'Sparse') {
        if (isHighOrCritical) {
          gapWarning = `HIGH GAP: Frequent exam topic (${ta?.appearanceCount || 0} occurrences), but only briefly mentioned with missing derivations.`;
          studyAction = 'Expand notes with step-by-step mathematical derivations and schematic diagrams.';
        } else {
          studyAction = 'Review brief summary and attempt 1-2 practice questions.';
        }
      } else if (coverageStatus === 'Moderate') {
        studyAction = 'Solid foundation. Focus on past question variations and numerical practice.';
      } else {
        studyAction = 'Thoroughly covered in notes with formulas. Use for rapid pre-exam revision.';
      }

      topicCoverages.push({
        topicId: topic.id,
        topicName: topic.name,
        unitNumber: unit.number,
        coverageStatus,
        pageReferences: pagesReferenced.sort((a, b) => a - b),
        keyFormulas: topicFormulas.slice(0, 4),
        keyDefinitions: topicDefs.slice(0, 3),
        notesExcerpt: matchedSnippets[0] || 'No direct notes excerpt found.',
        gapWarning,
        studyAction,
      });
    }
  }

  // Identify Critical Gaps for Exam Strategy
  const criticalGaps: NotesCriticalGap[] = [];
  topicCoverages.forEach((tc) => {
    const ta = analyticsMap.get(tc.topicId);
    const tier = ta?.priorityTier || 'LOW';
    if ((tier === 'CRITICAL' || tier === 'HIGH') && (tc.coverageStatus === 'Missing' || tc.coverageStatus === 'Sparse')) {
      criticalGaps.push({
        topicId: tc.topicId,
        topicName: tc.topicName,
        unitNumber: tc.unitNumber,
        priorityTier: tier,
        examMarksPercentage: ta?.examMarksPercentage || 0,
        issue:
          tc.coverageStatus === 'Missing'
            ? 'Missing entirely from lecture notes despite high historical exam recurrence.'
            : 'Notes contain only introductory definitions without derivations or worked detail.',
        recommendation: tc.studyAction,
      });
    }
  });

  const overallCoverageScore = totalTopics > 0 ? Math.round((coveredTopicsCount / totalTopics) * 100) : 0;
  const highPriorityCoverageScore =
    highPriorityTotal > 0 ? Math.round((highPriorityCovered / highPriorityTotal) * 100) : overallCoverageScore;

  const notesQualityScore = Math.min(
    100,
    Math.round(overallCoverageScore * 0.4 + highPriorityCoverageScore * 0.4 + Math.min(extractedFormulas.length, 10) * 2)
  );

  const keyTakeaways = [
    `Covers ${coveredTopicsCount} of ${totalTopics} syllabus topics (${overallCoverageScore}% overall coverage).`,
    `High-yield exam coverage is at ${highPriorityCoverageScore}%, with ${criticalGaps.length} critical gap${criticalGaps.length === 1 ? '' : 's'} flagged.`,
    `Extracted ${extractedFormulas.length} key mathematical equations/formulas and ${extractedDefinitions.length} core technical definitions across ${totalPages} pages.`,
  ];

  return {
    documentId: docId,
    documentName: docName,
    totalPages,
    overallCoverageScore,
    highPriorityCoverageScore,
    topicsCoveredCount: coveredTopicsCount,
    totalSyllabusTopics: totalTopics,
    criticalGaps,
    topicCoverages,
    extractedFormulas,
    extractedDefinitions,
    keyTakeaways,
    notesQualityScore,
  };
}
