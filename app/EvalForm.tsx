"use client";

import { useState } from "react";
import type { EvalPayload } from "./types";

export default function EvalForm() {
  const [originalRequest, setOriginalRequest] = useState("");
  const [outputToEvaluate, setOutputToEvaluate] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent) {
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

    const payload: EvalPayload = {
      originalRequest: originalRequest.trim(),
      outputToEvaluate: outputToEvaluate.trim(),
      sourceContext: sourceContext.trim() === "" ? null : sourceContext.trim(),
    };

    console.log("Eval submission payload:", payload);
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
        className="self-start px-6 py-2 bg-foreground text-background rounded font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        Submit for Evaluation
      </button>
    </form>
  );
}
