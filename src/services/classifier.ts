import { Difficulty, QuestionType } from '../types';

export interface ClassificationResult {
  questionType: QuestionType;
  typeConfidence: number;
  typeReason: string;
}

export interface DifficultyResult {
  difficulty: Difficulty;
  difficultyConfidence: number;
  difficultyReason: string;
}

/**
 * Classifies a question into its pedagogical type using deterministic explainable rules
 */
export function classifyQuestionType(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  // Numerical indicators
  const numericalKeywords = [
    'calculate', 'find the value', 'determine the value', 'compute', 'solve for',
    'given that', 'find the total', 'find the ratio', 'find the percentage',
    'evaluate', 'how many', 'how much', 'at what rate', 'what is the value of'
  ];
  const hasNumbersAndUnits = /\b\d+(?:\.\d+)?\s*(?:%|kg|km|cm|mm|ms|s|hz|khz|mhz|mol|l|ml|°c|k|j|kj|n|pa|kpa|mpa|usd|eur)\b/i.test(text);
  const hasMathEquations = /[=+\-*/^]\s*\d+/.test(text);
  const numericalScore = numericalKeywords.filter(k => lower.includes(k)).length * 2 + (hasNumbersAndUnits ? 3 : 0) + (hasMathEquations ? 2 : 0);

  // Derivation indicators
  const derivationKeywords = [
    'derive', 'derive an expression', 'derive the formula', 'prove that', 'show that',
    'obtain an expression', 'deduce', 'mathematically show', 'derive equation'
  ];
  const derivationMatches = derivationKeywords.filter(k => lower.includes(k));

  // Definition indicators
  const definitionKeywords = [
    'define', 'what is', 'what do you mean by', 'state the principle', 'state and explain',
    'give definition', 'enunciate', 'write short note on', 'what are the types of'
  ];
  const definitionMatches = definitionKeywords.filter(k => lower.includes(k));

  // Conceptual indicators
  const conceptualKeywords = [
    'compare', 'differentiate between', 'distinguish between', 'why is', 'explain why',
    'what happens when', 'justify', 'significance of', 'advantages and disadvantages',
    'need for', 'draw and explain the characteristics'
  ];
  const conceptualMatches = conceptualKeywords.filter(k => lower.includes(k));

  // Problem Solving / Design indicators
  const designKeywords = [
    'design a', 'construct a', 'implement a', 'synthesize', 'develop a solution',
    'formulate', 'plan and', 'devise'
  ];
  const designMatches = designKeywords.filter(k => lower.includes(k));

  // Theory indicators
  const theoryKeywords = [
    'explain the working', 'describe with diagram', 'working principle', 'with neat sketch',
    'block diagram', 'discuss', 'elaborate', 'explain in detail'
  ];
  const theoryMatches = theoryKeywords.filter(k => lower.includes(k));

  // Decision logic with explainability
  if (derivationMatches.length > 0) {
    if (numericalScore >= 3) {
      return {
        questionType: 'Mixed',
        typeConfidence: 85,
        typeReason: `Contains derivation prompt ("${derivationMatches[0]}") along with numerical calculations.`,
      };
    }
    return {
      questionType: 'Derivation',
      typeConfidence: 92,
      typeReason: `Contains formal mathematical derivation directive ("${derivationMatches[0]}").`,
    };
  }

  if (designMatches.length > 0) {
    return {
      questionType: 'Problem Solving',
      typeConfidence: 88,
      typeReason: `Requires active engineering synthesis/design ("${designMatches[0]}").`,
    };
  }

  if (numericalScore >= 3) {
    return {
      questionType: 'Numerical',
      typeConfidence: Math.min(95, 75 + numericalScore * 5),
      typeReason: `Features explicit numeric parameters, units, or quantitative calculation request.`,
    };
  }

  if (definitionMatches.length > 0 && lower.length < 90) {
    return {
      questionType: 'Definition',
      typeConfidence: 90,
      typeReason: `Concise inquiry requesting standard academic definition ("${definitionMatches[0]}").`,
    };
  }

  if (conceptualMatches.length > 0) {
    return {
      questionType: 'Conceptual',
      typeConfidence: 85,
      typeReason: `Tests foundational understanding through comparison/causal explanation ("${conceptualMatches[0]}").`,
    };
  }

  if (theoryMatches.length > 0) {
    return {
      questionType: 'Theory',
      typeConfidence: 86,
      typeReason: `Standard descriptive question demanding a structured written explanation.`,
    };
  }

  // Default fallback check
  if (lower.includes('explain') || lower.includes('describe') || lower.includes('how')) {
    return {
      questionType: 'Theory',
      typeConfidence: 70,
      typeReason: `Descriptive theory prompt asking to explain or describe system operation.`,
    };
  }

  return {
    questionType: 'Theory',
    typeConfidence: 55,
    typeReason: `General academic topic inquiry defaulting to theoretical knowledge assessment.`,
  };
}

/**
 * Estimates question difficulty based on marks, multi-step composition, and concept depth
 */
export function estimateDifficulty(
  text: string,
  marks: number | null,
  qType: QuestionType
): DifficultyResult {
  const lower = text.toLowerCase();
  let difficultyPoints = 0;
  const reasons: string[] = [];

  // 1. Marks signal
  if (marks !== null) {
    if (marks >= 8) {
      difficultyPoints += 4;
      reasons.push(`High mark allocation (${marks}M) implies multi-step rigorous response`);
    } else if (marks >= 4) {
      difficultyPoints += 2;
      reasons.push(`Moderate mark allocation (${marks}M)`);
    } else if (marks <= 3) {
      difficultyPoints -= 2;
      reasons.push(`Low mark allocation (${marks}M) suggests concise direct answer`);
    }
  }

  // 2. Question type signal
  if (qType === 'Derivation') {
    difficultyPoints += 2.5;
    reasons.push('Mathematical derivations require structured formula steps');
  } else if (qType === 'Numerical') {
    difficultyPoints += 2;
    reasons.push('Quantitative numerical requiring calculation precision');
  } else if (qType === 'Definition') {
    difficultyPoints -= 2;
    reasons.push('Direct definition question');
  } else if (qType === 'Problem Solving') {
    difficultyPoints += 2;
    reasons.push('Requires synthesis, design, or multi-part problem solving');
  }

  // 3. Multi-part / Multi-clause complexity
  const multiClauseIndicators = ['also determine', 'and hence', 'if now', 'compare with', 'verify that'];
  const hasMultiClause = multiClauseIndicators.some(k => lower.includes(k));
  if (hasMultiClause) {
    difficultyPoints += 2;
    reasons.push('Contains conditional sub-steps ("also determine" / "and hence")');
  }

  // 4. Length and parameter density
  if (text.length > 200) {
    difficultyPoints += 1.5;
  }

  // Classify into Easy / Medium / Hard
  let difficulty: Difficulty = 'Medium';
  let confidence = 78;

  if (difficultyPoints <= 0) {
    difficulty = 'Easy';
    confidence = marks !== null ? 85 : 70;
  } else if (difficultyPoints >= 4.5) {
    difficulty = 'Hard';
    confidence = marks !== null ? 88 : 72;
  } else {
    difficulty = 'Medium';
    confidence = 80;
  }

  const mainReason = reasons.length > 0 
    ? reasons.slice(0, 2).join('; ') 
    : `Estimated from average conceptual requirements and question scope.`;

  return {
    difficulty,
    difficultyConfidence: confidence,
    difficultyReason: mainReason,
  };
}
