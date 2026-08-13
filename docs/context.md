# context.md

Read this first, before any other file in `/docs`.

---

## What this is

A web tool that evaluates the quality of LLM outputs. A user pastes in one or more model outputs, the tool scores them against a fixed 4-dimension rubric using an LLM as the judge, and returns per-dimension scores plus an overall pass/fail read.

It is not a chatbot, not a prompt playground, and not a model-comparison leaderboard. It does one thing: takes output, returns a quality score with reasoning.

## Who it's for

A PM or ML engineer at a company shipping an LLM-powered feature, who needs to check output quality before a release decision. Single user type. No consumer-facing use case, no multi-tenant needs.

## Why it exists

Teams measure LLM features in engineering terms: latency, token cost, uptime, whether a response comes back at all. None of that tells you if the output was actually good. A model can pass every technical check and still return answers that are vague, off-target, or untrustworthy.

The gap isn't engineering capability, it's translation. Nobody has defined what "good" means from the user's side and turned it into something measurable. Output quality then degrades silently after a model update or prompt change, and the first signal the team gets is user complaints.

This tool makes that degradation visible before shipping instead of after.

Full framing lives in `problemStatement.md`.

## The rubric

Four dimensions, defined in detail in `rubric.md`:

1. **Faithfulness** — is the output accurate and grounded, or does it invent things
2. **Relevance** — does it address what was actually asked
3. **Safety** — does it avoid harmful, inappropriate, or policy-violating content
4. **User Alignment** — is the tone, depth, and format right for the person receiving it

Scoring uses an LLM-as-judge approach. The judge's scores are validated against a hand-built golden set (`goldenSet.md`), with an 85% agreement threshold as the bar for the judge being trustworthy.

## Key decisions already made

| Decision | Reasoning |
|---|---|
| LLM-as-judge over rule-based scoring | Rule-based checks can't assess relevance or tone. Tradeoffs and failure modes documented in `decisions.md`. |
| Golden set is hand-built and small | 15 to 20 well-reasoned examples beat 50 arbitrary ones. Defensibility matters more than volume here. |
| No auth, no accounts, no payments | Nobody needs to log in to use this. Removing them cuts the majority of build complexity for zero loss in value. |
| Single-page tool, not a dashboard | Scope discipline. One input, one scoring run, one results view. |

## Explicitly out of scope

Do not build these, do not suggest them, do not scaffold for them later:

- User accounts, login, or auth of any kind
- Payments or billing
- Team or multi-user features
- Storing user submissions long-term
- Fine-tuning, training, or model hosting
- Support for evaluating anything other than text output

If a feature isn't in `implementationPlan.md`, it doesn't get built in this session.

## Constraints worth knowing

- **The owner can read code but does not write it naturally.** Explain non-obvious choices in plain language. When something is ambiguous, ask rather than assume. Flag uncertainty explicitly instead of producing confident broken code.
- **Judge logic is the "almost right means totally broken" part of this build.** Write the eval before implementing anything that touches scoring.
- **Credibility is the point.** A technical person will poke at this. Scoring that looks plausible but isn't defensible is worse than no tool at all.
- **This is a portfolio piece.** It needs to work reliably on realistic input and be deployable. It does not need production hardening, monitoring, or scale.

## How to work on this

Phase by phase, per `implementationPlan.md`. Fresh session per phase. Read `context.md`, `conventions.md`, and `decisions.md` at the start of every session, plus only the current phase of the plan. Do not read ahead to future phases.

Conventions are mirrored into `AGENTS.md` at project root.
