import Link from "next/link";
import EvalForm from "./EvalForm";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center px-4 md:px-6 py-8 md:py-12">
      <main className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 sm:gap-0">
          <div>
            <h1 className="text-2xl font-semibold">LLM Output Evaluator</h1>
            <p className="text-sm text-gray-500 mt-1">
              Paste an LLM interaction below to score its output quality.
            </p>
          </div>
          <Link href="/findings" className="text-sm text-blue-600 hover:underline shrink-0">
            View Calibration Findings &rarr;
          </Link>
        </div>

        <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded border border-blue-200 flex flex-col gap-2">
          <p>
            <strong>Privacy Notice:</strong> This demo processes outputs using the Gemini free tier. 
            Google states that free tier requests may be used to improve their models. 
            <strong> Please do not paste confidential, proprietary, or PII content.</strong>
          </p>
          <p>
            <strong>Note:</strong> The demo runs on a free tier with a daily request limit. If you encounter a rate limit error, the quota for the day has been exhausted.
          </p>
        </div>

        <EvalForm />
      </main>
    </div>
  );
}
