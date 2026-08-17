import fs from "fs";
import path from "path";
import Link from "next/link";

function readJsonFile(filename: string) {
  const filePath = path.join(process.cwd(), "docs", filename);
  const fileContents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContents);
}

// The build-and-calibrate loop, described as a product process rather than a
// forensic case study. Numbers 03 → 05 iterate until agreement holds.
const LOOP = [
  { n: "01", label: "Define the rubric", sub: "Four dimensions, scored 1–5" },
  { n: "02", label: "Hand-score a set", sub: "20 real examples, scored by a human" },
  { n: "03", label: "Run the judge", sub: "Same examples, scored by the model" },
  { n: "04", label: "Measure agreement", sub: "Raw %, exact match, Cohen's κ" },
  { n: "05", label: "Refine", sub: "Inspect gaps, revise the rubric, re-run" },
];

export default function FindingsPage() {
  const v2 = readJsonFile("calibrationResults_v0.2.0.json");
  const v3 = readJsonFile("calibrationResults_v0.3.0.json");

  const v3Meta = v3.meta;

  // A single de-identified illustration of the loop closing a blind spot.
  // Pulled from real calibration data; the internal example id is not shown.
  const before = v2.disagreements.find(
    (d: any) => d.id === "gs-01" && d.dimension === "faithfulness"
  );
  const after = v3.disagreements.find(
    (d: any) => d.id === "gs-01" && d.dimension === "faithfulness"
  );

  return (
    <div className="flex flex-col flex-1">
      {/* Console bar */}
      <header className="border-b border-hair sticky top-0 z-20 bg-void/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-4xl px-5 md:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-signal pulse" aria-hidden="true" />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-text-dim">
              LLM Output Evaluator
            </span>
          </div>
          <Link
            href="/"
            className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ember hover:text-ember-bright transition-colors"
          >
            &#8598;&nbsp;Evaluator
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 md:px-6 py-12 md:py-16 flex flex-col gap-14 rise">

        {/* Header */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-text-faint">
              Methodology
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              How the judge was calibrated
            </h1>
            <p className="max-w-2xl text-base text-text-dim leading-relaxed">
              An LLM scoring another LLM is only worth anything if its scores
              line up with a human&apos;s. So the judge isn&apos;t shipped on
              trust. It&apos;s measured against a hand-scored reference set,
              corrected where it drifts, and measured again. This is that build.
            </p>
          </div>

          {/* Run header */}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-hair pt-4 font-mono text-[0.68rem] uppercase tracking-[0.16em]">
            <div className="flex gap-2">
              <dt className="text-text-faint">Rubric</dt>
              <dd className="text-signal">v{v3Meta.judgePromptVersion}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-faint">Judge</dt>
              <dd className="text-text-dim">{v3Meta.model}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-faint">Reference set</dt>
              <dd className="text-text-dim">{v3Meta.totalExamples} examples</dd>
            </div>
          </dl>
        </section>

        {/* The calibration loop: the product process */}
        <section className="flex flex-col gap-5">
          <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-ember border-t border-hair pt-4">
            // The calibration loop
          </h2>
          <ol className="flex flex-col md:flex-row md:items-stretch gap-3">
            {LOOP.map((step) => (
              <li
                key={step.n}
                className="frame relative flex-1 flex flex-col gap-2 border border-hair bg-panel/40 p-4"
              >
                <span className="font-mono text-sm text-signal">{step.n}</span>
                <span className="text-sm font-medium text-text leading-snug">
                  {step.label}
                </span>
                <span className="text-xs text-text-faint leading-relaxed">
                  {step.sub}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-3 border-t border-dashed border-ember/40 pt-3">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ember">
              &#8635;&nbsp;Repeat 03&ndash;05
            </span>
            <span className="text-sm text-text-dim leading-relaxed">
              until the judge and the human agree closely enough to trust the
              scores.
            </span>
          </div>
          <p className="max-w-2xl text-sm text-text-dim leading-relaxed">
            The reference set is deliberately small and hand-reasoned rather than
            large and arbitrary: 20 well-argued examples are more defensible than
            50 quick ones. The loop is what turns &ldquo;an LLM&apos;s
            opinion&rdquo; into a measured, correctable instrument.
          </p>
        </section>

        {/* What the loop caught: de-identified illustration */}
        {before && after && (
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 border-t border-hair pt-4">
              <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-ember">
                // What the loop caught
              </h2>
              <p className="max-w-2xl text-sm text-text-dim leading-relaxed">
                Calibration isn&apos;t theatre. It changes the product. A blind
                spot the loop surfaced, and the rubric change that closed it:
              </p>
            </div>

            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
              {/* Before */}
              <div className="flex flex-col gap-3 border border-hair bg-panel/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-text-faint">
                    Before // rubric v{v2.meta.judgePromptVersion}
                  </span>
                  <span className="font-mono text-sm text-text-faint line-through decoration-text-faint/40">
                    {before.judgeScore}<span className="text-[0.65rem]">/5</span>
                  </span>
                </div>
                <p className="text-sm text-text-dim leading-relaxed">
                  The judge passed a customer-support reply as fully accurate. It
                  missed that the reply claimed an action the source never
                  supported: a refund it said it had already started. An
                  invented action, scored as truth.
                </p>
              </div>

              {/* Arrow */}
              <div
                className="hidden md:flex items-center justify-center text-ember font-mono"
                aria-hidden="true"
              >
                &rarr;
              </div>

              {/* After */}
              <div className="frame relative flex flex-col gap-3 border border-signal/30 bg-signal-soft p-4 border-l-2 border-l-signal">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-signal">
                    After // rubric v{v3Meta.judgePromptVersion}
                  </span>
                  <span className="font-mono text-sm font-bold text-signal">
                    {after.judgeScore}<span className="text-[0.65rem] opacity-70">/5</span>
                  </span>
                </div>
                <p className="text-sm text-text leading-relaxed">
                  A rule was added targeting unsupported claims of action. The
                  same reply now scores lower, and the judge&apos;s own reasoning
                  names the invented action instead of waving it through.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Did agreement improve? metrics comparison */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 border-t border-hair pt-4">
            <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-ember">
              // Did agreement improve?
            </h2>
            <p className="max-w-2xl text-sm text-text-dim leading-relaxed">
              Agreement with the human scores, per dimension, before and after
              the refinement.
            </p>
          </div>
          <div className="overflow-x-auto border border-hair">
            <table className="w-full text-left text-sm border-collapse font-mono tabular-nums">
              <thead>
                <tr className="text-[0.68rem] uppercase tracking-[0.12em] text-text-faint bg-panel/60">
                  <th className="p-3 font-normal text-left">Dimension</th>
                  <th className="p-3 font-normal text-left">Metric</th>
                  <th className="p-3 font-normal text-right">v0.2.0</th>
                  <th className="p-3 font-normal text-right">v0.3.0</th>
                  <th className="p-3 font-normal text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="text-text-dim">
                {/* Relevance */}
                <tr className="border-t border-hair">
                  <td className="p-3 font-sans font-semibold text-text align-top" rowSpan={3}>Relevance</td>
                  <td className="p-3">Raw Agreement</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.relevance.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.relevance.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.relevance.rawAgreement - v2.metrics.relevance.rawAgreement).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3">Exact Match</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.relevance.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.relevance.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.relevance.exactMatch - v2.metrics.relevance.exactMatch).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3">Cohen&apos;s Kappa</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.relevance.kappa.toFixed(3)}</td>
                  <td className="p-3 text-right text-text">{v3.metrics.relevance.kappa.toFixed(3)}</td>
                  <td className="p-3 text-right">{(v3.metrics.relevance.kappa - v2.metrics.relevance.kappa).toFixed(3)}</td>
                </tr>

                {/* User Alignment */}
                <tr className="border-t border-hair bg-panel/30">
                  <td className="p-3 font-sans font-semibold text-text align-top" rowSpan={3}>User Alignment</td>
                  <td className="p-3">Raw Agreement</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.userAlignment.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.userAlignment.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.userAlignment.rawAgreement - v2.metrics.userAlignment.rawAgreement).toFixed(1)}%</td>
                </tr>
                <tr className="bg-panel/30">
                  <td className="p-3">Exact Match</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.userAlignment.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.userAlignment.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.userAlignment.exactMatch - v2.metrics.userAlignment.exactMatch).toFixed(1)}%</td>
                </tr>
                <tr className="bg-panel/30">
                  <td className="p-3">Cohen&apos;s Kappa</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.userAlignment.kappa.toFixed(3)}</td>
                  <td className="p-3 text-right text-text">{v3.metrics.userAlignment.kappa.toFixed(3)}</td>
                  <td className="p-3 text-right">{(v3.metrics.userAlignment.kappa - v2.metrics.userAlignment.kappa).toFixed(3)}</td>
                </tr>

                {/* Faithfulness */}
                <tr className="border-t border-hair">
                  <td className="p-3 font-sans font-semibold text-text align-top" rowSpan={3}>Faithfulness</td>
                  <td className="p-3">Raw Agreement</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.faithfulness.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.faithfulness.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.faithfulness.rawAgreement - v2.metrics.faithfulness.rawAgreement).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3">Exact Match</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.faithfulness.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.faithfulness.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.faithfulness.exactMatch - v2.metrics.faithfulness.exactMatch).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3">Cohen&apos;s Kappa</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.faithfulness.kappa.toFixed(3)}</td>
                  <td className="p-3 text-right text-text">{v3.metrics.faithfulness.kappa.toFixed(3)}</td>
                  <td className="p-3 text-right">{(v3.metrics.faithfulness.kappa - v2.metrics.faithfulness.kappa).toFixed(3)}</td>
                </tr>

                {/* Safety */}
                <tr className="border-t border-hair bg-panel/30">
                  <td className="p-3 font-sans font-semibold text-text align-top" rowSpan={2}>Safety</td>
                  <td className="p-3">Recall</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.safety.recall.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.safety.recall.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.safety.recall - v2.metrics.safety.recall).toFixed(1)}%</td>
                </tr>
                <tr className="bg-panel/30">
                  <td className="p-3">False Positive Rate</td>
                  <td className="p-3 text-right text-text-faint">{v2.metrics.safety.falsePositiveRate.toFixed(1)}%</td>
                  <td className="p-3 text-right text-text">{v3.metrics.safety.falsePositiveRate.toFixed(1)}%</td>
                  <td className="p-3 text-right">{(v3.metrics.safety.falsePositiveRate - v2.metrics.safety.falsePositiveRate).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-text-faint leading-relaxed max-w-2xl">
            Read honestly: the sets differ slightly in size between runs
            ({v2.meta.totalEvaluated} vs {v3Meta.totalEvaluated} scored), so small
            deltas aren&apos;t directly comparable, and kappa swings under 0.1 are
            noise at this sample size. The point isn&apos;t a leaderboard number.
            It&apos;s that the judge is measured at all.
          </p>
        </section>

        {/* Known limits: product maturity, stated plainly */}
        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-caution border-t border-hair pt-4">
            // Known limits
          </h2>
          <ul className="flex flex-col gap-3 max-w-2xl text-sm text-text-dim leading-relaxed">
            <li className="flex gap-3">
              <span className="text-caution font-mono" aria-hidden="true">&rsaquo;</span>
              <span>
                Faithfulness only applies when source material is provided. With
                no source there is nothing to be faithful to, so the tool scores
                it <span className="font-mono text-text-faint">N/A</span> rather
                than guessing.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-caution font-mono" aria-hidden="true">&rsaquo;</span>
              <span>
                The judge can still let a safety concern bleed into the
                user-alignment score. A known dimension-leak, flagged for the
                next rubric revision.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-caution font-mono" aria-hidden="true">&rsaquo;</span>
              <span>
                Some human scores are wrong too. A few disagreements resolved in
                the judge&apos;s favour. Calibration is about finding who is
                right, not forcing the judge to match.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
