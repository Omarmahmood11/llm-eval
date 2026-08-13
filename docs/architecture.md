# architecture.md

System shape. Read `context.md` and `rubric.md` first.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) | API routes are built in, so the key-holding endpoint is a file in the project rather than a separately configured function |
| Hosting | Vercel | Free tier, native Next.js support |
| Judge model | Gemini Flash via Google AI Studio API | Free tier with no expiry, 1M TPM, sufficient reasoning for rubric application |
| Calibration | Python, standalone in `/scripts` | Statistics work belongs in pandas/scikit-learn, not JS |
| Database | None | Nothing persists server-side. See below. |

There is no database and no auth. Both are deliberate exclusions, see `context.md`.

---

## Two separate systems

This project has a runtime app and an offline calibration harness. They share the rubric and the judge prompt, and nothing else. Keeping them separate is the main structural decision here.

```
┌─────────────────────────────────┐
│  RUNTIME (Next.js on Vercel)    │
│                                 │
│  Evaluator page                 │
│      ↓                          │
│  /api/evaluate  ← holds API key │
│      ↓                          │
│  Gemini Flash                   │
│      ↓                          │
│  Results display                │
└─────────────────────────────────┘
                 ▲
                 │ shared: rubric + judge prompt
                 ▼
┌─────────────────────────────────┐
│  CALIBRATION (Python, local)    │
│                                 │
│  goldenSet.json                 │
│      ↓                          │
│  calibrate.py → Gemini Flash    │
│      ↓                          │
│  metrics computed               │
│      ↓                          │
│  calibrationResults.json        │
└─────────────────────────────────┘
                 │
                 ▼
     Findings page reads the JSON
     and renders it. Static.
```

---

## Runtime: the evaluator

**Inputs**

| Field | Required | Notes |
|---|---|---|
| The original request | Yes | Relevance is unscoreable without it |
| The output being evaluated | Yes | |
| Source context | No | When absent, Faithfulness returns N/A rather than a guessed score |

**Flow**

1. User fills the form, submits
2. Client posts to `/api/evaluate`
3. Route builds the judge prompt: rubric + inputs
4. Route calls Gemini with a structured response schema
5. Route parses and returns scores plus per-dimension reasoning
6. Client renders four dimension cards, each with score and justification

**The API key lives only in the route.** Vercel environment variable, never exposed to the client, never in the repo. This is the single most important constraint in the build.

---

## Structured output, not free text

The judge must return parseable JSON, enforced by Gemini's response schema rather than by asking politely in the prompt. Free-text parsing is the most common source of silent breakage in this kind of tool.

Expected shape:

```json
{
  "relevance":     { "score": 4, "reasoning": "..." },
  "userAlignment": { "score": 3, "reasoning": "..." },
  "faithfulness":  { "score": null, "reasoning": "No source context provided." },
  "safety":        { "score": 5, "reasoning": "..." }
}
```

`faithfulness.score` is null when no source context was supplied. The UI must handle null as a distinct state, not render it as zero.

---

## The judge prompt is a versioned artifact

Stored as its own file, not inlined in the API route. It changes repeatedly during calibration, and every change invalidates prior results.

**Every calibration run stamps the prompt version into its output.** Without this, you end up with agreement numbers you cannot attribute to a specific prompt, and the findings become unusable.

---

## Calibration harness

Standalone Python. Never imported by the app, never deployed.

**Reads:** `goldenSet.json` — examples with human scores and written reasoning

**Does:** sends each example to the judge, collects scores, compares against human scores

**Computes, per dimension:**

| Dimension | Metrics |
|---|---|
| Relevance | Raw agreement, exact-match agreement, Cohen's kappa |
| User Alignment | Raw agreement, exact-match agreement, Cohen's kappa |
| Faithfulness | Raw agreement, exact-match agreement, Cohen's kappa (examples with source context only) |
| Safety | Recall, false positive rate, severity agreement on caught cases. **No kappa.** |

**Writes:** `calibrationResults.json`, stamped with judge prompt version, model name, and run date.

**Must throttle.** Free tier allows roughly 10 to 15 requests per minute. A 20-example run needs a delay between calls or it will fail partway through.

---

## Findings page

Static page reading `calibrationResults.json` at build time. Renders agreement per dimension, notable divergences, Safety recall.

It reports results. It does not run calibration. No live computation, no user input.

This is a later phase and not part of the core evaluator.

---

## Data handling

Nothing is stored. Evaluations run and results render in the browser; no database, no logging of submissions.

**Required user-facing notice:** outputs are processed via the Gemini free tier, which may use submitted data to improve models. Users must be told not to paste confidential content. This is a real constraint of the chosen infrastructure, not boilerplate.

---

## Known constraints

| Constraint | Consequence |
|---|---|
| Free tier rate limits (~10-15 RPM) | Calibration script must throttle. Runtime is fine for single evaluations. |
| Free tier trains on submitted data | Visible notice required. Rules out confidential input. |
| Enabling billing kills the free tier on that project | If billing is ever added, use a separate Google Cloud project. |
| Judge output can fail schema validation | Route needs a clear error state, not a crash. Retry once, then surface the failure. |

---

## Explicitly not in the architecture

No database, no user accounts, no server-side session storage, no stored evaluation history, no multi-model routing, no queue or background jobs. If a phase seems to need one of these, the phase is wrong.
