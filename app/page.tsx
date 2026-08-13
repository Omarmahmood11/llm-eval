import EvalForm from "./EvalForm";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center px-6 py-12">
      <main className="w-full max-w-2xl flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">LLM Output Evaluator</h1>
        <p className="text-sm text-gray-500">
          Paste an LLM interaction below to score its output quality.
        </p>
        <EvalForm />
      </main>
    </div>
  );
}
