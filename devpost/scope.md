---
doc: scope
status: approved
---

# Youth AI Connection Companion (working title)

A demo chatbot with an extension-style companion that notices possible emotional reliance on AI and helps users connect with real people.

## The Unique Kernel
Pair a transparent adjustment toward balanced chatbot advice with an optional handoff to a real human volunteer. The aim is to increase human connections, rather than leave another model as the only source of support.

## Who It's For
Young people ages 18–25 seeking emotional or moral advice from AI, especially when they begin preferring its advice over conversations with people they know. The envisioned service involves a nonprofit with youth volunteers; no partnership is established.

## The Core Loop
The user chats in our demo. A pattern such as repeatedly preferring AI over friends prompts a gentle check-in, with a choice to seek human connection. The user can start a volunteer conversation, while a real person replies from a separate volunteer view. Interest-based community listings offer another route to exploring connections.

## Inspiration & Identity
The learner's example combines statements such as “your responses are so much better than what my friends say” with repeated chatbot agreement. The intended intervention is gentle and transparent. Visual style is not yet decided.

## Why This Matters to the Learner
The learner is concerned about youths relying on AI for emotional support and wants a working product that increases connections with real humans.

## What "Working" Looks Like
A short end-to-end screen demonstration uses a fictional conversation to trigger a check-in. Additional guidance shapes the next chatbot reply toward grounded advice without automatic agreement, and a small notice explains that guidance was applied. The user chooses a volunteer handoff; a second consenting adult, acting as a volunteer, receives the request and sends a real reply visible to the user. The user can also browse sample interest communities.

This proves the interaction and human handoff, not that the system reliably diagnoses overdependence or improves wellbeing. Detection signals and response limits need definition in the PRD. A single appreciative phrase or empathetic response is insufficient evidence by itself.

## The POC Boundary
- Our own working demo chat with an extension-style companion panel.
- Demonstrable detection of a defined conversation pattern and a gentle, dismissible check-in.
- Additional guidance for balanced chatbot replies, with user-facing disclosure.
- Optional text conversation with a real person through separate user and volunteer views.
- Browsable sample interest communities; no working membership or group messaging required.
- Fictional conversations and consenting adults role-playing the demo; no live youth-service launch or real nonprofit staffing.
- Planning documents, public code repository, and a short demo video for submission; deployment is optional.

## Later
- A browser extension integrated with existing chatbot websites; feasibility remains to be investigated.
- Actual community participation and group conversations, including optional anonymity. Group conversations are a stretch goal only after the main journey works.
- A nonprofit partnership and operational volunteer service, with age-appropriate safeguarding, privacy, moderation, and staffing arrangements before use with real youths.
- Evaluation of detection accuracy and whether interventions help users connect with people.

## Explicitly Cut
- A production service for minors during this proof of concept: the demo does not establish the operational arrangements needed.
- Claims of diagnosing dependency, preventing harm, or proving improved wellbeing: this prototype cannot establish those outcomes.
- Automatic changes to third-party chatbot backends in the first version: our own chat lets the response-guidance interaction work without depending on unverified access.


## Adult-Only Demo and AI Provider
Learner-approved revision: this prototype is directed at adults ages 18–25 only, with adult participants and fictional conversations. Support for under-18s is a future ambition requiring separate provider and safeguarding review, not part of this app. Use the Gemini API free tier for the demo; no deployment is planned. Do not enable paid billing or silently switch to paid services. Free-tier availability and quotas must be checked during setup. Only fictional, non-sensitive chat content is sent to Gemini; volunteer messages remain separate and are not sent to the model.
