import { PriorityTier, RevisionPlan, RevisionSession, Syllabus, TopicAnalytics } from '../types';

export function generateRevisionPlan(
  courseId: string,
  examDateStr: string,
  dailyHours: number,
  topicAnalytics: TopicAnalytics[],
  syllabus: Syllabus
): RevisionPlan {
  const today = new Date();
  const examDate = new Date(examDateStr);
  
  // Calculate days remaining (at least 2 days, default to 7 if in past)
  let diffTime = examDate.getTime() - today.getTime();
  let daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (isNaN(daysRemaining) || daysRemaining <= 1) {
    daysRemaining = 5;
  }
  // Cap at 30 days max for actionable sprint
  daysRemaining = Math.min(30, Math.max(2, daysRemaining));

  // Build a lookup for userConfidence
  const userConfidenceMap = new Map<string, string>();
  syllabus.units.forEach(u => {
    u.topics.forEach(t => {
      userConfidenceMap.set(t.id, t.userConfidence);
    });
  });

  // Calculate weighted priority queue for topics
  // Weak student confidence adds a boost
  const scoredTopics = topicAnalytics.map(t => {
    const studentConf = userConfidenceMap.get(t.topicId) || 'unrated';
    let boostedScore = t.studyPriorityScore;
    if (studentConf === 'weak') boostedScore += 15;
    if (studentConf === 'strong') boostedScore -= 10;

    return {
      ...t,
      effectiveScore: Math.max(10, boostedScore),
      studentConf,
    };
  });

  // Sort by effective score
  scoredTopics.sort((a, b) => b.effectiveScore - a.effectiveScore);

  // Guard against empty topics (e.g. fresh course without syllabus topics yet)
  if (scoredTopics.length === 0) {
    return {
      courseId,
      examDate: examDateStr,
      availableStudyHoursPerDay: dailyHours,
      generatedDate: new Date().toISOString(),
      totalDays: daysRemaining,
      totalSessions: 0,
      sessions: [],
    };
  }

  const sessions: RevisionSession[] = [];
  const dailyMinutesAvailable = Math.round(dailyHours * 60);

  // Determine standard session blocks (e.g. 60m, 90m, or 45m blocks)
  const sessionBlockMinutes = dailyMinutesAvailable >= 180 ? 90 : dailyMinutesAvailable >= 120 ? 60 : 45;
  const sessionsPerDay = Math.max(1, Math.floor(dailyMinutesAvailable / sessionBlockMinutes));

  let sessionCounter = 1;

  for (let day = 1; day <= daysRemaining; day++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + (day - 1));
    const dateFormatted = targetDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Special logic for final day: Final Review & Formula Recap
    if (day === daysRemaining) {
      // Final exam eve
      const topCritical = scoredTopics.slice(0, 3);
      topCritical.forEach((top, idx) => {
        if (idx < sessionsPerDay) {
          sessions.push({
            id: `rev-sess-${sessionCounter++}`,
            dayNumber: day,
            dateStr: dateFormatted,
            topicId: top.topicId,
            topicName: top.topicName,
            unitTitle: top.unitTitle,
            durationMinutes: Math.round(dailyMinutesAvailable / Math.min(sessionsPerDay, topCritical.length)),
            sessionType: 'Final review',
            focusNotes: `High-yield summary sheet review, key diagrams, and quick-scan of past recurring questions.`,
            priorityTier: top.priorityTier,
            placementReason: `Final pre-exam consolidation of the highest weightage topic (${top.examMarksPercentage}% exam marks).`,
            completed: false,
          });
        }
      });
      continue;
    }

    // Penultimate day: Past-paper full practice
    if (day === daysRemaining - 1 && daysRemaining >= 3) {
      const topTopics = scoredTopics.slice(0, sessionsPerDay);
      topTopics.forEach(top => {
        sessions.push({
          id: `rev-sess-${sessionCounter++}`,
          dayNumber: day,
          dateStr: dateFormatted,
          topicId: top.topicId,
          topicName: top.topicName,
          unitTitle: top.unitTitle,
          durationMinutes: sessionBlockMinutes,
          sessionType: 'Past-paper practice',
          focusNotes: `Timed self-test: Attempt all ${top.historicalQuestions.length} past exam questions without notes.`,
          priorityTier: top.priorityTier,
          placementReason: `Simulation day before exam to cement timing and step-marking accuracy.`,
          completed: false,
        });
      });
      continue;
    }

    // Regular study days: Balanced Learn & Practice
    for (let s = 0; s < sessionsPerDay; s++) {
      // Pick topic based on round-robin priority
      const topicIndex = ((day - 1) * sessionsPerDay + s) % scoredTopics.length;
      const topic = scoredTopics[topicIndex];
      const isWeak = topic.studentConf === 'weak';

      let sessionType: RevisionSession['sessionType'] = 'Learn';
      let focusNotes = '';
      let placementReason = '';

      if (topic.priorityTier === 'CRITICAL' || isWeak) {
        if (day <= Math.ceil(daysRemaining / 2)) {
          sessionType = 'Learn';
          focusNotes = `Master foundational derivations, working principles, and core theory.`;
          placementReason = isWeak 
            ? `Flagged as weak area; scheduled in early cycle for foundational clarity.` 
            : `Critical topic (${topic.studyPriorityScore}/100) carrying heavy mark weightage.`;
        } else {
          sessionType = 'Practice';
          focusNotes = `Solve numerical problems and step-by-step worked derivations.`;
          placementReason = `High-yield practice phase following foundational mastery.`;
        }
      } else if (topic.priorityTier === 'HIGH') {
        sessionType = day % 2 === 0 ? 'Practice' : 'Learn';
        focusNotes = `Review key concepts, definitions, and standard exam question templates.`;
        placementReason = `High recurrence topic (${topic.paperAppearanceRate}% of past papers).`;
      } else {
        sessionType = 'Revision';
        focusNotes = `Rapid formula recap and 2-mark definition drills.`;
        placementReason = `Moderate weightage topic scheduled for efficient targeted revision.`;
      }

      sessions.push({
        id: `rev-sess-${sessionCounter++}`,
        dayNumber: day,
        dateStr: dateFormatted,
        topicId: topic.topicId,
        topicName: topic.topicName,
        unitTitle: topic.unitTitle,
        durationMinutes: sessionBlockMinutes,
        sessionType,
        focusNotes,
        priorityTier: topic.priorityTier,
        placementReason,
        completed: false,
      });
    }
  }

  return {
    courseId,
    examDate: examDateStr,
    availableStudyHoursPerDay: dailyHours,
    generatedDate: new Date().toISOString(),
    totalDays: daysRemaining,
    totalSessions: sessions.length,
    sessions,
  };
}
