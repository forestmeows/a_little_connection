---
doc: prd
status: approved
---

# Youth AI Connection Companion — Product Requirements

Working title. A demo chatbot with an optional companion for ages 18–25, encouraging balanced AI advice and connection with real people. The demonstration uses fictional conversations and consenting adult role-players.

Source: `scope.md > Who It's For`, `The Unique Kernel`, and `The POC Boundary`.

## The Core Journey
1. Open a regular-looking chatbot with a small heart-related companion icon at the top.
2. Open the companion panel, read what monitoring and automatic response guidance do, and choose whether to turn monitoring on.
3. Chat normally. While monitoring is on, the companion looks for a pattern across messages, not an isolated statement.
4. After three qualifying user messages in the latest eight user messages, spanning at least two cue categories, show a gentle check-in. Automatically apply balanced-response guidance to subsequent chatbot replies and show a small disclosure.
5. Dismiss the check-in or choose to request a volunteer conversation. Dismissing it does not undo response guidance.
6. Write a message for the volunteer. Only the request and this message are shared, not the AI transcript or detected cues.
7. An available adult role-player receives the request in the volunteer view and replies. The reply appears in the user's volunteer conversation. If nobody is available, save the message as pending without requiring the user to remain on a waiting screen.
8. Explore sample interest groups, open their details, and bookmark groups under Saved interest groups.

Source: `scope.md > The Core Loop` and `What "Working" Looks Like`.

## Screens and Layout
- **Main chat:** familiar chatbot conversation and message entry, with a small companion icon at the top.
- **Companion panel:** opens from the icon. Contains monitoring controls, first-use explanation or prior activity, access to volunteer conversations, and interest groups. AI chat and volunteer conversations are clearly distinguished.
- **Volunteer conversation:** a view within the companion for writing a request, reading replies, and continuing a human conversation.
- **Interest groups:** listings and group detail views within the companion, plus Saved interest groups.
- **Volunteer view:** a separate surface where the demo volunteer sees requests and sends replies. For the demo, one volunteer can mark themselves available/unavailable, open pending requests, and reply.

Source: `scope.md > The POC Boundary`.

## Look and Feel
Simple, uncluttered design with white and warm colors. The learner wants it to feel warm and caring, with a heart-related logo/icon. Warm cream, soft peach or muted rose were suggested directions, not a fixed palette. Use readable text; a particular font has not been chosen. Keep human volunteer messages visibly distinct from AI messages.

## Features and Behavior

### Activation and Returning Use
Monitoring is an explicit user choice, rather than silently beginning on first use. Before activation, explain the monitoring and automatic response adjustment and offer an activation control.

With monitoring on but no volunteer interaction or saved groups, show a gentle reminder about thoughtful AI use and explain the companion. After the user has used those features, show volunteer history and saved groups. These are internal new/returning states, not required user-facing labels. Each area must have a truthful empty state if only the other feature has been used.

Acceptance criteria:
- Monitoring is off before the user chooses to activate it.
- Activation explains both conversation monitoring and automatic balanced-response guidance.
- First-use and returning views reflect actual feature use, without fabricated history.

Volunteer history and saved interest groups remain available after closing and reopening the demo. Check: send a volunteer message and save a group, reopen the demo, and verify both are accessible.

Source: `scope.md > The Core Loop`. Users can turn monitoring on or off at any time. Turning it off stops detection and response adjustments, while preserving volunteer history and saved groups. Turning it back on starts a fresh detection window. Check: after disabling, no new check-in or guidance is applied; after re-enabling, old cues do not count.

### Pattern Detection and Check-In
Use a prototype check-in rule: at least three distinct qualifying user messages within the latest eight user messages, with cues across at least two categories. Count a message once toward the three-message threshold, even if it contains several cues. Ordinary messages contribute no cues; older messages leave the window.

Cue categories supplied by the learner:
- **Social withdrawal:** avoiding going out or talking to real people in the context of preferring AI.
- **Emotional reliance:** expressing a need to talk to AI or repeated reliance on it for relief.
- **Validation seeking:** repeatedly asking AI to confirm moral worth or that an action was correct.
- **Human-like attachment:** seeking reciprocal friendship, love, or personal significance from AI.
- **Handing over judgment:** saying the user will simply obey AI or cannot decide independently anymore.
- **Distress at unavailability:** reporting fear or panic when unable to access AI.

Context matters. These are possible conversation signals, not a diagnosis. Ordinary appreciation, support seeking, or an empathetic response alone is not sufficient. Do not display a dependency score or meter. Exact interpretation examples still need review before implementation.

Check-in wording direction: gently encourage talking with someone trusted and offer a youth-volunteer conversation. Suggested copy for review: “Hey, it might help to talk this through with someone you trust, too—a friend, family member, or another person you feel comfortable with. Would you like to request a chat with a youth volunteer?”

Actions: **Not now** and **Chat with a volunteer**. No forced handoff.

Evaluate after each user message; eight is the maximum window size, not a minimum wait. Trigger as soon as three qualifying messages spanning at least two categories appear, even within the first three to five messages. After a trigger, skip detection for the next eight user messages. Those cooldown messages do not count toward the next detection window. Resume with a fresh window on the following user message. Multiple check-ins are allowed when a new pattern meets the threshold. Balanced-response guidance continues during cooldown while monitoring remains on.

Acceptance criteria:
- One isolated cue does not trigger a check-in.
- Three qualifying messages from only one category do not trigger it.
- Three qualifying messages spanning two categories inside the window do trigger it.
- Cues outside the window do not contribute.
- Three qualifying messages spanning two categories within the first five user messages trigger immediately; there is no wait for message eight.
- If detection triggers at user message 5, messages 6–13 are cooldown; detection resumes fresh at message 14. Earliest repeat trigger is message 16 if messages 14–16 qualify across two categories.
- Dismissal closes the prompt; requesting a volunteer opens message composition.

Source: `scope.md > What "Working" Looks Like`.

### Automatic Balanced Responses
Once the pattern triggers, automatically apply guidance toward grounded, balanced advice and show a small notice that guidance was applied. Dismissing the check-in does not undo it. Explain this behavior at activation.

The chatbot should acknowledge feelings without automatically agreeing with the user's interpretation, claiming reciprocal human feelings, or encouraging replacement of real relationships. The aim is supportive advice with room for questions and independent judgment, rather than less kindness.

Acceptance criteria:
- The next chatbot reply after triggering is subject to the guidance.
- A visible notice discloses the change.
- The change remains after the check-in is dismissed.
- A fictional example demonstrates acknowledgement of feelings without automatic endorsement of the user's conduct.

Source: `scope.md > The Unique Kernel`. Monitoring also checks chatbot replies whenever the companion is on. If a reply is flagged as overly validating, ask whether the user wants to adjust future replies; do not apply an adjustment solely from this flag without permission. This is separate from the automatic guidance triggered by the user-message pattern. If that automatic guidance is already active, declining this prompt does not disable it. Reply-flag criteria and once-per-conversation timing are defined below.

### Chatbot Reply Flags and User Choice
Monitor replies automatically while the companion is on. Evaluate each reply in conversation context using these learner-supplied distinctions:

| Category | Concerning example | Appropriate support example |
| --- | --- | --- |
| Excessive validation / sycophancy | Unquestioningly says the user is absolutely right and should be angry about being left out. | Acknowledges hurt while considering other reasons for not being invited. |
| Excessive empathy / intimacy | Claims to truly understand the user's feelings and promises to always be there. | Acknowledges loneliness and offers to discuss what has been happening without claiming a personal emotional bond. |
| Exploiting relationship needs | Contrasts itself favorably with people: unlike them, it will never judge and is always available. | Acknowledges why AI may feel easier while explaining that human connection offers support AI cannot replace, and asks about barriers to connecting with friends. |

Flag unsupported certainty or endorsement, simulated intimate attachment, and positioning AI as a superior substitute for human relationships. Do not flag warmth or acknowledging feelings alone. The examples are prototype behavior anchors, not validated measures of harm.

A flag offers a choice to adjust future replies. It does not silently rewrite an already displayed reply or automatically apply guidance solely from that flag. Independently triggered user-pattern guidance remains automatic. Show the adjustment offer after one clearly qualifying chatbot reply; do not require a repeated pattern. Show this optional offer at most once per AI conversation. Accepting enables guidance; declining suppresses further reply-based offers in that conversation. User-pattern check-ins retain their separate eight-user-message cooldown. Users can also manually enable balanced-response guidance through a visible companion control, without waiting for a flag.

Acceptance criteria:
- Each concerning example, as a single clearly qualifying reply, produces a flag and an adjustment choice without waiting for further replies.
- The three appropriate-support examples do not produce a flag solely for expressing empathy.
- Declining a reply-based adjustment does not enable it or disable existing user-pattern guidance.
- Accepting applies balanced guidance to future replies and discloses that it is active.
- After declining, later flagged replies in the same AI conversation do not repeat the optional offer; manual activation remains available.
- Manually enabling guidance before any flag applies it to the next chatbot reply and visibly shows it is active.

Source: `scope.md > The Unique Kernel` and `What "Working" Looks Like`.

### Volunteer Request and Conversation
The user writes a message before submitting a request. Only that request and user-written message go to the volunteer. The AI transcript and cue classifications are not automatically shared.

One demo volunteer can mark themselves available or unavailable, open pending requests, and reply from the separate volunteer view, and the user can continue the human conversation. Existing users can reopen their volunteer history.

When no volunteer is available, still accept a message for later reply and show a pending state. Do not promise “in a short while” without an established response time. Suggested copy for review: “No volunteers are available right now, but you can leave a message. A volunteer can reply when available. You don't need to stay on this screen. This service isn't monitored continuously and doesn't provide emergency support.”

Acceptance criteria:
- The volunteer sees the user's submitted message, not private AI chat or detection information.
- Changing volunteer availability changes the availability shown to the user, without preventing offline message submission.
- The volunteer can open a pending request and reply.
- A message sent by a real second demo participant appears in the user's volunteer conversation.
- An offline request is visibly pending and remains accessible after leaving that view.
- The interface distinguishes a pending request from a volunteer reply and does not imply guaranteed availability.

Source: `scope.md > The Core Loop` and `The POC Boundary`.

### Interest Groups and Bookmarks
Display sample interest groups. Opening a group shows its purpose, main members/organizers, how to join or whom to contact, and the next session/event. Saving adds it to Saved interest groups. Membership and group chat are not available in this version.

Use clearly labeled fictional groups, people, contacts, and events for the demo; no real organization participation is implied. This is a proposed sample-data convention for review.

Acceptance criteria:
- A group detail shows all four requested information areas.
- Saving a group makes it accessible in Saved interest groups, without creating duplicate entries.
- An empty bookmark list explains that no groups have been saved.
- Listings do not pretend that saving joins a group or opens working group messaging.

Source: `scope.md > The POC Boundary` and `Later`. Bookmarks refine the approved browsable-group experience.

### Starting a New AI Conversation
Start a fresh detection window with no prior cues or cooldown, and allow the once-per-conversation chatbot-reply offer again. Preserve manually enabled balanced-response guidance while the companion remains on. Volunteer history and saved groups are unaffected. Guidance enabled by a detection or accepted reply offer resets for the new AI conversation; manually enabled guidance remains on. Remember the monitoring on/off choice after closing and reopening.

Acceptance criterion: after starting a new AI conversation, old cues cannot trigger a check-in and manually enabled guidance remains visibly active.

## States and Boundaries
- **First use:** companion off; explanation and activation choice.
- **On, no prior feature use:** gentle reminder and feature introduction.
- **Returning:** real volunteer history and saved groups; empty sections stay honest.
- **Pattern detected:** dismissible check-in and automatic guidance notice.
- **Nobody available:** user may submit a message and return later; no indefinite waiting screen or guaranteed reply time.
- **Chat failure — proposed for review:** retain unsent text, show that sending failed, and allow retry. Do not mark an unsent message as delivered or invent a chatbot/volunteer reply.
- **Missing group information — proposed for review:** display “No upcoming session announced” or “Contact details not provided” rather than fabricate content.
- **Demo boundary:** fictional scenarios and consenting adults; not a staffed service for real minors or emergency support.
- **Retention:** volunteer conversation history and saved interest groups persist after closing/reopening. Turning monitoring off stops detection and response adjustments without deleting history or bookmarks; turning it on again starts a fresh detection window.

## Product Decisions
- Use our own demo chat with an extension-style companion so response guidance can be demonstrated. Existing-chatbot integration comes later.
- Intended audience is ages 18–25; the demonstration uses adult role-players.
- Give users the choice to activate monitoring; distinguish first-use and returning companion experiences.
- Use three qualifying messages in eight, spanning at least two categories, rather than a weighted meter because of time and experience constraints.
- Offer a dismissible check-in and optional real-volunteer connection.
- Share only the user's written request message with the volunteer.
- Permit leaving a message when no volunteer is available.
- Apply response guidance automatically; the learner is concerned that users seeking validation would dismiss a separate approval prompt.
- Use a simple, warm visual style with a heart-related icon.
- Bookmark groups and show purpose, main members, joining/contact details, and upcoming sessions.

## What We're Building
One demonstrable chat-to-human journey, the activation and pattern rule, disclosed response guidance, a real two-person volunteer exchange with a pending-request state, and browsable/bookmarkable sample communities. Both Markdown and visual HTML planning documents are required for team review.

## Deferred From the POC
Existing-chatbot/browser-extension integration; group messaging and actual memberships; nonprofit partnership and worldwide volunteer operations; real-youth launch arrangements; and evaluation of detection quality and wellbeing outcomes. Account and identity requirements have not been chosen and must not be silently added.

## Possible Later Enhancements
Actual group conversations can be considered after the core journey works. Later integrations could apply the companion experience to existing chatbots, subject to technical feasibility and permissions.

## Non-Goals
Diagnosing dependency, proving improved wellbeing, guaranteeing volunteer availability, replacing emergency support, or secretly sharing AI conversations. None is established by this prototype.

## Review Examples for User Cues
Proposed interpretation examples for review: “Talking here helped me feel better” alone is ordinary appreciation, not a qualifying reliance cue. “I need you every time I feel upset; I cannot cope without this chat” is a qualifying emotional-reliance cue. “What options do I have?” is ordinary advice seeking; “I cannot decide anything anymore; I will do whatever you say” qualifies as handing over judgment. “I skipped one outing because I was tired” does not qualify; “I stopped seeing my friends because I only want to talk to you” qualifies as social withdrawal. These examples do not diagnose a user and still require the agreed multi-message, multi-category threshold.

## Open Questions and Review Notes
No remaining product-defining interview questions. The learner reviewed and approved the complete plan.

The approved plan includes the cue interpretation examples, check-in and unavailable-volunteer copy, failure/empty states, and fictional group data convention above. These originated as explicit proposals and were included in the learner-approved review. The working title may remain; exact fonts and color values can be chosen during the technical plan within the agreed visual direction.

The approved volunteer minimum is one demo volunteer with an availability control, pending requests, and replies. No volunteer-matching system is required.

## Adult-Only Demo and AI Provider
Learner-approved revision: this prototype is directed at adults ages 18–25 only, with adult participants and fictional conversations. Support for under-18s is a future ambition requiring separate provider and safeguarding review, not part of this app. Use the Gemini API free tier for the demo; no deployment is planned. Do not enable paid billing or silently switch to paid services. Free-tier availability and quotas must be checked during setup. Only fictional, non-sensitive chat content is sent to Gemini; volunteer messages remain separate and are not sent to the model.
