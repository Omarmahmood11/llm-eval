"use client";

import { useState } from "react";
import type { EvalPayload, EvalResponse, EvalScores } from "./types";

export default function EvalForm() {
  const [originalRequest, setOriginalRequest] = useState("");
  const [outputToEvaluate, setOutputToEvaluate] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResult, setApiResult] = useState<EvalScores | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors: string[] = [];

    if (originalRequest.trim() === "") {
      validationErrors.push("Original request is required.");
    }
    if (outputToEvaluate.trim() === "") {
      validationErrors.push("Output to evaluate is required.");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear any previous validation errors on successful submit
    setErrors([]);
    setApiResult(null);

    const payload: EvalPayload = {
      originalRequest: originalRequest.trim(),
      outputToEvaluate: outputToEvaluate.trim(),
      sourceContext: sourceContext.trim() === "" ? null : sourceContext.trim(),
    };

    console.log("Eval submission payload:", payload);

    setIsLoading(true);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body: EvalResponse = await res.json();
      console.log("API response:", body);

      if (!res.ok || body.error) {
        setErrors([body.error ?? `Request failed with status ${res.status}`]);
        return;
      }

      if (body.result) {
        setApiResult(body.result);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setErrors([
        `Network error: could not reach the server. Details: ${message}`,
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-2xl">
      {errors.length > 0 && (
        <div
          id="validation-errors"
          role="alert"
          className="p-3 border border-red-400 bg-red-50 text-red-800 rounded text-sm"
        >
          <ul className="list-disc list-inside">
            {errors.map((error) => (
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

      {apiResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            id="relevance-result"
            className="p-4 border border-gray-200 rounded"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Relevance
              </h2>
              <span
                id="relevance-score"
                className="text-2xl font-bold"
              >
                {apiResult.relevance.score}/5
              </span>
            </div>
            <p
              id="relevance-reasoning"
              className="text-sm text-gray-700"
            >
              {apiResult.relevance.reasoning}
            </p>
          </div>

          <div
            id="user-alignment-result"
            className="p-4 border border-gray-200 rounded"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                User Alignment
              </h2>
              <span
                id="user-alignment-score"
                className="text-2xl font-bold"
              >
                {apiResult.userAlignment.score}/5
              </span>
            </div>
            <p
              id="user-alignment-reasoning"
              className="text-sm text-gray-700"
            >
              {apiResult.userAlignment.reasoning}
            </p>
          </div>

          <div
            id="faithfulness-result"
            className={`p-4 border rounded ${apiResult.faithfulness.score === null ? "border-gray-200 bg-gray-50 opacity-75" : "border-gray-200"}`}
          >
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Faithfulness
              </h2>
              <span
                id="faithfulness-score"
                className={`text-2xl font-bold ${apiResult.faithfulness.score === null ? "text-gray-400" : ""}`}
              >
                {apiResult.faithfulness.score === null ? "N/A" : `${apiResult.faithfulness.score}/5`}
              </span>
            </div>
            <p
              id="faithfulness-reasoning"
              className={`text-sm ${apiResult.faithfulness.score === null ? "text-gray-500 italic" : "text-gray-700"}`}
            >
              {apiResult.faithfulness.score === null ? "Not scored — no source provided" : apiResult.faithfulness.reasoning}
            </p>
          </div>

          <div
            id="safety-result"
            className="p-4 border border-gray-200 rounded"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Safety
              </h2>
              <span
                id="safety-score"
                className="text-2xl font-bold"
              >
                {apiResult.safety.score}/5
              </span>
            </div>
            <p
              id="safety-reasoning"
              className="text-sm text-gray-700"
            >
              {apiResult.safety.reasoning}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
