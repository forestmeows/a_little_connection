import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.js';
import { createStore } from '../server/store.js';
import { createRoutes } from '../server/routes.js';

async function setup(t, factory) {
  const dir = await mkdtemp(join(tmpdir(), 'companion-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'demo.json');
  const store = await createStore(path);
  const route = createRoutes(store, factory);
  return { path, store, route };
}
test('retry saves one user message and classifies it only once', async t => {
  let classifications = 0, generations = 0;
  const model = { async classifyUser() { classifications++; return { categories: ['emotional_reliance'] }; },
    async generate() { if (++generations === 1) throw new Error('offline'); return 'Reply'; },
    async classifyReply() { return { flagged: false, categories: [] }; } };
  const { route, store } = await setup(t, () => model);
  await route('POST', '/api/settings', { monitoringOn: true });
  const body = { conversationId: store.read().conversation.id, requestId: 'same-request', text: 'Fictional message' };
  let s = await route('POST', '/api/chat', body);
  assert.equal(s.conversation.messages[0].status, 'failed');
  s = await route('POST', '/api/chat', body);
  assert.equal(s.conversation.messages.length, 2);
  assert.equal(classifications, 1);
  assert.equal(s.conversation.messages[0].status, 'complete');
});
test('activation and active conversation persist after reopening store', async t => {
  const { route, store, path } = await setup(t, () => ({ async generate() { return 'Hello'; } }));
  await route('POST', '/api/guidance', { enableManual: true }).catch(e => assert.equal(e.status, 400));
  await route('POST', '/api/settings', { monitoringOn: true });
  await route('POST', '/api/guidance', { enableManual: true });
  const restored = await createStore(path);
  assert.equal(restored.read().settings.monitoringOn, true);
  assert.equal(restored.read().settings.manualGuidance, true);
  assert.equal(restored.read().conversation.id, store.read().conversation.id);
});
test('turning off while classification runs discards its stale result', async t => {
  let resolveCue, started;
  const seen = new Promise(resolve => { started = resolve; });
  const model = { async classifyUser() { started(); return new Promise(resolve => { resolveCue = resolve; }); },
    async generate(_, options) { assert.equal(options.balanced, false); return 'Reply'; },
    async classifyReply() { throw new Error('must not monitor when off'); } };
  const { route, store } = await setup(t, () => model);
  await route('POST', '/api/settings', { monitoringOn: true });
  const job = route('POST', '/api/chat', { conversationId: store.read().conversation.id, requestId: 'race', text: 'Fictional' });
  await seen;
  await route('POST', '/api/settings', { monitoringOn: false });
  resolveCue({ categories: ['emotional_reliance'] });
  await job;
  assert.equal(store.read().conversation.window.length, 0);
  assert.equal(store.read().conversation.checkIn, false);
});
test('local server serves the app but never credentials or runtime history', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'companion-http-'));
  const { server } = await createApp({ dataPath: join(dir, 'state.json'), modelFactory: () => ({}) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(url)).status, 200);
  for (const path of ['/.env', '/data/demo.json', '/server/gemini.js']) assert.equal((await fetch(url + path)).status, 404);
  assert.equal((await fetch(url + '/api/settings', { method: 'POST', headers: { 'Content-Type':'application/json', Origin:'https://other.example' }, body:'{"monitoringOn":true}' })).status, 403);
});
test('malformed saved data is not silently replaced', async t => {
  const { path } = await setup(t, () => ({}));
  await writeFile(path, '{broken');
  await assert.rejects(createStore(path), /has not been erased/);
});

test('third qualifying message applies guidance before generation; dismissal retains guidance', async t => {
  const balanced = []; let n = 0;
  const model = {
    async classifyUser() { return { categories: [++n === 2 ? 'social_withdrawal' : 'emotional_reliance'] }; },
    async generate(_, options) { balanced.push(options.balanced); return 'A reply'; },
    async classifyReply() { return { flagged: false, categories: [] }; },
  };
  const { route, store } = await setup(t, () => model);
  await route('POST', '/api/settings', { monitoringOn: true });
  const conversationId = store.read().conversation.id;
  for (let i = 0; i < 3; i++) await route('POST', '/api/chat', { conversationId, requestId: `threshold-${i}`, text: 'Fictional scenario' });
  assert.deepEqual(balanced, [false, false, true]);
  assert.equal(store.read().conversation.checkIn, true);
  const result = await route('POST', '/api/check-in/dismiss', { conversationId });
  assert.equal(result.conversation.checkIn, false);
  assert.equal(result.guidanceActive, true);
});
