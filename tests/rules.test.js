import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, newConversation, setMonitoring, consumeUserCue, guidanceActive, considerReply, resolveReplyOffer } from '../server/rules.js';
function add(s, categories) {
  const id = String(s.conversation.messages.length + 1);
  s.conversation.messages.push({ id, role: 'user' });
  return consumeUserCue(s, id, categories);
}
function enabled() { const s = initialState(); setMonitoring(s, true); return s; }
test('three distinct messages in two categories trigger before eight messages', () => {
  const s = enabled();
  assert.equal(add(s, ['emotional_reliance', 'social_withdrawal']), false);
  assert.equal(add(s, ['emotional_reliance']), false);
  assert.equal(add(s, ['emotional_reliance']), true);
  assert.equal(s.conversation.cooldown, 8);
  assert.equal(guidanceActive(s), true);
  s.conversation.checkIn = false;
  assert.equal(guidanceActive(s), true);
});
test('one category alone and aged-out cues do not trigger', () => {
  const s = enabled();
  for (let i = 0; i < 10; i++) assert.equal(add(s, ['emotional_reliance']), false);
  const t = enabled();
  add(t, ['social_withdrawal']);
  for (let i = 0; i < 7; i++) add(t, []);
  assert.equal(add(t, ['emotional_reliance']), false);
  assert.equal(t.conversation.window.length, 8);
  assert.equal(t.conversation.window.some(m => m.categories.includes('social_withdrawal')), false);
});
test('exactly eight cooldown messages are excluded then fresh detection resumes', () => {
  const s = enabled();
  add(s, []); add(s, []); add(s, ['emotional_reliance']); add(s, ['social_withdrawal']);
  assert.equal(add(s, ['emotional_reliance']), true); // user 5
  for (let i = 0; i < 8; i++) assert.equal(add(s, ['social_withdrawal']), false); // 6–13
  assert.equal(s.conversation.cooldown, 0);
  assert.equal(s.conversation.window.length, 0);
  assert.equal(add(s, ['emotional_reliance']), false); // 14
  assert.equal(add(s, ['social_withdrawal']), false); // 15
  assert.equal(add(s, ['emotional_reliance']), true); // 16
});
test('retry cannot advance a threshold or cooldown twice', () => {
  const s = enabled(); add(s, ['emotional_reliance']);
  consumeUserCue(s, '1', ['social_withdrawal']);
  assert.equal(s.conversation.window.length, 1);
  add(s, ['social_withdrawal']); add(s, ['emotional_reliance']);
  consumeUserCue(s, '3', []);
  assert.equal(s.conversation.cooldown, 8);
});
test('off clears guidance and cues; new chat retains only manual guidance', () => {
  const s = enabled(); s.settings.manualGuidance = true;
  s.conversation.patternGuidance = true; s.conversation.acceptedGuidance = true;
  s.conversation = newConversation();
  assert.equal(guidanceActive(s), true);
  assert.equal(s.conversation.patternGuidance, false);
  setMonitoring(s, false); setMonitoring(s, true);
  assert.equal(guidanceActive(s), false);
  assert.equal(s.conversation.window.length, 0);
});
test('reply-based offer appears once and declining does not disable pattern guidance', () => {
  const s = enabled(); considerReply(s, true);
  assert.equal(s.conversation.replyOffer, 'pending');
  resolveReplyOffer(s, false); considerReply(s, true);
  assert.equal(s.conversation.replyOffer, 'declined');
  s.conversation.patternGuidance = true; resolveReplyOffer(s, false);
  assert.equal(guidanceActive(s), true);
  const t = enabled(); considerReply(t, true); resolveReplyOffer(t, true);
  assert.equal(guidanceActive(t), true);
});
