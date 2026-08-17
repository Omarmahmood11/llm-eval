"use client";

import type { EvalScores } from "./types";

/**
 * Score colour mapping:
 *   4–5 → green (good)
 *   3   → amber (mixed)
 *   1–2 → red (poor)
 */
function scoreColor(score: number): {
  border: string;
  badge: string;
  badgeText: string;
} {
  if (score >= 4) {
    return {
      border: "border-l-emerald-500",
      badge: "bg-emerald-100 text-emerald-800",
      badgeText: "text-emerald-700",
    };
  }
  if (score === 3) {
    return {
      border: "border-l-amber-400",
      badge: "bg-amber-100 text-amber-800",
      badgeText: "text-amber-700",
    };
  }
  return {
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-800",
    badgeText: "text-red-700",
  };
}

/**
 * A single score card for a scored dimension.
 */
function ScoreCard({
  id,
  label,
  score,
  reasoning,
}: {
  id: string;
  label: string;
  score: number;
  reasoning: string;
}) {
  const colors = scoreColor(score);

  return (
    <div
      id={`${id}-result`}
      className={`p-5 border border-gray-200 rounded-lg border-l-4 ${colors.border} bg-white`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </h2>
        <span
          id={`${id}-score`}
          className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${colors.badge}`}
        >
          {score}/5
        </span>
      </div>
      <p id={`${id}-reasoning`} className="text-sm text-gray-700 leading-relaxed">
        {reasoning}
      </p>
    </div>
  );
}

/**
 * The distinct null-Faithfulness card.
 * Visually dimmed, clearly labelled as intentionally absent.
 */
function FaithfulnessNullCard({ reasoning }: { reasoning: string }) {
  return (
    <div
      id="faithfulness-result"
      className="p-5 border border-gray-200 rounded-lg border-l-4 border-l-gray-300 bg-gray-50"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Faithfulness
        </h2>
        <span
          id="faithfulness-score"
          className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-500"
        >
          N/A
        </span>
      </div>
      <p
        id="faithfulness-reasoning"
        className="text-sm text-gray-500 italic leading-relaxed"
      >
        {reasoning || "Not scored — no source provided"}
      </p>
    </div>
  );
}

/**
 * Renders evaluation results as a grid of score cards.
 *
 * Handles:
 * - Normal scored dimensions (coloured by score range)
 * - Null Faithfulness with distinct "not scored" state
 */
export default function ResultsDisplay({ result }: { result: EvalScores }) {
  return (
    <div id="results-display" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ScoreCard
        id="relevance"
        label="Relevance"
        score={result.relevance.score}
        reasoning={result.relevance.reasoning}
      />
      <ScoreCard
        id="user-alignment"
        label="User Alignment"
        score={result.userAlignment.score}
        reasoning={result.userAlignment.reasoning}
      />
      {result.faithfulness.score === null ? (
        <FaithfulnessNullCard reasoning={result.faithfulness.reasoning} />
      ) : (
        <ScoreCard
          id="faithfulness"
          label="Faithfulness"
          score={result.faithfulness.score}
          reasoning={result.faithfulness.reasoning}
        />
      )}
      <ScoreCard
        id="safety"
        label="Safety"
        score={result.safety.score}
        reasoning={result.safety.reasoning}
      />
    </div>
  );
}
