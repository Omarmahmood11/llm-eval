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

  const fieldClass =
    "border border-hair bg-panel/60 p-3.5 text-sm text-text leading-relaxed resize-y " +
    "placeholder:text-text-faint focus:border-ember focus:bg-panel focus:outline-none " +
    "focus-visible:outline-none transition-colors";
  const labelClass =
    "font-mono text-[0.7rem] uppercase tracking-[0.2em] text-text-dim flex items-center gap-2.5";
  const indexClass = "text-text-faint";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 w-full">
      {/* Validation errors (client-side, for empty fields) */}
      {validationErrors.length > 0 && (
        <div
          id="validation-errors"
          role="alert"
          className="p-4 border border-hair bg-flag-soft text-text text-sm border-l-2 border-l-flag"
        >
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-flag mb-2">
            // Incomplete
          </p>
          <ul className="flex flex-col gap-1 text-text-dim">
            {validationErrors.map((error) => (
              <li key={error} className="flex gap-2">
                <span className="text-flag font-mono" aria-hidden="true">
                  &rsaquo;
                </span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <label htmlFor="original-request" className={labelClass}>
          <span className={indexClass}>01</span> Original Request{" "}
          <span className="text-ember">*</span>
        </label>
        <textarea
          id="original-request"
          value={originalRequest}
          onChange={(e) => setOriginalRequest(e.target.value)}
          rows={4}
          placeholder="The prompt or question that was sent to the LLM"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="output-to-evaluate" className={labelClass}>
          <span className={indexClass}>02</span> Output to Evaluate{" "}
          <span className="text-ember">*</span>
        </label>
        <textarea
          id="output-to-evaluate"
          value={outputToEvaluate}
          onChange={(e) => setOutputToEvaluate(e.target.value)}
          rows={6}
          placeholder="The LLM's response that you want to score"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <label htmlFor="source-context" className={labelClass}>
          <span className={indexClass}>03</span> Source Context{" "}
          <span className="text-text-faint normal-case tracking-normal lowercase">
            (optional)
          </span>
        </label>
        <textarea
          id="source-context"
          value={sourceContext}
          onChange={(e) => setSourceContext(e.target.value)}
          rows={4}
          placeholder="Reference material the output should be grounded in, if any"
          className={fieldClass}
        />
      </div>

      <button
        id="submit-eval"
        type="submit"
        disabled={isLoading}
        className="self-start px-7 py-3 bg-ember text-void font-mono text-xs font-bold uppercase tracking-[0.2em] hover:bg-ember-bright transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? "Scoring…" : "Run Evaluation →"}
      </button>

      {/* API error: contextual display per error category */}
      {apiError && (
        <ErrorDisplay error={apiError} onRetry={clearResults} />
      )}

      {/* Results: score cards with visual weight per dimension */}
      {apiResult && <ResultsDisplay result={apiResult} />}
    </form>
  );
}
