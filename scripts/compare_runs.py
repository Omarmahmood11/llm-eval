import json

def load_json(path):
    with open(path, "r") as f: return json.load(f)

v2 = load_json("docs/calibrationResults_v0.2.0.json")
v3 = load_json("docs/calibrationResults_v0.3.0.json")

print(f"| Dimension | v0.2.0 (n={v2['meta']['totalEvaluated']}) | v0.3.0 (n={v3['meta']['totalEvaluated']}) |")
print("|---|---|---|")

for dim in ["relevance", "userAlignment", "faithfulness"]:
    m2 = v2["metrics"][dim]
    m3 = v3["metrics"][dim]
    print(f"| {dim.capitalize()} | {m2['rawAgreement']:.0f}% within-1, {m2['exactMatch']:.0f}% exact | {m3['rawAgreement']:.0f}% within-1, {m3['exactMatch']:.0f}% exact |")

s2 = v2["metrics"]["safety"]
s3 = v3["metrics"]["safety"]
print(f"| Safety | {s2['recall']:.0f}% recall, {s2['falsePositiveRate']:.0f}% FPR | {s3['recall']:.0f}% recall, {s3['falsePositiveRate']:.0f}% FPR |")

print("\n### Remaining Disagreements (v0.3.0)")
for d in v3["disagreements"]:
    print(f"\n#### {d['id']} - {d['dimension'].capitalize()}")
    print(f"- **Human ({d['humanScore']})**: {d['humanReasoning']}")
    print(f"- **Judge ({d['judgeScore']})**: {d['judgeReasoning']}")

