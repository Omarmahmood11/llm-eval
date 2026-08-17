"use client";

import type { EvalError } from "./types";

/**
 * Contextual error display per error category.
 *
 * Each category gets a distinct title, colour, and actionable guidance
 * so the user knows what happened and what they can do about it.
 *
 * Rate limit states that a daily request limit was reached, per edgecases.md.
 */

interface ErrorConfig {
  title: string;
  guidance: string;
  /** "amber" for recoverable/transient, "red" for config/system errors */
  severity: "amber" | "red";
}

function getErrorConfig(category: EvalError["category"]): ErrorConfig {
  switch (category) {
    case "rate_limit":
      return {
        title: "Rate limit reached",
        guidance:
          "The daily request limit has been reached. Please try again later.",
        severity: "amber",
      };
    case "timeout":
      return {
        title: "Request timed out",
        guidance:
          "The evaluation took too long to respond. Try again, or try with shorter input.",
        severity: "amber",
      };
    case "network":
      return {
        title: "Connection failed",
        guidance:
          "Could not reach the evaluation service. Check your internet connection and try again.",
        severity: "amber",
      };
    case "malformed_output":
      return {
        title: "Unexpected response",
        guidance:
          "The judge returned an unexpected format. This is unusual; try submitting again.",
        severity: "amber",
      };
    case "auth":
      return {
        title: "Configuration error",
        guidance:
          "The API key is invalid or unauthorized. This is a server-side issue, not something you caused.",
        severity: "red",
      };
    case "server_config":
      return {
        title: "Service not configured",
        guidance:
          "The evaluation service is not set up. The API key may be missing from the server.",
        severity: "red",
      };
    case "unknown":
    default:
      return {
        title: "Something went wrong",
        guidance: "",
        severity: "red",
      };
  }
}

/**
 * Renders a contextual error card with title, guidance, and a retry button.
 */
export default function ErrorDisplay({
  error,
  onRetry,
}: {
  error: EvalError;
  onRetry: () => void;
}) {
  const config = getErrorConfig(error.category);

  const isAmber = config.severity === "amber";
  const containerClass = isAmber
    ? "border-hair bg-caution-soft border-l-caution"
    : "border-hair bg-flag-soft border-l-flag";
  const titleClass = isAmber ? "text-caution" : "text-flag";
  const bodyClass = "text-text-dim";
  const iconPath = isAmber
    ? // Warning triangle
      "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
    : // Error circle
      "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z";

  return (
    <div
      id="error-display"
      role="alert"
      className={`p-4 border border-l-2 ${containerClass}`}
    >
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${titleClass}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={iconPath}
          />
        </svg>
        <div className="flex-1 min-w-0">
          <h3 className={`font-mono text-xs font-bold uppercase tracking-[0.16em] ${titleClass}`}>
            {config.title}
          </h3>
          {config.guidance && (
            <p className={`text-sm mt-1 ${bodyClass}`}>{config.guidance}</p>
          )}
          {/* For unknown errors, show the raw message as fallback */}
          {error.category === "unknown" && (
            <p className={`text-sm mt-1 ${bodyClass}`}>{error.message}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className={`mt-3 text-sm font-medium underline underline-offset-2 ${titleClass} hover:opacity-80 transition-opacity cursor-pointer`}
      >
        Try again
      </button>
    </div>
  );
}
