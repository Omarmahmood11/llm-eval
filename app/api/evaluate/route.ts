import { GoogleGenAI } from "@google/genai";
import {
  buildRelevancePrompt,
  getSystemInstruction,
  JUDGE_PROMPT_VERSION,
} from "../../judgePrompt";
import type { EvalPayload, RelevanceScore } from "../../types";

const MODEL = "gemini-3.5-flash";

/**
 * The structured output schema enforced by Gemini.
 * Hard constraint #2: structured output is enforced by schema, not by prompt.
 */
const RELEVANCE_RESPONSE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    score: {
      type: "INTEGER" as const,
      description: "Relevance score from 1 to 5",
    },
    reasoning: {
      type: "STRING" as const,
      description:
        "One-sentence justification explaining which anchor applies and why",
    },
  },
  required: ["score", "reasoning"],
};

/**
 * Validates a parsed judge response. Returns the validated score or null.
 */
function validateJudgeResponse(
  parsed: Record<string, unknown>
): RelevanceScore | null {
  const { score, reasoning } = parsed;

  if (typeof score !== "number" || !Number.isInteger(score)) {
    return null;
  }
  if (score < 1 || score > 5) {
    return null;
  }
  if (typeof reasoning !== "string" || reasoning.trim() === "") {
    return null;
  }

  return { score, reasoning: reasoning.trim() };
}

/**
 * Calls Gemini with the judge prompt and structured output schema.
 * Returns the raw text response or throws on API error.
 */
async function callJudge(
  ai: GoogleGenAI,
  originalRequest: string,
  outputToEvaluate: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildRelevancePrompt(originalRequest, outputToEvaluate),
    config: {
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: RELEVANCE_RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

/**
 * POST /api/evaluate
 *
 * Phase 3: scores the Relevance dimension using an LLM judge.
 * Returns { result: { score, reasoning } } on success.
 * Judge prompt version: stamped in response headers for traceability.
 */
export async function POST(request: Request) {
  // --- API key check ---
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "GEMINI_API_KEY is not configured. Set it as an environment variable on the server.",
      },
      { status: 500 }
    );
  }

  // --- Parse and validate request body ---
  let body: EvalPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  if (
    !body.originalRequest ||
    typeof body.originalRequest !== "string" ||
    body.originalRequest.trim() === ""
  ) {
    return Response.json(
      { error: "originalRequest is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  if (
    !body.outputToEvaluate ||
    typeof body.outputToEvaluate !== "string" ||
    body.outputToEvaluate.trim() === ""
  ) {
    return Response.json(
      { error: "outputToEvaluate is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // --- Call judge with one retry on malformed output ---
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callJudge(
        ai,
        body.originalRequest.trim(),
        body.outputToEvaluate.trim()
      );

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Malformed JSON — retry if first attempt
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `Judge returned unparseable JSON on attempt ${attempt}. Retrying.`
          );
          continue;
        }
        return Response.json(
          {
            error:
              "The judge returned malformed output after two attempts. This is unexpected with schema enforcement.",
          },
          { status: 502 }
        );
      }

      const validated = validateJudgeResponse(parsed);
      if (!validated) {
        // Parsed but failed validation — retry if first attempt
        if (attempt < MAX_ATTEMPTS) {
          console.warn(
            `Judge response failed validation on attempt ${attempt}: ${JSON.stringify(parsed)}. Retrying.`
          );
          continue;
        }
        return Response.json(
          {
            error:
              "The judge returned malformed output after two attempts. This is unexpected with schema enforcement.",
          },
          { status: 502 }
        );
      }

      // Success
      return Response.json(
        { result: validated },
        {
          headers: {
            "X-Judge-Prompt-Version": JUDGE_PROMPT_VERSION,
          },
        }
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";

      // Classify the error for a clear, specific message to the user.
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("api key not valid") ||
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("403") ||
        lowerMessage.includes("401")
      ) {
        return Response.json(
          {
            error:
              "The Gemini API key is invalid or unauthorized. Check the GEMINI_API_KEY environment variable.",
          },
          { status: 401 }
        );
      }

      if (
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("quota") ||
        lowerMessage.includes("429") ||
        lowerMessage.includes("resource exhausted")
      ) {
        return Response.json(
          {
            error:
              "Gemini rate limit reached. This is a free-tier limit — wait a moment and try again.",
          },
          { status: 429 }
        );
      }

      // Network or unexpected error — surface distinctly from API errors.
      return Response.json(
        {
          error: `Failed to reach the Gemini API. This may be a network issue. Details: ${message}`,
        },
        { status: 502 }
      );
    }
  }

  // Should never reach here, but TypeScript needs it
  return Response.json(
    {
      error:
        "The judge returned malformed output after two attempts. This is unexpected with schema enforcement.",
    },
    { status: 502 }
  );
}
