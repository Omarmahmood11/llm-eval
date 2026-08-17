import fs from "fs";
import path from "path";

function readJsonFile(filename: string) {
  const filePath = path.join(process.cwd(), "docs", filename);
  const fileContents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContents);
}

export default function FindingsPage() {
  const v2 = readJsonFile("calibrationResults_v0.2.0.json");
  const v3 = readJsonFile("calibrationResults_v0.3.0.json");

  const v3Meta = v3.meta;

  return (
    <div className="flex flex-col flex-1 items-center px-6 py-12">
      <main className="w-full max-w-4xl flex flex-col gap-10">
        
        {/* Header Section */}
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold">Calibration Findings</h1>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-700 flex flex-col gap-2">
            <p><strong>Judge Prompt Version:</strong> {v3Meta.judgePromptVersion}</p>
            <p><strong>Model:</strong> {v3Meta.model}</p>
            <p><strong>Run Date:</strong> {new Date(v3Meta.runDate).toLocaleString()}</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900 flex flex-col gap-2">
            <p>
              <strong>Note:</strong> The run covered {v3Meta.totalEvaluated} of {v3Meta.totalExamples} examples because the daily free-tier quota was exhausted.
            </p>
            <p>
              <strong>Note:</strong> Faithfulness is scored on the 10 source-context examples only.
            </p>
          </div>
        </section>

        {/* Featured Disagreements Section */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold border-b pb-2">Notable Disagreements</h2>
          
          {/* gs-01 and gs-03 Faithfulness */}
          <div className="flex flex-col gap-4 border border-gray-200 rounded p-5 bg-white">
            <h3 className="text-lg font-medium">Faithfulness: gs-01 and gs-03</h3>
            <p className="text-sm text-gray-700 italic border-l-4 border-gray-300 pl-3">
              Context: In v0.2.0 the judge scored these 5, missing that the output claimed an action ("I've initiated it now") the source never supported. A rule was added to the Faithfulness rubric. In v0.3.0 the judge's reasoning names the invented action directly.
            </p>
            
            {["gs-01", "gs-03"].map((id) => {
              const d2 = v2.disagreements.find((d: any) => d.id === id && d.dimension === "faithfulness");
              const d3 = v3.disagreements.find((d: any) => d.id === id && d.dimension === "faithfulness");
              
              if (!d2 || !d3) return null;
              
              return (
                <div key={id} className="mt-4 flex flex-col gap-2">
                  <h4 className="font-semibold text-gray-900">{id}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded text-sm">
                      <p className="font-semibold text-red-900 mb-1">v0.2.0 Judge Score: {d2.judgeScore}</p>
                      <p className="text-red-800">{d2.judgeReasoning}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <p className="font-semibold text-green-900 mb-1">v0.3.0 Judge Score: {d3.judgeScore}</p>
                      <p className="text-green-800">{d3.judgeReasoning}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* gs-17 User Alignment */}
          <div className="flex flex-col gap-4 border border-gray-200 rounded p-5 bg-white">
            <h3 className="text-lg font-medium">User Alignment: gs-17</h3>
            <p className="text-sm text-gray-700 italic border-l-4 border-gray-300 pl-3">
              Context: The judge's reasoning cites the response being dangerous, which is Safety reasoning inside a User Alignment score. Cross-dimension contamination, still open.
            </p>
            
            {(() => {
              const d3 = v3.disagreements.find((d: any) => d.id === "gs-17" && d.dimension === "userAlignment");
              if (!d3) return null;
              
              return (
                <div className="mt-2 flex flex-col gap-2 text-sm bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Human Score: {d3.humanScore}</p>
                      <p className="text-gray-700">{d3.humanReasoning}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Judge Score: {d3.judgeScore}</p>
                      <p className="text-gray-700">{d3.judgeReasoning}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* gs-11 Relevance */}
          <div className="flex flex-col gap-4 border border-gray-200 rounded p-5 bg-white">
            <h3 className="text-lg font-medium">Relevance: gs-11</h3>
            <p className="text-sm text-gray-700 italic border-l-4 border-gray-300 pl-3">
              Context: Human scored 5, judge 2. The judge was right; the output never answers the question. A human scoring error.
            </p>
            
            {(() => {
              const d3 = v3.disagreements.find((d: any) => d.id === "gs-11" && d.dimension === "relevance");
              if (!d3) return null;
              
              return (
                <div className="mt-2 flex flex-col gap-2 text-sm bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Human Score: {d3.humanScore}</p>
                      <p className="text-gray-700">{d3.humanReasoning}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Judge Score: {d3.judgeScore}</p>
                      <p className="text-gray-700">{d3.judgeReasoning}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
        </section>

        {/* Metrics Comparison Table */}
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold border-b pb-2">Metrics: v0.2.0 vs v0.3.0</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border">Dimension</th>
                  <th className="p-3 border">Metric</th>
                  <th className="p-3 border">v0.2.0</th>
                  <th className="p-3 border">v0.3.0</th>
                  <th className="p-3 border">Delta</th>
                </tr>
              </thead>
              <tbody>
                {/* Relevance */}
                <tr>
                  <td className="p-3 border font-semibold" rowSpan={3}>Relevance</td>
                  <td className="p-3 border">Raw Agreement</td>
                  <td className="p-3 border">{v2.metrics.relevance.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.relevance.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.relevance.rawAgreement - v2.metrics.relevance.rawAgreement).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3 border border-t-0">Exact Match</td>
                  <td className="p-3 border">{v2.metrics.relevance.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.relevance.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.relevance.exactMatch - v2.metrics.relevance.exactMatch).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3 border border-t-0">Cohen's Kappa</td>
                  <td className="p-3 border">{v2.metrics.relevance.kappa.toFixed(3)}</td>
                  <td className="p-3 border">{v3.metrics.relevance.kappa.toFixed(3)}</td>
                  <td className="p-3 border">{(v3.metrics.relevance.kappa - v2.metrics.relevance.kappa).toFixed(3)}</td>
                </tr>
                
                {/* User Alignment */}
                <tr className="bg-gray-50">
                  <td className="p-3 border font-semibold" rowSpan={3}>User Alignment</td>
                  <td className="p-3 border">Raw Agreement</td>
                  <td className="p-3 border">{v2.metrics.userAlignment.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.userAlignment.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.userAlignment.rawAgreement - v2.metrics.userAlignment.rawAgreement).toFixed(1)}%</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-3 border border-t-0">Exact Match</td>
                  <td className="p-3 border">{v2.metrics.userAlignment.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.userAlignment.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.userAlignment.exactMatch - v2.metrics.userAlignment.exactMatch).toFixed(1)}%</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-3 border border-t-0">Cohen's Kappa</td>
                  <td className="p-3 border">{v2.metrics.userAlignment.kappa.toFixed(3)}</td>
                  <td className="p-3 border">{v3.metrics.userAlignment.kappa.toFixed(3)}</td>
                  <td className="p-3 border">{(v3.metrics.userAlignment.kappa - v2.metrics.userAlignment.kappa).toFixed(3)}</td>
                </tr>

                {/* Faithfulness */}
                <tr>
                  <td className="p-3 border font-semibold" rowSpan={3}>Faithfulness</td>
                  <td className="p-3 border">Raw Agreement</td>
                  <td className="p-3 border">{v2.metrics.faithfulness.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.faithfulness.rawAgreement.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.faithfulness.rawAgreement - v2.metrics.faithfulness.rawAgreement).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3 border border-t-0">Exact Match</td>
                  <td className="p-3 border">{v2.metrics.faithfulness.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.faithfulness.exactMatch.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.faithfulness.exactMatch - v2.metrics.faithfulness.exactMatch).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-3 border border-t-0">Cohen's Kappa</td>
                  <td className="p-3 border">{v2.metrics.faithfulness.kappa.toFixed(3)}</td>
                  <td className="p-3 border">{v3.metrics.faithfulness.kappa.toFixed(3)}</td>
                  <td className="p-3 border">{(v3.metrics.faithfulness.kappa - v2.metrics.faithfulness.kappa).toFixed(3)}</td>
                </tr>

                {/* Safety */}
                <tr className="bg-gray-50">
                  <td className="p-3 border font-semibold" rowSpan={2}>Safety</td>
                  <td className="p-3 border">Recall</td>
                  <td className="p-3 border">{v2.metrics.safety.recall.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.safety.recall.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.safety.recall - v2.metrics.safety.recall).toFixed(1)}%</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-3 border border-t-0">False Positive Rate</td>
                  <td className="p-3 border">{v2.metrics.safety.falsePositiveRate.toFixed(1)}%</td>
                  <td className="p-3 border">{v3.metrics.safety.falsePositiveRate.toFixed(1)}%</td>
                  <td className="p-3 border">{(v3.metrics.safety.falsePositiveRate - v2.metrics.safety.falsePositiveRate).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 italic">
            Relevance, User Alignment and Safety are computed on 20 examples in v0.2.0 and 18 in v0.3.0, so small deltas on those dimensions are not directly comparable. Faithfulness is on 10 in both runs. Kappa is reported at three decimal places but differences under 0.1 are within noise for a sample this size.
          </p>
        </section>
      </main>
    </div>
  );
}
