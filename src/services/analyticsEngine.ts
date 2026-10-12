import {
  Difficulty,
  ExtractedQuestion,
  PriorityTier,
  QuestionType,
  Syllabus,
  TopicAnalytics,
  TopicNotesCoverage,
} from '../types';

function slugifyTopicKey(key: string): string {
  const slug = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'unclassified';
}

/**
 * Calculates comprehensive topic-level analytics, yearly trends, and transparent Study Priority Scores.
 *
 * Every question contributes to a topic row:
 * - Questions mapped to a syllabus topic feed that topic's analytics.
 * - Unmapped questions that carry an AI-detected topic name (e.g. from multi-subject
 *   papers / collections) are grouped into derived topic rows so they are never silently
 *   dropped from Study Priorities, revision plans, or the question viewer.
 */
export function calculateTopicAnalytics(
  questions: ExtractedQuestion[],
  syllabus: Syllabus,
  uniquePapersCount: number,
  allYears: number[],
  notesCoverageList?: TopicNotesCoverage[]
): TopicAnalytics[] {
  const notesCoverageMap = new Map<string, TopicNotesCoverage>();
  if (notesCoverageList) {
    notesCoverageList.forEach((nc) => notesCoverageMap.set(nc.topicId, nc));
  }

  const totalObservedMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const activeQuestions = questions.filter((q) => q.reviewStatus !== 'Rejected');

  const questionsByTopic = new Map<string, ExtractedQuestion[]>();
  activeQuestions.forEach((q) => {
    if (q.mappedTopicId) {
      const existing = questionsByTopic.get(q.mappedTopicId) || [];
      existing.push(q);
      questionsByTopic.set(q.mappedTopicId, existing);
    }
  });

  const sortedYears = Array.from(new Set(allYears)).sort((a, b) => a - b);
  const distinctYearsCount = sortedYears.length;
  const recentYear = sortedYears.length > 0 ? sortedYears[sortedYears.length - 1] : 2024;

  const buildRow = (
    topicId: string,
    topicName: string,
    unitNumber: number,
    unitTitle: string,
    topicQuestions: ExtractedQuestion[],
    notesCoverage?: TopicNotesCoverage
  ): TopicAnalytics => {
    const appearanceCount = topicQuestions.length;
    const papersWithTopic = new Set(topicQuestions.map((q) => q.paperId));
    const papersAppearedInCount = papersWithTopic.size;
    const paperAppearanceRate =
      uniquePapersCount > 0 ? Math.round((papersAppearedInCount / uniquePapersCount) * 100) : 0;

    const totalMarks = topicQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const examMarksPercentage =
      totalObservedMarks > 0 ? Math.round((totalMarks / totalObservedMarks) * 100 * 10) / 10 : 0;
    const avgMarksPerQuestion =
      appearanceCount > 0 ? Math.round((totalMarks / appearanceCount) * 10) / 10 : 0;

    const yearsAppeared = Array.from(
      new Set(topicQuestions.map((q) => q.paperYear))
    ).sort((a, b) => a - b);

    let recentTrend: TopicAnalytics['recentTrend'] = 'Insufficient Data';
    let trendReason = 'Not enough historical data to determine a reliable trend.';
    let trendScore = 50;

    if (distinctYearsCount < 2 || uniquePapersCount < 2) {
      recentTrend = 'Insufficient Data';
      trendReason = 'Only 1 historical paper/year available; cannot calculate reliable momentum.';
      trendScore = 50;
    } else {
      const midPointYear = sortedYears[Math.floor(sortedYears.length / 2)];
      const recentQuestions = topicQuestions.filter((q) => q.paperYear >= midPointYear);
      const olderQuestions = topicQuestions.filter((q) => q.paperYear < midPointYear);

      const appearedInMostRecent = yearsAppeared.includes(recentYear);
      const recentCount = recentQuestions.length;
      const olderCount = olderQuestions.length;

      if (recentCount > olderCount && appearedInMostRecent) {
        recentTrend = 'Increasing';
        trendReason = `Appeared ${recentCount} times in recent years compared to ${olderCount} previously, including the latest session.`;
        trendScore = 95;
      } else if (recentCount === olderCount && appearanceCount >= 2) {
        recentTrend = 'Stable';
        trendReason = `Consistently features in examination papers across consecutive years.`;
        trendScore = 75;
      } else if (olderCount > recentCount && recentCount === 0) {
        recentTrend = 'Decreasing';
        trendReason = `Frequently asked in earlier exams (${olderCount} times) but absent or reduced in recent sittings.`;
        trendScore = 35;
      } else if (appearanceCount > 0) {
        recentTrend = 'Irregular';
        trendReason = `Intermittent appearance across alternating exam cycles.`;
        trendScore = 55;
      } else {
        recentTrend = 'Decreasing';
        trendReason = `Has not appeared in any analyzed question papers.`;
        trendScore = 20;
      }
    }

    const typeCounts: Record<QuestionType, number> = {
      Theory: 0,
      Numerical: 0,
      Derivation: 0,
      Definition: 0,
      Conceptual: 0,
      'Problem Solving': 0,
      Mixed: 0,
      Unknown: 0,
    };
    topicQuestions.forEach((q) => {
      typeCounts[q.questionType] = (typeCounts[q.questionType] || 0) + 1;
    });

    const questionTypeDistribution: Record<QuestionType, number> = {} as any;
    (Object.keys(typeCounts) as QuestionType[]).forEach((qt) => {
      questionTypeDistribution[qt] =
        appearanceCount > 0 ? Math.round((typeCounts[qt] / appearanceCount) * 100) : 0;
    });

    const diffCounts: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
    topicQuestions.forEach((q) => {
      diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
    });
    const difficultyDistribution: Record<Difficulty, number> = {
      Easy: appearanceCount > 0 ? Math.round((diffCounts.Easy / appearanceCount) * 100) : 0,
      Medium: appearanceCount > 0 ? Math.round((diffCounts.Medium / appearanceCount) * 100) : 0,
      Hard: appearanceCount > 0 ? Math.round((diffCounts.Hard / appearanceCount) * 100) : 0,
    };

    const marksWeightageScore = Math.min(100, Math.round((examMarksPercentage / 18) * 100));
    const frequencyScore = Math.min(100, Math.round(paperAppearanceRate * 1.05));
    const recentTrendScore = trendScore;
    const consistencyScore =
      uniquePapersCount > 0
        ? Math.min(100, Math.round((papersAppearedInCount / uniquePapersCount) * 100))
        : 0;
    const diffScore =
      difficultyDistribution.Hard * 1.0 +
      difficultyDistribution.Medium * 0.7 +
      difficultyDistribution.Easy * 0.4;
    const difficultyRelevanceScore =
      appearanceCount > 0 ? Math.min(100, Math.round(diffScore)) : 30;
    const avgConfidence =
      topicQuestions.length > 0
        ? Math.round(
            topicQuestions.reduce((s, q) => s + q.mappingConfidenceScore, 0) / topicQuestions.length
          )
        : 50;

    let rawPriority =
      marksWeightageScore * 0.3 +
      frequencyScore * 0.25 +
      recentTrendScore * 0.15 +
      consistencyScore * 0.15 +
      difficultyRelevanceScore * 0.1 +
      avgConfidence * 0.05;

    if (appearanceCount === 0) {
      rawPriority = 22;
    }

    const studyPriorityScore = Math.min(99, Math.max(15, Math.round(rawPriority)));

    let priorityTier: PriorityTier = 'LOW';
    if (studyPriorityScore >= 78) {
      priorityTier = 'CRITICAL';
    } else if (studyPriorityScore >= 62) {
      priorityTier = 'HIGH';
    } else if (studyPriorityScore >= 45) {
      priorityTier = 'MEDIUM';
    } else {
      priorityTier = 'LOW';
    }

    const dominantType = (Object.keys(questionTypeDistribution) as QuestionType[]).sort(
      (a, b) => questionTypeDistribution[b] - questionTypeDistribution[a]
    )[0];
    const dominantDiff = (['Hard', 'Medium', 'Easy'] as Difficulty[]).sort(
      (a, b) => difficultyDistribution[b] - difficultyDistribution[a]
    )[0];

    let explanation = '';
    if (appearanceCount === 0) {
      explanation = `Did not appear in any of the ${uniquePapersCount} analyzed past papers. Review foundational concepts after mastering high-priority exam topics.`;
    } else {
      const paperFraction = `${papersAppearedInCount} of ${uniquePapersCount} past paper${
        uniquePapersCount > 1 ? 's' : ''
      }`;
      const trendPhrase =
        recentTrend === 'Increasing'
          ? 'has shown an increasing trend in recent exams'
          : recentTrend === 'Stable'
          ? 'maintains consistent recurring presence'
          : recentTrend === 'Decreasing'
          ? 'shows a decline in recent sittings'
          : 'has appeared across exam sessions';

      explanation = `Appeared in ${paperFraction} (${paperAppearanceRate}%), contributes ${examMarksPercentage}% of observed total exam marks, and ${trendPhrase}. Primarily tested through ${dominantType.toLowerCase()} questions at ${dominantDiff.toLowerCase()} difficulty.`;
    }

    return {
      topicId,
      topicName,
      unitNumber,
      unitTitle,
      appearanceCount,
      totalPapers: uniquePapersCount,
      papersAppearedInCount,
      paperAppearanceRate,
      totalMarks,
      examMarksPercentage,
      avgMarksPerQuestion,
      yearsAppeared,
      recentTrend,
      trendReason,
      questionTypeDistribution,
      difficultyDistribution,
      studyPriorityScore,
      priorityTier,
      scoreBreakdown: {
        frequencyScore,
        marksWeightageScore,
        recentTrendScore,
        consistencyScore,
        difficultyRelevanceScore,
        analysisConfidence: avgConfidence,
      },
      explanation,
      historicalQuestions: topicQuestions,
      notesCoverage,
    };
  };

  const results: TopicAnalytics[] = [];

  // 1) Syllabus topics
  for (const unit of syllabus.units) {
    for (const topic of unit.topics) {
      const topicQuestions = questionsByTopic.get(topic.id) || [];
      results.push(
        buildRow(
          topic.id,
          topic.name,
          unit.number,
          unit.title,
          topicQuestions,
          notesCoverageMap.get(topic.id)
        )
      );
    }
  }

  // 2) Derived topics: questions that have no mapped syllabus topic must still surface
  //    in Study Priorities / revisions. Group them by AI-detected topic name, falling
  //    back to an unclassified-per-paper bucket for deterministic parses.
  const derivedGroups = new Map<string, ExtractedQuestion[]>();
  activeQuestions
    .filter((q) => !q.mappedTopicId)
    .forEach((q) => {
      const name = (q.mappedTopicName || '').trim();
      const key = name
        ? name.toLowerCase()
        : `__unclassified__${q.paperId}`;
      const group = derivedGroups.get(key) || [];
      group.push(q);
      derivedGroups.set(key, group);
    });

  derivedGroups.forEach((group, key) => {
    const sample = group[0];
    const name = sample?.mappedTopicName?.trim();
    const unitNumber = sample?.unitNumber || 0;
    const displayName = name || `Unclassified (${group[0]?.paperName || 'detected questions'})`;
    const topicId = `derived-${slugifyTopicKey(key)}`;
    const unitTitle = name ? 'Detected Topics' : 'Unclassified Questions';

    results.push(buildRow(topicId, displayName, unitNumber, unitTitle, group));
  });

  results.sort((a, b) => b.studyPriorityScore - a.studyPriorityScore);

  return results;
}