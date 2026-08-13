import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.5-flash";
const TEST_PROMPT =
  "Respond with exactly one sentence: confirm that this API connection is working.";

/**
 * POST /api/evaluate
 *
 * Phase 2: proves Gemini connectivity and safe key handling.
 * Sends a hardcoded prompt and returns the raw response.
 * The API key is read from the server environment only.
 */
export async function POST() {
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

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: TEST_PROMPT,
    });

    const text = response.text;

    if (!text) {
      return Response.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    return Response.json({ result: text });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";

    // Classify the error for a clear, specific message to the user.
    // The Google GenAI SDK throws errors with status codes in the message.
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

    // Network or unexpected error — surface it distinctly from API errors.
    return Response.json(
      {
        error: `Failed to reach the Gemini API. This may be a network issue. Details: ${message}`,
      },
      { status: 502 }
    );
  }
}
