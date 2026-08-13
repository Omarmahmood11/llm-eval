# decisions.md

Every non-obvious choice and why. Prevents re-litigating settled questions, and doubles as interview prep.

---

## Why LLM-as-judge at all, rather than conventional methods

Conventional evaluation methods each need something this use case does not have:

| Method | Requires | Problem here |
|---|---|---|
| Keyword / regex | Nothing | Cannot assess meaning |
| BLEU / ROUGE | A correct reference answer per input | Nobody wrote correct answers for 500 real user interactions. Also penalises valid paraphrases. |
| Embedding similarity | A reference answer | Measures topical closeness, not quality |
| Trained classifier | Thousands of labeled examples | 20 available |
| Heuristics (length, readability) | Nothing | Measure form, not whether the answer was good |

**The deciding factor is reference-free evaluation.** LLM-as-judge is the only method that can score an output when no gold answer exists. That is the use case: a team ships an AI feature, gets 500 real interactions, and wants to know if the outputs were good. No reference answers, no labeled training set.

**Conceded openly:** Safety would be better served by a deterministic classifier for hard violations. Faithfulness with source context could use embedding-based grounding checks. The dimensions where nothing conventional works are Relevance and User Alignment, which require reading comprehension. See the Safety decision below.

## Why the judge has no authority, and where authority actually comes from

An LLM judging LLM output is circular on its face. The answer is that the judge is an instrument, not an expert.

The human defines what good means, writes the rubric, and hand-scores a golden set. The judge is then calibrated against those reference points, the way a thermometer is calibrated against ice water and boiling water. Once it reliably matches the human standard, it can be pointed at volumes the human will never read.

The judge is not deciding what quality means. It is applying a human definition consistently at scale. That is the entire value proposition and the only defensible framing.

## Why Gemini Flash

| Considered | Rejected because |
|---|---|
| Groq | Runs open-weight models only. Its advantage is speed, which is irrelevant for a judging task where being right matters and latency does not. Token caps also bite fast on token-heavy judge calls. |
| Claude / OpenAI | Paid from the first token. No free tier for sustained calibration runs. |
| Gemini Pro | Free tier limits are restrictive enough to hit immediately during calibration. |

**Gemini Flash:** free tier with no expiry and no card required, 1M TPM headroom, adequate reasoning for rubric application.

The judge is swappable. The rubric is the product. If the model is deprecated, the endpoint changes and the framework stands.

## Why Next.js over React + Vite

Vite would need a separately configured serverless function to hold the API key. Next.js has API routes built in, so the key-holding endpoint is a file in the project. Fewer moving parts for the same deployment. Also the most common React setup, so an agent generating it produces fewer subtly broken configurations.

## Why the golden set lives outside the app

Calibration is a workflow, not a feature. The golden set is reference data belonging to the project, not something a user brings. Putting calibration in the UI would imply users manage their own eval sets, which is a different and much larger product.

The statistics (kappa, recall, false positive rate) belong in Python. Keeping the golden set next to the analysis avoids data and analysis living in separate languages.

The demo value of showing agreement numbers is recovered by a static findings page reading the script's output.

## Why Relevance means task completion, not topical addressing

Original anchors let one case fit two scores: a well-written explanation of refund policy that never says whether *this* order qualifies. It addresses the topic and completes nothing. Two scorers would legitimately disagree, which is exactly what destroys agreement.

Relevance now scores completion only. Being on-topic earns nothing. The case above is unambiguously a 2.

Consequence: 3 became hard to reach, reserved for genuine partial delivery on multi-part requests. That is deliberate. The middle of a scale is where unsure scorers hide, and making it hard to reach forces a real decision.

Verbosity moved to User Alignment, since padding has nothing to do with whether the task was done.

## Why User Alignment scores severity, not count

Original anchors counted how many elements were off (tone, depth, format). That produced an inversion: a cheerful reply to someone reporting a serious problem is one element wrong, scoring 3, while a slightly formal, slightly long, slightly mis-formatted answer is three elements wrong, scoring 2. The scale ranked a trust failure above an annoyance.

Now anchored on effect on the recipient. Two failure modes are distinguished at the bottom: a 2 is a comprehension failure (unusable), a 1 is a trust failure (signals the system did not understand the situation).

**Accepted cost:** severity is a real judgment call and harder to score than counting. This dimension is expected to show the lowest agreement. That is a finding to document, not a defect to engineer away.

## Why Faithfulness separates contradiction from omission

Original anchors mixed two different failures. Unsupported means the source is silent. Contradicted means the source disagrees. Contradiction is worse at every level, but the original scale only mentioned it at score 1, leaving a mild contradiction with nowhere to go.

Two rules now resolve it: any contradiction caps the score at 2, and fabricating substantive content is a 1 regardless of what else was correct.

## Why Faithfulness returns null without source context

A judge cannot verify facts it has no source for. Scoring it anyway would produce a number with nothing behind it. Rather than pretend, source context is an optional third input, and Faithfulness is marked N/A when it is absent.

This changed the architecture (third input field, null handling in the UI) and is a good example of a rubric decision propagating downstream.

## Why Safety is validated differently from the other three

Almost every real output scores 5 on Safety. If the golden set reflects that distribution, human and judge both say 5 on nearly everything and produce a high agreement number having tested nothing. Cohen's kappa fails for the same reason, and so does raw agreement.

Two changes: the Safety sample is deliberately stratified, with roughly half containing real issues. And the metric changes from score-match to detection — recall, false positive rate, and severity agreement on caught cases.

Recall is primary. A judge that catches every unsafe output but scores severity loosely is useful. One that agrees on severity but misses half the problems is not.

**Finding:** Safety is a detection problem and the other three are calibration problems. Treating them identically would have been the error.

## Why Safety still uses the LLM judge in v1

A deterministic classifier or pattern list is more reliable for hard violations: faster, auditable, and consistent between runs. It is the better method.

It stays on the judge for v1 build simplicity, and is the first candidate for replacement in v2. Documented rather than hidden.

## Why no pre-committed agreement threshold

An 85% target was considered and dropped. It is arbitrary, loosely borrowed from inter-annotator agreement research where roughly 80% is treated as acceptable human-to-human consistency.

Committing to a number in advance invites optimising toward it rather than learning from the result. The bar is set after the first calibration run, per dimension, with documented reasoning.

Related decisions: agreement is measured per dimension rather than blended, since a single number hides everything. Scores within 1 point count as agreement, with exact-match reported separately — the gap between the two is itself informative.

## Why the judge prompt is versioned and stamped into results

The prompt changes repeatedly during calibration, and every change invalidates prior results. Without a version stamp, agreement numbers cannot be attributed to a specific prompt and become unusable within a few runs.

## Why calibration is Phase 5, not late in the build

Conventional order would polish the UI before writing an offline analysis script. Calibration is moved ahead of all cosmetic work because it is the only phase that can reveal the premise is wrong. If agreement is poor, the rubric changes, and anything built on the old rubric may be discarded.

## Why no auth, database, or stored submissions

| Excluded | Reason |
|---|---|
| Auth | A whole subsystem, and it puts a signup wall in front of a tool meant to be tried in five seconds |
| Payments | Not being sold |
| Multi-user | The use case involves one person checking output before a release |
| Stored submissions | Real liability. A solo project holding other companies' possibly sensitive output, with no privacy policy or security review. |
| Fine-tuning | Needs far more than 20 examples, costs money, and hides the actual work. Calibration should happen through rubric clarity and prompt design, which is the transferable part. |
| Non-text output | The four dimensions do not transfer to images or audio. Different problem. |

Phrased as prohibitions rather than omissions because coding agents pattern-match to "typical web app" and will scaffold auth unprompted.

## Why reference examples stay in rubric.md

They exist for human scoring. Anchors written in prose stay ambiguous until seen applied, and inconsistent human scoring breaks calibration before the judge runs.

Whether they also go into the judge prompt is a separate open question, to be settled by testing both ways and comparing agreement. Risks if included: anchoring on surface similarity, and domain overfit, since most examples are drawn from customer support.

## Why the free-tier privacy notice is required

Google states free tier requests may be used to improve models. The intended user pastes their company's LLM outputs. Silently sending that to a training-eligible endpoint is a real problem, not a theoretical one.

A visible notice is the honest handling, and the constraint itself is worth documenting as a deployment tradeoff.

## Judge model: gemini-3.5-flash

`gemini-2.0-flash` was deprecated by August 2026 and returns 404. Free tier for
3.5-flash: 15 RPM, 1,500 RPD, 1M context window, no card required. Pro models
have moved behind billing, so Flash and Flash-Lite are the only viable free
options.

The model name is a single constant at the top of the route file, so swapping
it is trivial. The judge is swappable; the rubric is the product.