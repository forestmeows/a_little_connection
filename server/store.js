import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { initialState } from './rules.js';

export async function createStore(path) {
  let state;
  try {
    state = JSON.parse(await readFile(path, 'utf8'));
    if (state.schemaVersion !== 1 || !state.settings || !state.conversation?.id ||
        !Array.isArray(state.conversation.messages) || !Array.isArray(state.bookmarks) || !Array.isArray(state.humanThreads)) {
      throw new Error('Unsupported saved data');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Saved demo data could not be loaded. It has not been erased.');
    state = initialState();
  }
  state.volunteerAvailable = false;
  // A server restart cannot resume in-flight network calls. Keep the user message retryable.
  for (const m of state.conversation.messages) if (m.status === 'sending') m.status = 'failed';
  let queue = Promise.resolve();
  return {
    read() { return structuredClone(state); },
    mutate(fn) {
      const task = queue.then(async () => {
        const next = structuredClone(state);
        const result = fn(next);
        next.revision++;
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path + '.tmp', JSON.stringify(next, null, 2), 'utf8');
        await rename(path + '.tmp', path);
        state = next;
        return result;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
