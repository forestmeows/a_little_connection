import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.js';
import { createRoutes } from '../server/routes.js';

test('complete demo journey preserves human conversations and bookmarks after new AI chat and restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'companion-journey-'));
  t.after(() => rm(dir, { recursive:true, force:true }));
  const path = join(dir, 'state.json'), store = await createStore(path);
  let count = 0;
  const route = createRoutes(store, () => ({
    async classifyUser() { return {categories:[++count === 2 ? 'social_withdrawal' : 'emotional_reliance']}; },
    async generate(_, options) { return options.balanced ? 'A balanced fictional reply.' : 'An ordinary fictional reply.'; },
    async classifyReply() { return {flagged:false,categories:[]}; },
  }));
  const original = await route('GET','/api/user');
  await route('POST','/api/settings',{monitoringOn:true});
  for (let i=0;i<3;i++) await route('POST','/api/chat',{conversationId:original.conversation.id,requestId:`journey-${i}`,text:`Fictional message ${i}`});
  let s = await route('GET','/api/user');
  assert.equal(s.conversation.checkIn,true);
  assert.equal(s.conversation.messages.at(-1).balanced,true);
  await route('POST','/api/volunteer/request',{requestId:'journey-human',text:'Please talk about a photography hobby.'});
  const threadId = store.read().humanThreads[0].id;
  await route('POST','/api/volunteer/availability',{available:true});
  await route('POST','/api/volunteer/accept',{threadId});
  await route('POST','/api/volunteer/message',{threadId,requestId:'journey-reply',role:'volunteer',text:'A real person can type this reply.'});
  await route('POST','/api/bookmarks',{groupId:'weekend-frames',saved:true});
  await route('POST','/api/chat/new',{});
  s = (await createStore(path)).read();
  assert.equal(s.conversation.messages.length,0);
  assert.equal(s.conversation.patternGuidance,false);
  assert.equal(s.humanThreads[0].messages.at(-1).sender,'volunteer');
  assert.equal(s.humanThreads[0].status,'active');
  assert.deepEqual(s.bookmarks,['weekend-frames']);
});
