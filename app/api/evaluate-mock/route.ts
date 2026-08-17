/**
 * Mock evaluate endpoint for testing error paths without hitting the real Gemini API.
 *
 * Usage: POST /api/evaluate-mock?scenario=<scenario_name>
 *
 * Scenarios:
 *   success          — full scores, all dimensions
 *   null_faithfulness — scores with faithfulness.score = null
 *   rate_limit        — 429, free-tier limit message
 *   auth              — 401, invalid API key
 *   server_config     — 500, missing API key
 *   network           — 502, network failure
 *   malformed_output  — 502, malformed output after retry
 *   timeout           — 504, evaluation timed out
 *   unknown           — 500, generic unknown error
 *
 * DEV ONLY: This route exists for Phase 7 testing. Remove or gate before shipping.
 */

import type { ErrorCategory } from "../../types";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario") ?? "success";

  switch (scenario) {
    case "success":
      return Response.json({
        result: {
          relevance: {
            score: 5,
            reasoning:
              "The response directly and completely addresses the user's request for a refund policy explanation.",
          },
          userAlignment: {
            score: 4,
            reasoning:
              "Tone and depth are appropriate, though slightly more formal than the context required.",
          },
          faithfulness: {
            score: 4,
            reasoning:
              "All major claims are grounded in the source. One peripheral detail about processing time is not in the source but is non-misleading.",
          },
          safety: {
            score: 5,
            reasoning: "No safety concern.",
          },
        },
      });

    case "null_faithfulness":
      return Response.json({
        result: {
          relevance: {
            score: 3,
            reasoning:
              "The response addresses the first two parts of the multi-part request but omits the third.",
          },
          userAlignment: {
            score: 2,
            reasoning:
              "The response is far too technical for a user who explicitly said they are not a developer.",
          },
          faithfulness: {
            score: null,
            reasoning: "No source context provided.",
          },
          safety: {
            score: 5,
            reasoning: "No safety concern.",
          },
        },
      });

    case "rate_limit":
      return Response.json(
        {
          error:
            "Gemini rate limit reached. This is a free-tier limit — wait a moment and try again.",
          errorCategory: "rate_limit" as ErrorCategory,
        },
        { status: 429 }
      );

    case "auth":
      return Response.json(
        {
          error:
            "The Gemini API key is invalid or unauthorized. Check the GEMINI_API_KEY environment variable.",
          errorCategory: "auth" as ErrorCategory,
        },
        { status: 401 }
      );

    case "server_config":
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Set it as an environment variable on the server.",
          errorCategory: "server_config" as ErrorCategory,
        },
        { status: 500 }
      );

    case "network":
      return Response.json(
        {
          error:
            "Failed to reach the Gemini API. This may be a network issue. Details: fetch failed",
          errorCategory: "network" as ErrorCategory,
        },
        { status: 502 }
      );

    case "malformed_output":
      return Response.json(
        {
          error:
            "The judge returned malformed output after two attempts. This is unexpected with schema enforcement.",
          errorCategory: "malformed_output" as ErrorCategory,
        },
        { status: 502 }
      );

    case "timeout":
      return Response.json(
        {
          error:
            "The evaluation timed out. The judge did not respond in time.",
          errorCategory: "timeout" as ErrorCategory,
        },
        { status: 504 }
      );

    case "unknown":
    default:
      return Response.json(
        {
          error: "An unexpected error occurred on the server.",
          errorCategory: "unknown" as ErrorCategory,
        },
        { status: 500 }
      );
  }
}
