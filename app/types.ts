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
 * Response shape from POST /api/evaluate.
 *
 * Exactly one of result or error will be present.
 */
export interface EvalResponse {
  result?: string;
  error?: string;
}
