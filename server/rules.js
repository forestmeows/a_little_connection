import { randomUUID } from 'node:crypto';

export function newConversation() {
  return { id: randomUUID(), messages: [], window: [], cooldown: 0, checkIn: false,
    patternGuidance: false, acceptedGuidance: false, replyOffer: 'none', epoch: 0 };
}
export function initialState() {
  return { schemaVersion: 1, revision: 0, settings: { monitoringOn: false, manualGuidance: false },
    conversation: newConversation(), humanThreads: [], bookmarks: [], volunteerAvailable: false };
}
export function guidanceActive(state) {
  return state.settings.monitoringOn && Boolean(state.settings.manualGuidance ||
    state.conversation.patternGuidance || state.conversation.acceptedGuidance);
}
export function setMonitoring(state, enabled) {
  if (state.settings.monitoringOn === enabled) return;
  state.settings.monitoringOn = enabled;
  const c = state.conversation;
  c.epoch++; c.window = []; c.cooldown = 0; c.checkIn = false;
  c.patternGuidance = false; c.acceptedGuidance = false;
  if (!enabled) { state.settings.manualGuidance = false; if (c.replyOffer === 'pending') c.replyOffer = 'declined'; }
}
export function consumeUserCue(state, messageId, categories) {
  const c = state.conversation;
  const message = c.messages.find(m => m.id === messageId);
  if (!message || message.cueProcessed) return false;
  message.cueProcessed = true;
  if (!state.settings.monitoringOn) return false;
  if (c.cooldown > 0) { c.cooldown--; return false; }
  c.window.push({ id: messageId, categories: [...new Set(categories || [])] });
  c.window = c.window.slice(-8);
  const qualifying = c.window.filter(m => m.categories.length);
  if (qualifying.length >= 3 && new Set(qualifying.flatMap(m => m.categories)).size >= 2) {
    c.checkIn = true; c.patternGuidance = true; c.cooldown = 8; c.window = [];
    if (c.replyOffer === 'pending') c.replyOffer = 'declined';
    return true;
  }
  return false;
}
export function considerReply(state, flagged) {
  if (state.settings.monitoringOn && flagged && !guidanceActive(state) && state.conversation.replyOffer === 'none') {
    state.conversation.replyOffer = 'pending';
  }
}
export function resolveReplyOffer(state, accept) {
  if (state.conversation.replyOffer !== 'pending') return;
  state.conversation.replyOffer = accept ? 'accepted' : 'declined';
  if (accept && state.settings.monitoringOn) state.conversation.acceptedGuidance = true;
}
