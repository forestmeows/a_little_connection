---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn (chosen by the learner).

## Slices

- [ ] **1. Verify Gemini can generate and classify fictional conversations**
  Becomes usable: A runnable setup-check script that confirms free-tier access, generates a reply, and classifies the agreed fictional cue examples.
  Why now: Proves the unfamiliar external service before building screens around it. This is a critical-risk investigation with runnable evidence, not a general setup phase.
  PRD ref: `prd.md > Pattern Detection and Check-In`, `prd.md > Chatbot Reply Flags and User Choice`, `prd.md > Adult-Only Demo and AI Provider`
  Spec ref: `spec.md > Stack`, `spec.md > Gemini Adapter and Prompts`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Create the package manifest, secret-free environment example, Gemini adapter/prompts, fictional fixtures, and scripts/check-gemini.js. Guide the learner through saving a free-tier key locally without sharing it in chat. Verify the actual SDK/model/schema and pin installed versions. Record internal API corrections in Revisions and spec. No paid billing, no silent model simulation.
  Verify (mechanical): Run the setup check against live Gemini; inspect generation, valid classifier outputs, positive/negative example results, and observable quota/error behavior. Run adapter validation checks with invalid outputs. Do not claim live verification without a working key and API response.
  Learner check: Save the key locally following instructions, inspect the live setup summary (or run npm run check:gemini yourself if desired), and confirm the setup/result is clear without exposing the key. Do not repeat the 13-call check solely for ceremony after an observed successful run.
  Commit: `Verify Gemini generation and contextual cue classification`

- [ ] **2. Chat with the companion and see transparent interventions**
  Becomes usable: A warm regular-looking chatbot with a heart icon, opt-in companion, pattern check-ins, automatic and optional guidance, manual guidance control, and new-chat/off behavior.
  Why now: Delivers the detection-and-response part of the distinctive idea early, allowing interaction and design feedback before adding more surfaces.
  PRD ref: `prd.md > Activation and Returning Use`, `prd.md > Pattern Detection and Check-In`, `prd.md > Automatic Balanced Responses`, `prd.md > Chatbot Reply Flags and User Choice`, `prd.md > Starting a New AI Conversation`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Browser Chat and Companion`, `spec.md > Conversation Rules`, `spec.md > Local API Server`, `spec.md > Saved Data`, `spec.md > Data Model`
  Build: Add the local server, saved active conversation/settings, validated routes, user chat and companion, coded threshold/cooldown, reply offer, manual activation, disclosures, and send/retry/error states. Preserve server-only credentials and prevent stale in-flight detections after off/new-chat actions. Clearly label any example-fixture view; do not present sample replies as live Gemini output.
  Verify (mechanical): Run npm test for threshold, category boundaries, early triggers, exact cooldown, retry idempotency, off/new-chat lifecycle, guidance sources, and once-per-conversation offers. Start npm start, inspect browser interaction and visible notices, and exercise one fictional live conversation. Confirm reopen restores settings and does not double-count messages; private files cannot be served.
  Learner check: Open http://127.0.0.1:3000/, inspect the look, activate monitoring, try the fictional examples, dismiss a check-in, manually enable guidance, turn monitoring off, and start a new chat. Describe confusing behavior or visual changes desired.
  Commit: `Add monitored chat and transparent balanced-response guidance`

- [ ] **3. Connect the user to a real volunteer in the second window**
  Becomes usable: A user-written request reaches a real second participant; replies appear in the user panel, including pending messages when unavailable and retained conversation history.
  Why now: Completes the human-connection kernel immediately after the monitored chat works, without introducing accounts or hosting.
  PRD ref: `prd.md > Volunteer Request and Conversation`, `prd.md > Activation and Returning Use`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Volunteer View`, `spec.md > Local API Server`, `spec.md > Saved Data`, `spec.md > Data Model`
  Build: Add the volunteer page, availability switch, pending requests, two-way text threads, local polling, user-panel history and request composition. Share only the written human request, not AI messages or cue data. Save before acknowledging sends and preserve drafts on failure. Default availability to off on server restart.
  Verify (mechanical): Run integration tests proving offline request persistence, real two-view message flow, duplicate-send prevention, privacy of volunteer endpoint, concurrent saved updates, and restart retention. Open both windows and manually send a request and volunteer reply; verify no Gemini requests occur for human chat or polling.
  Learner check: Open /volunteer in a second window. Leave an offline request from the user view, set the volunteer available, open the request, send a real reply, and return to the user view. Restart/reopen and confirm history remains.
  Commit: `Add persistent real-person volunteer handoff`

- [ ] **4. Explore and bookmark communities, then verify the whole journey**
  Becomes usable: Fictional interest groups have full detail views and persistent bookmarks; the complete agreed demo journey can be recorded.
  Why now: Adds the supporting connection-discovery route after the core human handoff is working, then checks the complete experience together.
  PRD ref: `prd.md > Interest Groups and Bookmarks`, `prd.md > The Core Journey`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Sample Communities`, `spec.md > Browser Chat and Companion`, `spec.md > Verification and Demo Evidence`, `spec.md > Where It Runs and How Someone Tries It`
  Build: Add clearly fictional community data, details for purpose/organizers/contact/next session, save/remove controls, empty states, and returning-user saved groups. Finish README setup and recording instructions, offline/quota/failure messages, responsive styling, keyboard focus, and truthful demo labels.
  Verify (mechanical): Run all relevant tests; verify bookmark uniqueness and persistence across restart. Exercise the full chat/check-in/guidance/human-handoff/community journey, missing group information, unavailable volunteer, and sending failure. Check desktop/narrow layouts and keyboard access. Review intended staged files for credentials, runtime content, private learning context, and unrelated work before committing.
  Learner check: Try the full journey freely, open a group, inspect all its information, save it, reopen the app, and confirm it remains bookmarked. Report anything broken, confusing, or worth changing during final review.
  Commit: `Add saved interest communities and complete demo journey`

### Current Slice 1 Progress
SDK @google/genai 2.31.0 installed and locked. Setup script, prompts, fixtures, and adapter implemented. Five offline adapter tests pass. Learner saved the local key. Live authentication, model listing, and generation succeed. Corrected SDK request formats. Full live check passed generation and all 12 fictional classifications with zero mismatches. Five offline adapter tests pass. Waiting for learn-mode learner feedback before committing/ticking slice 1.

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2, try chat/companion interactions and visual direction; feedback can shape remaining surfaces.
- [ ] Final kick-the-tires exploration and feedback completed — after slice 4, explore the complete journey and report findings.

In learn mode, every slice also pauses for its Learner check. In fast mode, the setup step still needs the learner's local key configuration, followed by the planned early and final app checkpoints.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

Agreed refinements will be recorded here, implemented, mechanically verified, committed, and retried before marking completion.

## Code Tour and App Map

- [ ] Learning activity complete — follow one actual check-in or human-message action through two or three code locations after final revisions
- [ ] Optional edit and transfer reflection addressed — offer a small safe edit or brief transfer reflection, without requiring either
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not started.
Route and stops: choose actual final code locations after implementation.
Edit outcome: not offered yet.
Reflection: not offered yet; personal responses belong only in the ignored profile.
Activity mode: planned guided route in the live app and editor.

## Revisions

- Gemini SDK 2.31.0 uses the steps-based Interactions input contract: the planned turn-list input failed with HTTP 400. Switched to delimited JSON-string conversation input and explicit JSON response_format/schema; model/provider and product behavior remain unchanged. Live generation confirms the correction.
