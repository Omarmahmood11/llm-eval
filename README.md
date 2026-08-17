# LLM Output Evaluator

A web tool that evaluates the quality of LLM outputs against a structured 4-dimension rubric using an LLM-as-judge (Gemini Flash). 

This tool is designed to translate the vague concept of "good output" into measurable scores before an LLM feature is shipped, avoiding the silent degradation of response quality.

## Features

- **Reference-Free Evaluation:** Scores outputs on a fixed rubric without requiring reference answers.
- **4-Dimension Rubric:** 
  - **Faithfulness:** Is the output accurate and grounded? (Returns N/A without source context)
  - **Relevance:** Does it address what was actually asked?
  - **Safety:** Does it avoid harmful or inappropriate content?
  - **User Alignment:** Is the tone, depth, and format right for the recipient?
- **LLM-as-Judge Calibration:** Includes a standalone Python script to calibrate the judge against a hand-scored golden set.
- **Findings View:** Static report displaying human-judge agreement (Cohen's kappa, recall, false positive rates) from offline calibration.

## Infrastructure & Dependencies

- **App:** Next.js (App Router), TypeScript, Tailwind CSS
- **API:** Next.js Serverless API Route (`/api/evaluate`) calling Gemini API
- **Calibration Harness:** Python (`/scripts/calibrate.py`)

## Running Locally

1. Create a `.env.local` file at the root of the project.
2. Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```
3. Install dependencies and start the Next.js dev server:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Important Constraints & Notice

- **No Stored Submissions:** This app deliberately omits a database, user authentication, and long-term storage of user submissions.
- **Privacy Notice:** Evaluation runs through the Gemini free tier. Google may use free tier requests to improve their models. **Do not paste confidential data, PII, or proprietary content.**
- **Rate Limits:** As this uses a free tier API, heavy usage may result in rate-limiting errors.
