# conventions.md

Rules for how this project gets built. Re-read at the start of every session. Mirrored to `AGENTS.md` at project root.

---

## Hard constraints

These are not preferences. Breaking one means the phase failed.

1. **The API key never leaves the server.** It lives in a Vercel environment variable, read only inside `/api/evaluate`. It must not appear in client components, in the repo, in a `.env` file that gets committed, or in any network payload visible in dev tools.

2. **Structured output is enforced by schema, not by prompt instruction.** Never rely on asking the model to "return JSON." Use Gemini's response schema.

3. **The judge prompt lives in its own file and carries a version number.** Never inline it in the API route. Bump the version on every change.

4. **No database, no auth, no accounts, no stored submissions.** If a phase appears to need one, stop and ask rather than building it.

5. **Build only the current phase.** If it is not in the current phase of `implementationPlan.md`, it does not get built this session. This includes "while I was in there" improvements.

---

## Working style

- **The owner reads code but does not write it.** Explain non-obvious choices in plain language. Prefer clarity over cleverness in the code itself.
- **Ask rather than assume.** When a requirement is ambiguous, ask. A wrong assumption that compiles is worse than a question.
- **Flag uncertainty explicitly.** Say when something is untested or when you are unsure it works. Do not produce confident output about work you have not verified.
- **No silent failures.** Every error path surfaces something visible. Never catch an exception and continue as if nothing happened.

---

## Code conventions

| Area | Rule |
|---|---|
| Language | TypeScript for the app. Python for `/scripts`. |
| Naming | camelCase in TS, snake_case in Python |
| Components | Function components, one per file |
| State | React state only. No state management library. |
| Styling | Tailwind |
| Dependencies | Flag before adding any new package and say why it is needed |

---

## Boundaries between the two systems

The Next.js app and the Python calibration harness share the rubric and the judge prompt. Nothing else.

- `/scripts/calibrate.py` is never imported by the app and never deployed
- The app never reads `goldenSet.json` at runtime
- The findings page reads `calibrationResults.json` at build time only

---

## Error handling

- Judge returns malformed output → retry once, then surface a clear error to the user
- API key missing or invalid → explicit error message naming the cause, not a generic failure
- Rate limit hit → tell the user what happened and that a daily request limit was reached
- Network failure → distinguish from an API error in the message

---

## Things to actively avoid

- Adding auth, accounts, or a database because they are "standard"
- Scaffolding for features listed as parked in `implementationPlan.md`
- Refactoring code from a previous phase that is working
- Hardcoding the API key "temporarily" during development
- Parsing judge output with regex or string matching
- Swallowing errors to make a demo look clean

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
