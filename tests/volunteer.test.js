import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.js';
import { createRoutes } from '../server/routes.js';

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'companion-human-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'data.json'), store = await createStore(path);
  let modelCalls = 0;
  const route = createRoutes(store, () => { modelCalls++; throw new Error('Human chat must not call Gemini'); });
  return { path, store, route, calls: () => modelCalls };
}
test('offline request receives a real reply and human history survives restart', async t => {
  const { path, route, calls } = await setup(t);
  let s = await route('POST', '/api/volunteer/request', { requestId:'human-1', text:'Fictional: I would like to talk about photography.' });
  assert.equal(s.volunteerAvailable, false);
  const threadId = s.humanThreads[0].id;
  assert.equal(s.humanThreads[0].status, 'pending');
  await route('POST', '/api/volunteer/availability', { available:true });
  const volunteer = await route('GET', '/api/volunteer');
  assert.equal(volunteer.available, true);
  assert.equal(volunteer.threads[0].messages[0].text, 'Fictional: I would like to talk about photography.');
  await route('POST', '/api/volunteer/accept', { threadId });
  await route('POST', '/api/volunteer/message', { threadId, requestId:'reply-1', role:'volunteer', text:'I enjoy photography too. What do you like taking pictures of?' });
  s = await route('GET', '/api/user');
  assert.equal(s.humanThreads[0].status, 'active');
  assert.equal(s.humanThreads[0].messages.at(-1).sender, 'volunteer');
  assert.equal(calls(), 0);
  const restarted = await createStore(path);
  assert.equal(restarted.read().humanThreads[0].messages.length, 2);
  assert.equal(restarted.read().volunteerAvailable, false);
});
test('volunteer reads exclude AI transcript, cue information, and user settings', async t => {
  const { route, store } = await setup(t);
  await store.mutate(s => { s.conversation.messages.push({id:'private-ai',text:'PRIVATE AI CONTENT',role:'user'}); s.conversation.window.push({id:'private-ai',categories:['emotional_reliance']}); });
  await route('POST', '/api/volunteer/request', { requestId:'public-1', text:'Only this message is shared.' });
  const result = JSON.stringify(await route('GET', '/api/volunteer'));
  assert.ok(result.includes('Only this message is shared.'));
  for (const secret of ['PRIVATE AI CONTENT', 'emotional_reliance', 'monitoringOn', 'conversation']) assert.ok(!result.includes('"' + secret + '"'));
  assert.ok(!result.includes('PRIVATE AI CONTENT'));
});
test('retries are idempotent and a request ID cannot be reused for other text', async t => {
  const { route } = await setup(t);
  const body = { requestId:'human-duplicate', text:'Fictional hello' };
  await route('POST', '/api/volunteer/request', body);
  const s = await route('POST', '/api/volunteer/request', body);
  assert.equal(s.humanThreads.length, 1);
  const message = { threadId:s.humanThreads[0].id,requestId:'reply-duplicate',role:'volunteer',text:'Hello back' };
  await route('POST', '/api/volunteer/availability', {available:true});
  await route('POST', '/api/volunteer/accept', {threadId:message.threadId});
  await route('POST','/api/volunteer/message',message);
  await route('POST','/api/volunteer/message',message);
  const result = await route('GET','/api/user');
  assert.equal(result.humanThreads[0].messages.length,2);
  await assert.rejects(route('POST','/api/volunteer/message',{...message,text:'Changed'}), {status:409});
});

test('availability and explicit acceptance are required for new volunteer replies', async t => {
  const { route } = await setup(t);
  const first = await route('POST','/api/volunteer/request',{requestId:'accept-1',text:'First request'});
  const threadId = first.humanThreads[0].id;
  const reply = {threadId,requestId:'accept-reply',role:'volunteer',text:'Hello'};
  await assert.rejects(route('POST','/api/volunteer/accept',{threadId}),{status:409});
  await assert.rejects(route('POST','/api/volunteer/message',reply),{status:409});
  await route('POST','/api/volunteer/availability',{available:true});
  await assert.rejects(route('POST','/api/volunteer/message',reply),{status:409});
  await route('POST','/api/volunteer/accept',{threadId});
  await route('POST','/api/volunteer/availability',{available:false});
  await assert.rejects(route('POST','/api/volunteer/message',reply),{status:409});
  await route('POST','/api/volunteer/availability',{available:true});
  await route('POST','/api/volunteer/message',reply);
  const s = await route('GET','/api/user');
  assert.equal(s.humanThreads[0].messages.length,2);
});

test('several pending requests can be accepted independently and remain isolated', async t => {
  const { route, path } = await setup(t);
  await route('POST','/api/volunteer/request',{requestId:'multi-1',text:'Photography request'});
  const s = await route('POST','/api/volunteer/request',{requestId:'multi-2',text:'Music request'});
  const [one,two] = s.humanThreads;
  await route('POST','/api/volunteer/availability',{available:true});
  await route('POST','/api/volunteer/accept',{threadId:one.id});
  let result = await route('GET','/api/user');
  assert.deepEqual(result.humanThreads.map(t=>t.status),['active','pending']);
  await assert.rejects(route('POST','/api/volunteer/message',{threadId:two.id,requestId:'too-early',role:'user',text:'Follow-up'}),{status:409});
  await route('POST','/api/volunteer/accept',{threadId:two.id});
  await route('POST','/api/volunteer/message',{threadId:two.id,requestId:'music-reply',role:'volunteer',text:'Music only reply'});
  result = (await createStore(path)).read();
  assert.equal(result.humanThreads[0].messages.length,1);
  assert.equal(result.humanThreads[1].messages.at(-1).text,'Music only reply');
  assert.ok(result.humanThreads.every(t=>t.status==='active'));
});
test('concurrent local saves do not overwrite human messages or monitoring settings', async t => {
  const { route } = await setup(t);
  await Promise.all([
    route('POST','/api/volunteer/request',{requestId:'concurrent-1',text:'First fictional message'}),
    route('POST','/api/volunteer/request',{requestId:'concurrent-2',text:'Second fictional message'}),
    route('POST','/api/settings',{monitoringOn:true}),
  ]);
  const s = await route('GET','/api/user');
  assert.equal(s.humanThreads.length,2);
  assert.equal(s.settings.monitoringOn,true);
});
