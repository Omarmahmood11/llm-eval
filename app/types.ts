/**
 * Payload shape for an evaluation submission.
 *
 * sourceContext is null (not "") when the user leaves it blank.
 * This matters because Faithfulness cannot be scored without source context.
 */
export interface EvalPayload {
  originalRequest: string;
  outputToEvaluate: string;
  sourceContext: string | null;
}

/**
 * A single dimension score returned by the judge.
 */
export interface DimensionScore {
  score: number; // 1–5
  reasoning: string; // one-sentence justification
}

/**
 * Score for the Faithfulness dimension, which is only scored if source context is provided.
 */
export interface FaithfulnessScore {
  score: number | null; // 1-5 or null
  reasoning: string;
}

/**
 * All scores returned by the judge.
 */
export interface EvalScores {
  relevance: DimensionScore;
  userAlignment: DimensionScore;
  faithfulness: FaithfulnessScore;
  safety: DimensionScore;
}

/**
 * Response shape from POST /api/evaluate.
 *
 * Exactly one of result or error will be present.
 */
export interface EvalResponse {
  result?: EvalScores;
  error?: string;
}
