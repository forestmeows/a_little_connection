# Youth AI Connection Companion

Adult-only (18–25) hackathon prototype in progress. Use fictional, non-sensitive conversations only. No nonprofit partnership or staffed support service is represented.

## Step 1: Gemini setup check

Requires Node.js 24 and an eligible Gemini API free-tier account. No paid billing or paid fallback is planned.

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey). Create a key/project if needed. Check that the project is on the free tier, with no paid billing enabled. Check model availability and [active quotas](https://ai.google.dev/gemini-api/docs/rate-limits).
2. Copy `.env.example` to `.env` in this project. Paste your key after `GEMINI_API_KEY=` in that local file only. Never send it in chat, screenshots, or a commit. Keep `.env` closed during recordings.
3. Run `npm install`, then `npm test`.
4. Run `npm run check:gemini`. This performs 13 live requests spaced 15 seconds apart and takes several minutes. It prints only test names, labels, and a summary, not your key or raw conversation content. Your actual quota may require longer pauses. Ctrl+C stops the script.

The planned model is `gemini-3.5-flash-lite`; its availability must be checked for your project. The script cannot inspect billing. If quota/model access fails, stop and investigate instead of enabling payment or silently switching providers. Classification examples are prototype checks, not clinical validation.

`npm test` uses offline model stubs to check parsing/error behavior. A passing offline test does not establish live API access. The browser app is not built yet; see `devpost/checklist.md` for progress.

Gemini free-tier input/output may be used to improve Google products. Do not submit personal or sensitive information. Human-volunteer conversations in the planned app will remain separate from Gemini.
