import { Syllabus, SyllabusTopic } from '../types';

export interface TopicMatchResult {
  mappedTopicId: string | null;
  mappedTopicName: string | null;
  unitNumber?: number;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingConfidenceScore: number;
  mappingReason: string;
  mappingMethod: 'keyword_match' | 'tf_idf_semantic' | 'exact_phrase' | 'ai_assisted' | 'manual';
  alternativeTopics: Array<{
    topicId: string;
    topicName: string;
    score: number;
    reason: string;
  }>;
}

// Common stop words to ignore in text similarity
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'explain', 'describe', 'derive', 'calculate', 'find',
  'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whose', 'determine',
  'state', 'give', 'show', 'write', 'note', 'using', 'neat', 'sketch', 'diagram',
  'expression', 'values', 'following'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Maps a question to the most relevant syllabus topic using explainable keyword and TF-IDF matching
 */
export function mapQuestionToTopic(questionText: string, syllabus: Syllabus): TopicMatchResult {
  const allTopics: SyllabusTopic[] = [];
  syllabus.units.forEach(u => {
    u.topics.forEach(t => allTopics.push(t));
  });

  if (allTopics.length === 0) {
    return {
      mappedTopicId: null,
      mappedTopicName: null,
      mappingConfidence: 'Low',
      mappingConfidenceScore: 0,
      mappingReason: 'No syllabus topics available for matching.',
      mappingMethod: 'tf_idf_semantic',
      alternativeTopics: [],
    };
  }

  const qTokens = tokenize(questionText);
  const qTokenSet = new Set(qTokens);
  const qLower = questionText.toLowerCase();

  const scoredCandidates: Array<{
    topic: SyllabusTopic;
    score: number;
    matchedKeywords: string[];
    isExactPhrase: boolean;
  }> = [];

  for (const topic of allTopics) {
    let score = 0;
    const matchedKeywords: string[] = [];
    let isExactPhrase = false;

    // 1. Exact phrase check on Topic Name
    const topicNameLower = topic.name.toLowerCase();
    if (qLower.includes(topicNameLower)) {
      score += 45;
      matchedKeywords.push(`"${topic.name}"`);
      isExactPhrase = true;
    } else {
      // Token overlap on topic name
      const nameTokens = tokenize(topic.name);
      const overlap = nameTokens.filter(t => qTokenSet.has(t));
      if (overlap.length > 0) {
        score += (overlap.length / nameTokens.length) * 25;
        matchedKeywords.push(...overlap);
      }
    }

    // 2. Synonyms match (very high priority)
    for (const syn of topic.synonyms || []) {
      const synLower = syn.toLowerCase();
      if (qLower.includes(synLower)) {
        score += 35;
        matchedKeywords.push(`"${syn}"`);
      }
    }

    // 3. Keywords match
    for (const kw of topic.keywords || []) {
      const kwLower = kw.toLowerCase();
      if (kwLower.includes(' ') && qLower.includes(kwLower)) {
        score += 25;
        matchedKeywords.push(kw);
      } else if (qTokenSet.has(kwLower)) {
        score += 15;
        matchedKeywords.push(kw);
      }
    }

    // 4. Description tokens overlap
    if (topic.description) {
      const descTokens = tokenize(topic.description);
      const descOverlap = descTokens.filter(t => qTokenSet.has(t));
      score += Math.min(15, descOverlap.length * 2.5);
    }

    scoredCandidates.push({
      topic,
      score,
      matchedKeywords: Array.from(new Set(matchedKeywords)),
      isExactPhrase,
    });
  }

  // Sort descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  const best = scoredCandidates[0];
  const second = scoredCandidates[1];
  const third = scoredCandidates[2];

  if (!best || best.score <= 3) {
    return {
      mappedTopicId: null,
      mappedTopicName: null,
      mappingConfidence: 'Low',
      mappingConfidenceScore: 15,
      mappingReason: 'No strong syllabus keyword correspondence detected. Requires manual assignment.',
      mappingMethod: 'tf_idf_semantic',
      alternativeTopics: scoredCandidates.slice(0, 3).map(c => ({
        topicId: c.topic.id,
        topicName: c.topic.name,
        score: Math.round(c.score),
        reason: c.matchedKeywords.length > 0 ? `Weak overlap: ${c.matchedKeywords.join(', ')}` : 'Low term similarity',
      })),
    };
  }

  // Normalize confidence score between 0 and 100
  let normScore = Math.min(98, Math.round(best.score * 1.5));
  let confidenceLevel: 'High' | 'Medium' | 'Low' = 'Low';
  let method: 'exact_phrase' | 'keyword_match' | 'tf_idf_semantic' = 'keyword_match';

  if (best.isExactPhrase || normScore >= 70) {
    confidenceLevel = 'High';
    method = best.isExactPhrase ? 'exact_phrase' : 'keyword_match';
  } else if (normScore >= 40) {
    confidenceLevel = 'Medium';
    method = 'keyword_match';
  } else {
    confidenceLevel = 'Low';
    method = 'tf_idf_semantic';
  }

  const uniqueMatches = best.matchedKeywords.slice(0, 4).join(', ');
  const reason = uniqueMatches
    ? `Strong match on key syllabus terms: ${uniqueMatches} in Unit ${best.topic.unitNumber}.`
    : `Matched topical vocabulary in Unit ${best.topic.unitNumber} (${best.topic.name}).`;

  const alternativeTopics = [second, third]
    .filter(Boolean)
    .filter(c => c.score > 2)
    .map(c => ({
      topicId: c.topic.id,
      topicName: c.topic.name,
      score: Math.min(95, Math.round(c.score * 1.4)),
      reason: c.matchedKeywords.length > 0 ? `Shared terms: ${c.matchedKeywords.join(', ')}` : 'Related domain concepts',
    }));

  return {
    mappedTopicId: best.topic.id,
    mappedTopicName: best.topic.name,
    unitNumber: best.topic.unitNumber,
    mappingConfidence: confidenceLevel,
    mappingConfidenceScore: normScore,
    mappingReason: reason,
    mappingMethod: method,
    alternativeTopics,
  };
}
