# Youth AI Connection Companion

Adult-only (18–25) hackathon prototype in progress. Use fictional, non-sensitive conversations only. No nonprofit partnership or staffed support service is represented.

## Step 1: Gemini setup check

Requires Node.js 24 and an eligible Gemini API free-tier account. No paid billing or paid fallback is planned.

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey). Create a key/project if needed. Check that the project is on the free tier, with no paid billing enabled. Check model availability and [active quotas](https://ai.google.dev/gemini-api/docs/rate-limits).
2. Copy `.env.example` to `.env` in this project. Paste your key after `GEMINI_API_KEY=` in that local file only. Never send it in chat, screenshots, or a commit. Keep `.env` closed during recordings.
3. Run `npm install`, then `npm test`.
4. Run `npm run check:gemini`. This performs 13 live requests spaced 15 seconds apart and takes several minutes. It prints only test names, labels, and a summary, not your key or raw conversation content. Your actual quota may require longer pauses. Ctrl+C stops the script.

The planned model is `gemini-3.5-flash-lite`; its availability must be checked for your project. The script cannot inspect billing. If quota/model access fails, stop and investigate instead of enabling payment or silently switching providers. Classification examples are prototype checks, not clinical validation.

`npm test` uses offline model stubs to check parsing/error behavior and exact conversation rules. A passing offline test does not establish live API access. See `devpost/checklist.md` for progress.

## Step 2: Try the chat and companion

Run `npm start`, then open http://127.0.0.1:3000/. Keep the terminal open; Ctrl+C stops the server. Click the heart-related Companion button and read the explanation before enabling monitoring. Use fictional messages only.

The companion checks for three qualifying user messages spanning two categories within eight messages. Once triggered, the next eight user messages are a cooldown. You can dismiss the check-in, manually enable balanced guidance, turn monitoring off, or start a new AI conversation. Monitoring and manual guidance choices are reflected on screen. History is saved locally in ignored `data/demo.json`.

For example, in a fictional role-play send separate messages expressing inability to cope without the chat, withdrawing from friends in favor of AI, and surrendering independent decisions. A pattern should offer a check-in and disclose guidance. Real model classification can vary; the rule logic is separately tested. Monitoring failures are displayed rather than treated as successful checks. A monitored turn can require three API calls; pause between sends if quota is limited.

Volunteer messaging and community bookmarks are later checklist steps; the current UI labels them as upcoming, with no request sent from those placeholders.

Gemini free-tier input/output may be used to improve Google products. Do not submit personal or sensitive information. Human-volunteer conversations in the planned app will remain separate from Gemini.

### Default and adjusted chatbot replies
Unadjusted replies use Gemini default behavior, without app-authored baseline instructions or a hidden role-play wrapper. Monitoring calls are separate and do not instruct the chatbot. Balanced-response instructions are added only when adjustments are enabled manually, accepted from an offer, or automatically triggered by the agreed user-pattern rule. The provider retains its own built-in behavior. Start a new conversation to compare modes without earlier instructed replies in the history.
