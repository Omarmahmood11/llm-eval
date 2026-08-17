"use client";

import { useState } from "react";
import type { EvalPayload, EvalResponse, EvalScores, EvalError } from "./types";
import ResultsDisplay from "./ResultsDisplay";
import ErrorDisplay from "./ErrorDisplay";

/** Client-side fetch timeout. Slightly longer than server-side (25s) to let server timeout fire first. */
const CLIENT_TIMEOUT_MS = 30_000;

export default function EvalForm() {
  const [originalRequest, setOriginalRequest] = useState("");
  const [outputToEvaluate, setOutputToEvaluate] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResult, setApiResult] = useState<EvalScores | null>(null);
  const [apiError, setApiError] = useState<EvalError | null>(null);

  function clearResults() {
    setApiResult(null);
    setApiError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors: string[] = [];

    if (originalRequest.trim() === "") {
      errors.push("Original request is required.");
    }
    if (outputToEvaluate.trim() === "") {
      errors.push("Output to evaluate is required.");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous state on new submission
    setValidationErrors([]);
    clearResults();

    const payload: EvalPayload = {
      originalRequest: originalRequest.trim(),
      outputToEvaluate: outputToEvaluate.trim(),
      sourceContext: sourceContext.trim() === "" ? null : sourceContext.trim(),
    };

    console.log("Eval submission payload:", payload);

    setIsLoading(true);

    // Client-side timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body: EvalResponse = await res.json();
      console.log("API response:", body);

      if (!res.ok || body.error) {
        setApiError({
          message: body.error ?? `Request failed with status ${res.status}`,
          category: body.errorCategory ?? "unknown",
        });
        return;
      }

      if (body.result) {
        setApiResult(body.result);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Distinguish AbortError (timeout) from network failures
      if (err instanceof DOMException && err.name === "AbortError") {
        setApiError({
          message: "The request timed out after 30 seconds.",
          category: "timeout",
        });
        return;
      }

      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setApiError({
        message: `Network error: could not reach the server. Details: ${message}`,
        category: "network",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Validation errors (client-side, for empty fields) */}
      {validationErrors.length > 0 && (
        <div
          id="validation-errors"
          role="alert"
          className="p-3 border border-red-400 bg-red-50 text-red-800 rounded text-sm"
        >
          <ul className="list-disc list-inside">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="original-request" className="text-sm font-medium">
          Original Request <span className="text-red-600">*</span>
        </label>
        <textarea
          id="original-request"
          value={originalRequest}
          onChange={(e) => setOriginalRequest(e.target.value)}
          rows={4}
          placeholder="The prompt or question that was sent to the LLM"
          className="border border-gray-300 rounded p-2 text-sm resize-y"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="output-to-evaluate" className="text-sm font-medium">
          Output to Evaluate <span className="text-red-600">*</span>
        </label>
        <textarea
          id="output-to-evaluate"
          value={outputToEvaluate}
          onChange={(e) => setOutputToEvaluate(e.target.value)}
          rows={6}
          placeholder="The LLM's response that you want to score"
          className="border border-gray-300 rounded p-2 text-sm resize-y"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="source-context" className="text-sm font-medium">
          Source Context <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="source-context"
          value={sourceContext}
          onChange={(e) => setSourceContext(e.target.value)}
          rows={4}
          placeholder="Reference material the output should be grounded in, if any"
          className="border border-gray-300 rounded p-2 text-sm resize-y"
        />
      </div>

      <button
        id="submit-eval"
        type="submit"
        disabled={isLoading}
        className="self-start px-6 py-2 bg-foreground text-background rounded font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Evaluating…" : "Submit for Evaluation"}
      </button>

      {/* API error — contextual display per error category */}
      {apiError && (
        <ErrorDisplay error={apiError} onRetry={clearResults} />
      )}

      {/* Results — score cards with visual weight per dimension */}
      {apiResult && <ResultsDisplay result={apiResult} />}
    </form>
  );
}
