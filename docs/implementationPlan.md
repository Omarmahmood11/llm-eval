# implementationPlan.md

Phased build order. One phase per session, fresh context each time. Do not read ahead to future phases.

Read `context.md`, `conventions.md`, and `decisions.md` at the start of every session, plus only the current phase below.

---

## Ordering principle

Phases 0 through 4 answer *does the machine work*. Phase 5 answers *does the idea work*.

Phase 5 is the gate. If human-judge agreement comes out poor, the rubric changes, and any UI polish built before that point may be built on a broken premise. Nothing cosmetic happens until calibration has run at least once.

---

## Phase 0: Scaffold and deploy empty

**Build:** Next.js project (App Router), git initialised, `/docs` in place, `conventions.md` mirrored to `AGENTS.md`. Deploy the default page to Vercel. Add `GEMINI_API_KEY` as a Vercel environment variable.

**Done when:** a live Vercel URL loads. Nothing else works, and that is correct.

**Why first:** deployment config fails in boring ways. Finding out now costs an hour. Finding out at Phase 9 costs a day.

`git tag phase-0-complete`

---

## Phase 1: Input form, no scoring

**Build:** Three fields — original request (required), output to evaluate (required), source context (optional). Submit button. Submitting logs the payload to console and nothing more.

**Done when:**
- Both required fields empty, submit is blocked with a visible message
- Filling all three and submitting logs a correctly shaped object
- Optional field left blank produces `sourceContext: null`, not `""`

**Not in this phase:** styling beyond basic layout, API calls, results display.

`git tag phase-1-complete`

---

## Phase 2: API route and Gemini connectivity

**Build:** `/api/evaluate` route. Reads `GEMINI_API_KEY` from environment. Sends a trivial hardcoded prompt to Gemini Flash, returns the raw response. Form calls the route and logs what comes back.

**Done when:**
- A real Gemini response reaches the browser
- The API key appears nowhere in client-side code or network payloads (check dev tools)
- Missing or invalid key produces a clear error, not a crash

**This phase isolates the riskiest infrastructure.** Key handling and connectivity are debugged here with nothing else in the way.

`git tag phase-2-complete`

---

## Phase 3: One dimension, end to end

**Build:** Judge prompt as a separate versioned file. Rubric section for Relevance only. Structured response schema enforcing `{ score, reasoning }`. Route returns a parsed Relevance score. UI displays it.

**Done when:**
- The five reference examples from `rubric.md` score approximately as documented
- The score-2 example (on-topic non-answer) does not score 3 or above
- Response always parses; malformed output retries once then surfaces a clear error
- Reasoning is returned, not just a number

**Relevance first because** its reference examples are the most thoroughly worked out, so failures point at the prompt rather than at rubric ambiguity.

`git tag phase-3-complete`

---

## Phase 4: All four dimensions

**Build:** Full rubric into the judge prompt. Schema extended to four dimensions. UI renders four cards.

**Done when:**
- All four return a score and reasoning
- Faithfulness returns `null` when source context is absent, and the UI shows a distinct "not scored" state rather than 0 or a blank
- Safety scores 5 on clean output
- Response time is acceptable for a single evaluation

**Watch for:** the prompt getting long enough that the judge starts dropping dimensions or blending criteria across them. If that happens, note it in `findings.md` — it is a real constraint, not just a bug.

`git tag phase-4-complete`

---

## Phase 5: Calibration harness — THE GATE

**Prerequisite, not a build task:** `goldenSet.json` must exist with human scores and written reasoning. Three dimensions use naturally varied examples. Safety uses a deliberately stratified sample with roughly half containing real issues.

**Build:** `/scripts/calibrate.py`, standalone, never imported by the app.

- Reads `goldenSet.json`
- Sends each example to the judge, throttled to stay under ~10 requests/minute
- Computes per dimension: raw agreement, exact-match agreement, Cohen's kappa
- Computes for Safety instead: recall, false positive rate, severity agreement on caught cases
- Writes `calibrationResults.json` stamped with judge prompt version, model name, run date

**Done when:** a full run completes without rate-limit failure and produces stamped output.

**This is where the project actually gets tested.** Expect the first run to disappoint. That is the point of running it.

`git tag phase-5-complete`

---

## Phase 6: Rubric iteration — a loop, not a build

Not a coding phase. Read the disagreements individually.

- Diverged by 3+ points on a dimension → rubric problem, not a model problem. Rewrite the anchor.
- Consistently generous or harsh in one direction → prompt problem. Adjust wording.
- Low agreement on User Alignment specifically → expected. Document rather than force.

After each rubric or prompt change, bump the prompt version and re-run Phase 5. Log every run in `findings.md` with what changed and what moved.

**Exit when** agreement is defensible and you can explain each dimension's number. Not when it hits a target — no target was set, deliberately.

---

## Phase 7: Results UI and error states

**Build:** Proper results display. Score, reasoning, visual weight per dimension. Handle: null Faithfulness, API failure, schema validation failure, rate limit hit, empty response.

**Done when:** every error path in `edgecases.md` shows something useful rather than a blank screen or a crash.

**Only now** is polish worth doing, because the rubric behind it has been validated.

`git tag phase-7-complete`

---

## Phase 8: Findings page

**Build:** Static page reading `calibrationResults.json` at build time. Agreement per dimension, notable divergences, Safety recall, prompt version and run date visible.

Reports results. Does not run calibration. No user input.

**Done when:** a visitor can see how the judge was validated without being told.

`git tag phase-8-complete`

---

## Phase 9: Ship

**Build:** Privacy notice stating outputs are processed via the Gemini free tier and confidential content should not be pasted. Basic responsive layout. README for future-you.

**Done when:** full happy path works on the live URL, three edge cases from `edgecases.md` verified manually, notice visible before first use.

`git tag phase-9-complete`

---

## Parked

Not in this plan. Do not build, do not scaffold for.

| Idea | When |
|---|---|
| Second judge model for cross-model agreement | After Phase 9, if the build went well |
| Deterministic classifier for Safety | v2 |
| Session-only run history and comparison view | Only if a clear use case appears |
| Batch evaluation | Not in v1 |
