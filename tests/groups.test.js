import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.js';
import { createRoutes } from '../server/routes.js';

test('sample group details, unique bookmarks, removal, and restart persistence', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'companion-groups-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'demo.json'), store = await createStore(path);
  const route = createRoutes(store, () => { throw new Error('Groups must not use Gemini'); });
  let s = await route('GET', '/api/user');
  assert.equal(s.bookmarks.length, 0);
  assert.ok(s.groups.length >= 3);
  for (const group of s.groups) {
    assert.equal(group.sample, true);
    for (const key of ['name', 'about', 'members', 'joining']) assert.equal(typeof group[key], 'string');
    if (group.contact) assert.match(group.contact, /example\.invalid/);
  }
  const groupId = s.groups[0].id;
  await Promise.all([route('POST','/api/bookmarks',{groupId,saved:true}), route('POST','/api/bookmarks',{groupId,saved:true})]);
  s = await route('GET','/api/user');
  assert.deepEqual(s.bookmarks,[groupId]);
  const restored = await createStore(path);
  assert.deepEqual(restored.read().bookmarks,[groupId]);
  await assert.rejects(route('POST','/api/bookmarks',{groupId:'unknown',saved:true}),{status:400});
  await assert.rejects(route('POST','/api/bookmarks',{groupId,saved:'yes'}),{status:400});
  await route('POST','/api/bookmarks',{groupId,saved:false});
  assert.deepEqual(store.read().bookmarks,[]);
});
