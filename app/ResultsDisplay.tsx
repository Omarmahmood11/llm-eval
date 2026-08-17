"use client";

import type { EvalScores } from "./types";

/**
 * Score → ramp classes. A SINGLE-HUE luminance ramp: a higher score glows
 * brighter on the same teal hue and lights more segments on the meter.
 * Magnitude, not pass/fail; deliberately not red-bad / green-good.
 *
 * Class strings are written out in full so Tailwind detects and generates them.
 */
const RAMP: Record<number, { num: string; cell: string }> = {
  1: { num: "text-score-1", cell: "bg-score-1" },
  2: { num: "text-score-2", cell: "bg-score-2" },
  3: { num: "text-score-3", cell: "bg-score-3" },
  4: { num: "text-score-4", cell: "bg-score-4" },
  5: { num: "text-score-5", cell: "bg-score-5" },
};

/** A 5-segment signal meter; lit cells = score, in that score's ramp colour. */
function Meter({ score }: { score: number }) {
  const lit = RAMP[score]?.cell ?? "bg-score-3";
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-1.5 rounded-[1px] ${
            n <= score ? `${lit} h-7` : "bg-hair h-4"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * A single score card for a scored dimension: a HUD readout.
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
  const ramp = RAMP[score] ?? RAMP[3];

  return (
    <div
      id={`${id}-result`}
      className="frame relative flex flex-col gap-5 p-5 bg-panel/50 border border-hair"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-text-dim pt-1">
          {label}
        </h3>
        <Meter score={score} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          id={`${id}-score`}
          className={`font-extrabold text-6xl leading-none num-glow ${ramp.num}`}
        >
          {score}
          <span className="font-mono text-base text-text-faint font-normal ml-1 [text-shadow:none]">
            /5
          </span>
        </span>
      </div>

      <p
        id={`${id}-reasoning`}
        className="text-sm text-text-dim leading-relaxed border-t border-hair pt-4"
      >
        {reasoning}
      </p>
    </div>
  );
}

/**
 * The distinct null-Faithfulness card.
 *
 * Deliberately OFF the ramp: neutral grey, no glow, an unlit dashed meter and
 * an "N/A" readout, so it can never be mistaken for a dim low score.
 */
function FaithfulnessNullCard({ reasoning }: { reasoning: string }) {
  return (
    <div
      id="faithfulness-result"
      className="frame relative flex flex-col gap-5 p-5 bg-panel/30 border border-dashed border-hair-bright"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-text-faint pt-1">
          Faithfulness
        </h3>
        <div className="flex items-end gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className="w-1.5 h-4 rounded-[1px] border border-dashed border-text-faint/50"
            />
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          id="faithfulness-score"
          className="font-extrabold text-5xl leading-none text-text-faint/50"
        >
          N/A
        </span>
      </div>

      <p
        id="faithfulness-reasoning"
        className="text-sm italic text-text-faint leading-relaxed border-t border-hair pt-4"
      >
        {reasoning || "Not scored (no source provided)"}
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
    <section className="flex flex-col gap-5 rise">
      <div className="flex items-center justify-between gap-3 border-t border-hair pt-4">
        <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-ember">
          // Evaluation
        </h2>
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-faint">
          04 dimensions &middot; scale 1&ndash;5
        </span>
      </div>
      <div id="results-display" className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    </section>
  );
}
