"""
Calibration harness for the LLM evaluation judge.

Reads goldenSet.json, sends each example to the Gemini judge, computes
agreement metrics, and writes calibrationResults.json.

Resumable: writes partial results to a checkpoint file after every
successful evaluation, so a crash does not mean starting over.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Configuration
GOLDEN_SET_PATH = "docs/goldenSet.json"
RESULTS_PATH_TEMPLATE = "docs/calibrationResults_v{version}.json"
RESULTS_PATH_LATEST = "docs/calibrationResults.json"
CHECKPOINT_PATH = "scripts/.calibration_checkpoint.json"
PROMPT_TS_PATH = "app/judgePrompt.ts"
MODEL = "gemini-3.5-flash"

# Free-tier constraint is tokens-per-minute, not just requests-per-minute.
# Each judge call carries the full four-dimension rubric (~2k tokens of
# system instruction alone), so 15 RPM at ~3-4k tokens per call risks
# hitting the TPM wall. A 7-second fixed delay is more reliable than
# retrying into the same limit.
DELAY_BETWEEN_REQUESTS = 15.0

# Retries on transient errors (429, 503, etc.)
MAX_RETRIES = 5
RETRY_BASE_WAIT = 60.0  # seconds; generous because the limit is TPM


def extract_prompt_info():
    """Parse the judge prompt version and system instructions from the TS file."""
    with open(PROMPT_TS_PATH, "r") as f:
        content = f.read()

    version_match = re.search(
        r'export const JUDGE_PROMPT_VERSION = "([^"]+)";', content
    )
    # Match the template literal, handling escaped backticks
    system_match = re.search(
        r"const SYSTEM_INSTRUCTIONS = `(.*?)`;", content, re.DOTALL
    )

    if not version_match or not system_match:
        raise ValueError(
            "Could not parse judgePrompt.ts for version or system instructions."
        )

    return version_match.group(1), system_match.group(1)


def build_judge_prompt(original_request, output_to_evaluate, source_context):
    """Build the user-content portion of the judge prompt."""
    prompt = (
        f"<ORIGINAL_REQUEST>\n{original_request}\n</ORIGINAL_REQUEST>\n\n"
        f"<OUTPUT_TO_EVALUATE>\n{output_to_evaluate}\n</OUTPUT_TO_EVALUATE>"
    )
    if source_context:
        prompt += (
            f"\n\n<SOURCE_CONTEXT>\n{source_context}\n</SOURCE_CONTEXT>"
        )
    return prompt


def _build_payload(system_instruction, prompt_text):
    """Build the Gemini API request payload."""
    return {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "relevance": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "INTEGER"},
                            "reasoning": {"type": "STRING"},
                        },
                        "required": ["score", "reasoning"],
                    },
                    "userAlignment": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "INTEGER"},
                            "reasoning": {"type": "STRING"},
                        },
                        "required": ["score", "reasoning"],
                    },
                    "faithfulness": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "INTEGER", "nullable": True},
                            "reasoning": {"type": "STRING"},
                        },
                        "required": ["score", "reasoning"],
                    },
                    "safety": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "INTEGER"},
                            "reasoning": {"type": "STRING"},
                        },
                        "required": ["score", "reasoning"],
                    },
                },
                "required": [
                    "relevance",
                    "userAlignment",
                    "faithfulness",
                    "safety",
                ],
            },
        },
    }


def call_judge(api_key, system_instruction, prompt_text):
    """Send a single example to the Gemini judge. Returns parsed JSON.

    Retries on transient HTTP errors (429, 500, 503). Creates a fresh
    Request object on every attempt to avoid consumed-body issues.
    """
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{MODEL}:generateContent?key={api_key}"
    )
    payload = _build_payload(system_instruction, prompt_text)
    body = json.dumps(payload).encode("utf-8")

    for attempt in range(MAX_RETRIES):
        # Fresh Request each time — urllib can consume the body
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
                text = (
                    result.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                return json.loads(text)

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"  HTTP {e.code} on attempt {attempt + 1}/{MAX_RETRIES}")
            print(f"  Error body: {err_body}")

            if e.code == 429 or e.code >= 500:
                # Parse the suggested retry delay if the API provides one
                wait = RETRY_BASE_WAIT * (attempt + 1)
                try:
                    err_json = json.loads(err_body)
                    for detail in err_json.get("error", {}).get("details", []):
                        if "retryDelay" in detail:
                            suggested = float(
                                detail["retryDelay"].replace("s", "")
                            )
                            wait = max(wait, suggested + 5)
                except Exception:
                    pass

                print(f"  Waiting {wait:.0f}s before retry...")
                time.sleep(wait)
                continue

            # Non-retryable HTTP error
            raise RuntimeError(
                f"Gemini API returned HTTP {e.code}: {err_body[:300]}"
            )

        except json.JSONDecodeError as exc:
            print(f"  Malformed JSON on attempt {attempt + 1}: {exc}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BASE_WAIT)
                continue
            raise RuntimeError(
                "Failed to get valid JSON from judge after retries."
            )

    raise RuntimeError(
        f"Exhausted {MAX_RETRIES} retries on rate-limit / server errors."
    )


# ---------------------------------------------------------------------------
# Checkpoint helpers
# ---------------------------------------------------------------------------

def load_checkpoint():
    """Load previously completed results, if any."""
    if os.path.exists(CHECKPOINT_PATH):
        with open(CHECKPOINT_PATH, "r") as f:
            data = json.load(f)
        return data.get("completed", [])
    return []


def save_checkpoint(completed):
    """Persist completed results to the checkpoint file."""
    with open(CHECKPOINT_PATH, "w") as f:
        json.dump({"completed": completed}, f, indent=2)


def clear_checkpoint():
    """Remove the checkpoint file after a successful full run."""
    if os.path.exists(CHECKPOINT_PATH):
        os.remove(CHECKPOINT_PATH)


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def calculate_kappa(human_scores, judge_scores):
    """Cohen's kappa for two lists of integer scores."""
    if not human_scores:
        return 0.0
    n = len(human_scores)
    exact_matches = sum(1 for h, j in zip(human_scores, judge_scores) if h == j)
    p_o = exact_matches / n

    p_e = 0.0
    for k in range(1, 6):
        p_human = sum(1 for h in human_scores if h == k) / n
        p_judge = sum(1 for j in judge_scores if j == k) / n
        p_e += p_human * p_judge

    if p_e == 1.0:
        return 1.0
    return (p_o - p_e) / (1.0 - p_e)


def evaluate_dimension(human_scores, judge_scores):
    """Raw agreement (within-1), exact match, and kappa for a dimension."""
    n = len(human_scores)
    if n == 0:
        return {"rawAgreement": 0, "exactMatch": 0, "kappa": 0, "n": 0}

    exact = sum(1 for h, j in zip(human_scores, judge_scores) if h == j)
    within_one = sum(
        1 for h, j in zip(human_scores, judge_scores) if abs(h - j) <= 1
    )

    return {
        "rawAgreement": round((within_one / n) * 100, 1),
        "exactMatch": round((exact / n) * 100, 1),
        "kappa": round(calculate_kappa(human_scores, judge_scores), 3),
        "n": n,
    }


def compute_safety_metrics(results):
    """Detection-oriented metrics for Safety: recall, FPR, severity agreement."""
    h_safe = []
    j_safe = []
    for r in results:
        h = r["humanScores"].get("safety")
        j = r["judgeScores"].get("safety")
        if h is not None and j is not None:
            h_safe.append(h)
            j_safe.append(j)

    true_pos = sum(1 for h, j in zip(h_safe, j_safe) if h < 5 and j < 5)
    false_neg = sum(1 for h, j in zip(h_safe, j_safe) if h < 5 and j == 5)
    false_pos = sum(1 for h, j in zip(h_safe, j_safe) if h == 5 and j < 5)
    true_neg = sum(1 for h, j in zip(h_safe, j_safe) if h == 5 and j == 5)

    recall = (
        (true_pos / (true_pos + false_neg)) * 100
        if (true_pos + false_neg) > 0
        else 0
    )
    fpr = (
        (false_pos / (false_pos + true_neg)) * 100
        if (false_pos + true_neg) > 0
        else 0
    )

    # Severity agreement on caught cases (true positives)
    caught_h = [h for h, j in zip(h_safe, j_safe) if h < 5 and j < 5]
    caught_j = [j for h, j in zip(h_safe, j_safe) if h < 5 and j < 5]

    if caught_h:
        sev_exact = sum(1 for h, j in zip(caught_h, caught_j) if h == j)
        sev_within_one = sum(
            1 for h, j in zip(caught_h, caught_j) if abs(h - j) <= 1
        )
        severity_agreement = {
            "exactMatch": round((sev_exact / len(caught_h)) * 100, 1),
            "withinOne": round((sev_within_one / len(caught_h)) * 100, 1),
        }
    else:
        severity_agreement = {"exactMatch": 0, "withinOne": 0}

    return {
        "recall": round(recall, 1),
        "falsePositiveRate": round(fpr, 1),
        "truePositives": true_pos,
        "falseNegatives": false_neg,
        "falsePositives": false_pos,
        "trueNegatives": true_neg,
        "severityAgreement": severity_agreement,
        "n": len(h_safe),
    }


def collect_disagreements(results):
    """Find every (example, dimension) pair where human and judge scores differ."""
    disagreements = []
    for r in results:
        for dim in ["relevance", "userAlignment", "faithfulness", "safety"]:
            h_score = r["humanScores"].get(dim)
            j_score = r["judgeScores"].get(dim)
            if h_score is not None and j_score is not None and h_score != j_score:
                disagreements.append(
                    {
                        "id": r["id"],
                        "dimension": dim,
                        "humanScore": h_score,
                        "judgeScore": j_score,
                        "delta": j_score - h_score,
                        "humanReasoning": r["humanReasoning"].get(dim, ""),
                        "judgeReasoning": r["judgeReasoning"].get(dim, ""),
                    }
                )
    return disagreements


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable not set.")
        sys.exit(1)

    print("Extracting judge prompt...")
    prompt_version, system_instruction = extract_prompt_info()
    print(f"Judge prompt version: {prompt_version}")
    print(f"Model: {MODEL}")

    with open(GOLDEN_SET_PATH, "r") as f:
        golden_set = json.load(f)

    examples = golden_set["examples"]
    total = len(examples)
    print(f"Golden set: {total} examples")

    # Load checkpoint (previously completed results)
    completed = load_checkpoint()
    completed_ids = {r["id"] for r in completed}
    if completed_ids:
        print(f"Resuming: {len(completed_ids)} already done, "
              f"{total - len(completed_ids)} remaining")

    # Evaluate each example
    for i, example in enumerate(examples):
        eid = example["id"]

        if eid in completed_ids:
            print(f"  [{i + 1}/{total}] {eid} — cached, skipping")
            continue

        print(f"  [{i + 1}/{total}] {eid} — evaluating...", end="", flush=True)

        prompt_text = build_judge_prompt(
            example["request"],
            example["output"],
            example.get("sourceContext"),
        )

        try:
            judge_res = call_judge(api_key, system_instruction, prompt_text)
        except Exception as e:
            print(f" FAILED: {e}")
            print("Partial results have been saved. Re-run to resume.")
            save_checkpoint(completed)
            sys.exit(1)

        result = {
            "id": eid,
            "humanScores": example["humanScores"],
            "humanReasoning": example["humanReasoning"],
            "judgeScores": {
                "relevance": judge_res["relevance"]["score"],
                "userAlignment": judge_res["userAlignment"]["score"],
                "faithfulness": judge_res.get("faithfulness", {}).get("score"),
                "safety": judge_res["safety"]["score"],
            },
            "judgeReasoning": {
                "relevance": judge_res["relevance"]["reasoning"],
                "userAlignment": judge_res["userAlignment"]["reasoning"],
                "faithfulness": judge_res.get("faithfulness", {}).get(
                    "reasoning"
                ),
                "safety": judge_res["safety"]["reasoning"],
            },
        }

        completed.append(result)
        completed_ids.add(eid)
        save_checkpoint(completed)
        print(" done")

        # Throttle — wait before the next request, not after the last one
        remaining = total - len(completed_ids)
        if remaining > 0:
            print(f"       waiting {DELAY_BETWEEN_REQUESTS:.0f}s "
                  f"({remaining} remaining)...")
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # -----------------------------------------------------------------------
    # All examples evaluated — compute metrics
    # -----------------------------------------------------------------------
    print(f"\nAll {total} examples evaluated. Computing metrics...")

    metrics = {}
    for dim in ["relevance", "userAlignment", "faithfulness"]:
        h_scores = []
        j_scores = []
        for r in completed:
            h = r["humanScores"].get(dim)
            j = r["judgeScores"].get(dim)
            if h is not None and j is not None:
                h_scores.append(h)
                j_scores.append(j)
        metrics[dim] = evaluate_dimension(h_scores, j_scores)

    metrics["safety"] = compute_safety_metrics(completed)

    disagreements = collect_disagreements(completed)

    final_output = {
        "meta": {
            "judgePromptVersion": prompt_version,
            "model": MODEL,
            "runDate": datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "totalExamples": total,
            "totalEvaluated": len(completed),
        },
        "metrics": metrics,
        "disagreements": disagreements,
    }

    versioned_path = RESULTS_PATH_TEMPLATE.format(version=prompt_version)
    with open(versioned_path, "w") as f:
        json.dump(final_output, f, indent=2)

    # Also overwrite the latest results file (used by the findings page)
    with open(RESULTS_PATH_LATEST, "w") as f:
        json.dump(final_output, f, indent=2)

    # Clean up checkpoint after successful full run
    clear_checkpoint()

    # -----------------------------------------------------------------------
    # Print full report
    # -----------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("CALIBRATION RESULTS")
    print("=" * 70)
    print(f"Prompt version : {prompt_version}")
    print(f"Model          : {MODEL}")
    print(f"Examples       : {len(completed)}")
    print(f"Disagreements  : {len(disagreements)}")

    print("\n--- Per-dimension metrics ---")
    for dim in ["relevance", "userAlignment", "faithfulness"]:
        m = metrics[dim]
        print(
            f"  {dim:20s}  "
            f"agreement={m['rawAgreement']:5.1f}%  "
            f"exact={m['exactMatch']:5.1f}%  "
            f"kappa={m['kappa']:+.3f}  "
            f"n={m['n']}"
        )

    sm = metrics["safety"]
    print(
        f"  {'safety':20s}  "
        f"recall={sm['recall']:5.1f}%  "
        f"FPR={sm['falsePositiveRate']:5.1f}%  "
        f"sev_exact={sm['severityAgreement']['exactMatch']:5.1f}%  "
        f"sev_w1={sm['severityAgreement']['withinOne']:5.1f}%  "
        f"n={sm['n']}"
    )
    print(
        f"         TP={sm['truePositives']} FN={sm['falseNegatives']} "
        f"FP={sm['falsePositives']} TN={sm['trueNegatives']}"
    )

    if disagreements:
        print("\n--- Every individual disagreement ---")
        for d in disagreements:
            direction = "↑" if d["delta"] > 0 else "↓"
            print(
                f"\n  [{d['id']}] {d['dimension'].upper()}  "
                f"Human={d['humanScore']}  Judge={d['judgeScore']}  "
                f"({direction}{abs(d['delta'])})"
            )
            print(f"    Human : {d['humanReasoning']}")
            print(f"    Judge : {d['judgeReasoning']}")
    else:
        print("\nNo disagreements — perfect agreement across all dimensions.")

    print(f"\nResults saved to {versioned_path}")
    print(f"Latest results also at {RESULTS_PATH_LATEST}")


if __name__ == "__main__":
    main()
