import Link from "next/link";
import EvalForm from "./EvalForm";

const DIMENSIONS = ["Relevance", "User Alignment", "Faithfulness", "Safety"];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Console bar */}
      <header className="border-b border-hair sticky top-0 z-20 bg-void/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl px-5 md:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-signal pulse" aria-hidden="true" />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-text-dim">
              LLM Output Evaluator
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-faint">
            <span className="hidden sm:inline">Rubric v0.3.0</span>
            <Link
              href="/findings"
              className="text-ember hover:text-ember-bright transition-colors"
            >
              Methodology&nbsp;&#8599;
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 md:px-6 py-12 md:py-16 flex flex-col gap-10 rise">
        {/* Intro */}
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              LLM Output Evaluator
            </h1>
            <p className="max-w-xl text-base text-text-dim leading-relaxed">
              Paste a model interaction. The judge scores its output across four
              quality dimensions and returns its reasoning for each score.
            </p>
          </div>

          {/* Dimension index */}
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-hair pt-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-text-faint">
            {DIMENSIONS.map((d, i) => (
              <li key={d} className="flex items-center gap-2">
                <span className="text-signal/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-text-dim">{d}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Advisory */}
        <aside className="frame relative bg-panel/50 border border-hair p-5 md:p-6 flex flex-col gap-3">
          <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ember">
            // Note
          </h2>
          <p className="text-sm text-text-dim leading-relaxed">
            Outputs are sent to a third-party model for scoring and may be used
            to improve it.{" "}
            <span className="text-text">
              Do not paste confidential, proprietary, or personal data.
            </span>
          </p>
        </aside>

        <EvalForm />
      </main>
    </div>
  );
}
