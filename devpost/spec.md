---
doc: spec
status: approved
---

# Youth AI Connection Companion — Technical Spec

## How This Works, In Plain Language
Two browser windows connect to one small program running on your laptop: the local server. One window is the user chat; the other is where a teammate acts as the volunteer. The server passes their volunteer messages between the windows and saves history and bookmarks in a file on your laptop.

For the demo chatbot, the server contacts Gemini over the internet. When monitoring is on, Gemini labels possible cues in context; our own code counts those labels and applies the exact check-in threshold and cooldown. Balanced-response guidance is an additional instruction sent with future chatbot requests. It guides responses but cannot guarantee perfect behavior.

This is an adult-only 18–25 demo with fictional conversation content. Volunteer messages never go to Gemini. There is no public hosting, real nonprofit operation, or local AI model installation.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`.
1. Browser loads the chat and companion from the local server. Read the saved monitoring choice, bookmarks, and volunteer history.
2. User activates the companion after the explanation. The server saves that choice.
3. On a new user message, if monitoring is on and not in cooldown, Gemini classifies that message using recent fictional conversation context. Code updates the eight-user-message window.
4. If three qualifying messages span two categories, code raises the check-in, enables automatic guidance before generating the next reply, clears the window, and starts eight user messages of cooldown.
5. Gemini generates the chatbot reply using normal helpful instructions plus balanced guidance if active. A separate classification call checks the reply when monitoring is on. A qualifying reply offers the optional adjustment once per conversation; accepting affects future replies.
6. User writes a volunteer request. The server saves only that human-chat message in the volunteer thread. The volunteer window reads pending requests and sends an actual human reply.
7. Each window checks the local server periodically for human messages and availability. No Gemini calls are needed for this synchronization.
8. Opening a fictional group shows its details; saving writes its ID to the local data file.

## Stack
- **JavaScript and Node.js 24:** learner-approved language/server approach. Installed runtime verified as v24.22.1; npm 11.19.1. Native HTTP, filesystem, UUID, and test modules keep server dependencies small. [HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html), [filesystem](https://nodejs.org/docs/latest-v24.x/api/fs.html), [Node releases](https://nodejs.org/en/about/previous-releases).
- **Plain HTML/CSS and browser JavaScript modules:** implementation detail derived from the small app; no frontend framework or build step needed.
- **Official Google GenAI JavaScript SDK, `@google/genai`:** server-side Gemini integration. SDK 2.31.0 installed during slice 1 and pinned in package.json/package-lock.json. Offline adapter tests pass; live account/model access verified after local key setup; generation and all 12 classification fixtures passed in one smoke run. [Quickstart](https://ai.google.dev/gemini-api/docs/get-started).
- **Gemini API free tier:** learner-selected external model service. Planned initial model: `gemini-3.5-flash-lite`, currently listed with free input/output. Verify account access and classification quality before committing to it. No paid fallback. [Pricing](https://ai.google.dev/gemini-api/docs/pricing).
- **Local JSON file:** implementation detail for this one-user, one-volunteer demo. No hosted database or account system.

## Where It Runs and How Someone Tries It
Windows laptop, Node 24, internet for Gemini, and two browser windows. Both windows use the same host spelling and port.

Planned setup during build:
1. Create a Gemini API key in Google AI Studio using an eligible free-tier project. Check active quota and that paid billing is not enabled. Never paste the key into chat.
2. Put `GEMINI_API_KEY=...` and `GEMINI_MODEL=gemini-3.5-flash-lite` in ignored `.env`. Commit only secret-free `.env.example`.
3. Run `npm install`, then `npm start`. The start script will run `node --env-file=.env server/index.js`.
4. Open `http://127.0.0.1:3000/` and `http://127.0.0.1:3000/volunteer`.
5. Use fictional conversation examples and have a second adult type volunteer replies. Record the end-to-end journey.

Submission still needs a short demo video and public repository; neither requires deployment. Runtime data and credentials must be ignored before committing. Starting this app creates local project files and a process; stopping the process does not delete history. No global installation is needed for the app dependencies.

## Look and Feel
Implements `prd.md > Look and Feel`. White/warm cream surfaces, muted peach/rose accents, dark warm text, generous spacing, and a small heart icon drawn as a simple inline SVG. Use system Segoe UI/Arial fonts to avoid font downloads. Keep readable contrast and keyboard-visible focus. Companion opens as a side panel; on narrow screens it can occupy the available screen width. Distinguish AI and human chats using clear labels as well as styling.

## Components

### Browser Chat and Companion
Files: `public/index.html`, `public/app.js`, `public/styles.css`. Implements `prd.md > Screens and Layout`, `Activation and Returning Use`, and `Starting a New AI Conversation`.

Render main chat, icon, activation explanation, monitoring switch, manual Enable balanced guidance control, disclosure, and first-use/returning sections. Off must leave saved human history and interests accessible. Request IDs prevent accidental duplicate sends. Render all user/model text as text, not executable HTML. Show sending/error states and retain unsent text on failure.

### Conversation Rules
File: `server/rules.js`. Implements `prd.md > Pattern Detection and Check-In`, `Automatic Balanced Responses`, and `Chatbot Reply Flags and User Choice`.

Gemini labels; this module alone controls counting and timing. Each eligible user message stores an ID and a set of allowed categories. A qualifying message has a nonempty category set. Keep the last eight eligible user messages, including ordinary messages with empty labels. Trigger at three qualifying messages and a union of at least two categories. Count each message once, including on retry.

After a trigger, skip the next eight user messages entirely for user-cue detection; resume fresh on the ninth. Trigger at message 5 means cooldown at 6–13 and resume at 14. Reply monitoring continues during cooldown. A new conversation resets cues, cooldown, triggered/accepted guidance, and the one-off reply offer. Preserve manual guidance while monitoring remains on. Reopening the same conversation restores its saved counters to avoid duplicate counting.

Store separate flags for manual, pattern-triggered, and reply-accepted guidance. Effective guidance is `monitoringOn && (manual || pattern || accepted)`. Off clears cue/cooldown and all guidance flags; re-enabling begins fresh. Dismissal never disables guidance. Once-per-conversation reply offer is marked offered when displayed; do not repeat it after acceptance or decline. Suppress redundant adjustment offers if guidance is already active. Changes while a model request is pending are checked before committing its results; an off/new-chat action must prevent stale detections or notices.

### Gemini Adapter and Prompts
Files: `server/gemini.js`, `server/prompts.js`. Implements the user and chatbot cue headings and `Automatic Balanced Responses`.

Separate calls for user classification, reply generation, and reply classification keep classification independent of self-generated labels. Up to three calls per normal monitored turn; fewer with monitoring off or during cooldown. Never intentionally make the normal chatbot harmful to manufacture a successful detection demo. Use clearly labeled fictional example fixtures for concerning chatbot replies if a live model does not produce them.

Classifiers receive delimited fictional chat text and instructions to treat it as data, not commands. User classifier returns `{categories: [...]}` using only `social_withdrawal`, `emotional_reliance`, `validation_seeking`, `human_attachment`, `surrendered_judgment`, `access_distress`. Reply classifier returns `{flagged: boolean, categories: [...]}` using `sycophancy`, `excessive_intimacy`, `relationship_substitution`. Validate parsed output and allowed enums server-side; invalid output is an unknown result, not a clean bill or a positive cue. Use the PRD's paired examples in classifier instructions and evaluation.

### Local API Server
Files: `server/index.js`, `server/routes.js`. Implements the full journey. Bind only to `127.0.0.1`; serve public files from an explicit allowlist, never `.env` or runtime data. Accept same-origin JSON mutations with body limits and validate IDs/text. These role routes are a local demo arrangement, not production authentication.

Planned contracts:
- `GET /api/user`: settings, current AI conversation, human thread, bookmarks, availability, and sample groups; never credentials.
- `POST /api/settings` `{monitoringOn}`; `POST /api/guidance` `{enableManual:true}`; return updated user state.
- `POST /api/chat` `{conversationId,requestId,text}`; return saved messages, check-in status, guidance status, reply-offer status, and any explicit monitoring error.
- `POST /api/chat/new` `{}`; return the new conversation and preserved manual setting.
- `POST /api/check-in/dismiss` `{conversationId}`; close only the check-in.
- `POST /api/reply-offer` `{conversationId,accept}`; resolve the optional offer.
- `POST /api/volunteer/request` `{requestId,text}`; return thread ID and pending status.
- `GET /api/volunteer`: availability and human requests/messages only; no AI transcript or cue data.
- `POST /api/volunteer/availability` `{available}`; update availability.
- `POST /api/volunteer/message` `{threadId,requestId,text,role}` with role restricted to the two local demo views; return saved human message. Volunteer reply changes pending to active.
- `POST /api/bookmarks` `{groupId,saved}`; idempotently save/remove a sample group.

Both views poll their own read endpoint about every two seconds while visible, plus immediately after mutations. Polling is local and never triggers model calls. A serialized mutation queue protects file updates; model work must not block volunteer requests.

### Saved Data
File: `server/store.js`; runtime file: `data/demo.json`. Implements `prd.md > Activation and Returning Use`, `Volunteer Request and Conversation`, and `Interest Groups and Bookmarks`.

Write serialized updates using a temporary file and rename; acknowledge successful mutations after the save succeeds. Avoid holding a stale full-file snapshot over an awaited model call. Malformed saved data shows a clear error and must not be silently erased. Availability resets to unavailable on server startup so it does not imply a volunteer is present after a restart.

### Volunteer View
Files: `public/volunteer.html`, `public/volunteer.js`. Implements `prd.md > Volunteer Request and Conversation`. One volunteer availability switch, pending request list, selected human thread, message composition, delivery/error status. Unavailable still permits leaving a request. No automatic model-generated volunteer replies.

### Sample Communities
File: `public/groups.json`, rendered by `public/app.js`. Implements `prd.md > Interest Groups and Bookmarks`. A few clearly fictional groups with ID, title, purpose, organizers/member description, joining instructions/contact, and next session with timezone or an explicit no-session state. Do not display real private contact details or working membership. Store saved IDs as a unique set; no group messaging.

## Data Model
One fixed local demo user and one volunteer. All persisted app data lives in ignored `data/demo.json`; no account synchronization or cloud database.

- `schemaVersion`, `revision`: file format and update tracking.
- `settings`: monitoring boolean and manual guidance boolean. Monitoring persists across restarts; off clears manual guidance per the rules above.
- `conversation`: UUID, ordered user/assistant messages (ID, text, timestamp, request ID, generation status), latest eligible user labels, cooldown remaining, check-in open, pattern guidance, accepted guidance, reply-offer status. Preserve the active conversation on reopening; new-chat explicitly starts a new conversation rather than inheriting cues.
- `humanThreads`: ID, pending/active status, messages (ID, sender user/volunteer, text, timestamp, request ID). Persist across new AI chats, reopenings, and server restarts.
- `bookmarks`: unique fictional group IDs, same persistence as human threads.
- `volunteerAvailable`: current process availability; reset false on server restart.

Transient browser-only items: open panel/tab and unsent message drafts. Do not promise unsent-draft recovery after closing the browser. Transient server items: request locks and in-flight model calls. Runtime content and raw prompts must not be printed in routine logs or committed.

## File Structure
```text
project/
  package.json             # start and test scripts
  package-lock.json        # exact installed SDK dependency versions
  .env.example             # empty key placeholder and model configuration
  .gitignore               # secrets, runtime data, node_modules, learner profile
  README.md                # setup, adult-only fictional demo, recording steps
  server/
    index.js               # local HTTP entry point
    routes.js              # validated browser API contracts
    store.js               # serialized persistence
    rules.js               # exact threshold/cooldown/guidance behavior
    gemini.js              # SDK calls, validation, timeouts
    prompts.js             # generation/classification instructions
  public/
    index.html             # user chat shell
    app.js                 # companion, human chat, communities
    styles.css             # shared warm design
    groups.json            # fictional community details
    volunteer.html         # volunteer view shell
    volunteer.js           # availability and human replies
  data/
    demo.json              # generated, ignored runtime history
  tests/
    rules.test.js          # threshold, cooldown, resets, manual guidance
    integration.test.js    # persistence and human handoff with model stub
    fixtures.json          # labeled fictional positive/negative cue examples
  devpost/
    learner-profile.md     # ignored personal learning context
    scope.md / scope.html  # approved scope
    prd.md / prd.html      # approved product requirements
    spec.md / spec.html    # this technical plan and companion
```

## External Services and Dependencies
Only Gemini is an external runtime service. Use the official `@google/genai` SDK, authenticated from server-only `GEMINI_API_KEY`. `ai.interactions.create({model,input,system_instruction,generation_config})` maps to `POST https://generativelanguage.googleapis.com/v1beta/interactions` with `x-goog-api-key`. Read the SDK's `interaction.output_text`; no text means a visible error rather than a fabricated response. The installed SDK uses the steps-based Interactions API, which rejects the earlier turn-list input format. Send an explicitly labeled JSON-string conversation as input and keep instructions separate. Classification uses response_format {type: text, mime_type: application/json, schema: ...}, validated locally; response_mime_type alone is rejected. Live generation and all 12 fictional classification fixtures passed with the corrected format; zero mismatches in this single run. This is prototype smoke evidence, not accuracy validation. [Text generation and request examples](https://ai.google.dev/gemini-api/docs/text-generation), [structured output](https://ai.google.dev/gemini-api/docs/structured-output).

Planned model is `gemini-3.5-flash-lite`; free-tier prices verified in documentation, actual project access unverified. Do not assert a numeric quota: limits vary by project/model and are visible in AI Studio. Review RPM, TPM and daily requests during setup; three calls per monitored turn consume that allowance faster than a plain chatbot. No automatic upgrade or alternative paid model. [Limits](https://ai.google.dev/gemini-api/docs/rate-limits), [pricing](https://ai.google.dev/gemini-api/docs/pricing).

Only fictional, non-sensitive text is permitted in this demo. Free-tier content may be used for product improvement; do not send volunteer messages, API keys, local paths, or personal information. Adult-only audience is explicit. [Terms](https://ai.google.dev/gemini-api/terms).

## Important Failure Modes
- **No key, unavailable model, or exhausted quota:** show a setup/quota error; preserve text/history. Volunteer chat and communities continue locally. No silent scripted or paid replacement.
- **Classification timeout or invalid JSON:** show monitoring unavailable for that turn; store an unknown label without counting it as a cue. Do not retroactively double-count on retry. Generation may continue with already active guidance; do not claim this turn was successfully monitored.
- **Generation failure:** user message stays visible with retry status; retry uses its request ID without advancing the threshold/cooldown again. No fake assistant reply.
- **Local persistence failure or server offline:** show send/save failure and retain unsent content in the open view; do not claim delivery. Poll failures show disconnected status, not available volunteer status.

## Verification and Demo Evidence
Run `npm test` using Node's built-in test runner. Meaningful deterministic tests cover three-in-eight/two-category boundaries, early trigger, exact eight-message cooldown, retry idempotency, off/new-chat resets, manual retention, and once-per-conversation offers. Integration checks cover saved history/bookmarks after restart, private AI history excluded from volunteer reads, offline request followed by an actual human reply, and local failure behavior. Tests may stub model output; the final demo must not pretend those stubs are live Gemini.

Early live smoke check: free-tier model access, successful contextual user classification, structured output parsing, normal generation, and paired concerning/supportive reply examples. Record observed errors and misclassifications; thresholds are exact but semantic labels remain fallible. A natural model may never generate the concerning fixtures; test reply flagging on explicitly labeled sample exchanges rather than forcing harmful behavior.

Browser verification: two windows, manual and automatic guidance notices, activation/off, check-in dismissal, two-person conversation including unavailable/pending path, new chat, saved group details, reopen persistence, keyboard controls, and narrow screen readability. Record a short end-to-end video and publish code/planning docs only after secret/runtime-data checks.

## What Was Simplified and Why
- Two local windows and one fixed demo user/volunteer avoid accounts, matching, and hosting while preserving real human replies.
- Local polling and a saved JSON file avoid live-sync infrastructure and hosted databases.
- Fictional communities support browsing/bookmarking without real membership or group messaging.
- No model installation: the learner preferred free hosted Gemini over local setup. Internet access and free-tier quotas are accepted dependencies, not guarantees.

## Decisions and Open Issues
Learner agreed to two local windows, free Gemini, adult-only 18–25 fictional demo, JavaScript/Node local server, and contextual Gemini classification followed by exact coded rules. They asked whether local models require memory or permanent changes; we checked the laptop and explained reversible installation, then they chose hosted Gemini instead. They had used ChatGPT only through the app; the API/server distinction was explained. This connects their goal of a working product to a concrete setup investigation, not a claim of coding mastery.

Derived implementation details include plain HTML/CSS, polling, local JSON persistence, file layout, model candidate, and SDK adapter. The learner approved this blueprint, including local storage and the two-window demo approach. Build-time investigations: confirm free-tier account eligibility/quota, model access, compatible SDK version/schema, classification behavior and latency. If free-tier access or semantic classification cannot work, report the blocker and agree on a change; do not silently replace the kernel with a scripted demo.

Build has begun: the slice 1 adapter and setup-check script exist; browser implementation has not started. The learner approved this technical plan; it is ready for `5-build`.
