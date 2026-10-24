import { randomUUID } from 'node:crypto';
import { newConversation, setMonitoring, guidanceActive, consumeUserCue, considerReply, resolveReplyOffer } from './rules.js';
import { safeModelError } from './gemini.js';
import groups from '../public/groups.json' with { type: 'json' };

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function text(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 6000) throw new HttpError(400, 'Enter a message between 1 and 6,000 characters.');
  return value.trim();
}
function id(value) {
  if (typeof value !== 'string' || !/^[\w-]{1,100}$/.test(value)) throw new HttpError(400, 'Invalid request identifier.');
  return value;
}
export function userView(state) {
  return { ...state, groups, conversation: { ...state.conversation, window: undefined,
    messages: state.conversation.messages.map(({ cueProcessed, ...m }) => m) }, guidanceActive: guidanceActive(state) };
}

export function createRoutes(store, modelFactory) {
  const pending = new Map();
  const view = () => userView(store.read());
  async function sendChat(body) {
    const requestId = id(body.requestId), conversationId = id(body.conversationId), content = text(body.text);
    const before = store.read();
    if (before.conversation.id !== conversationId) throw new HttpError(409, 'This conversation has changed. Reload and try again.');
    const existing = before.conversation.messages.find(m => m.requestId === requestId && m.role === 'user');
    if (existing && existing.text !== content) throw new HttpError(409, 'This request identifier belongs to another message.');
    if (existing?.status === 'complete') return view();
    if (pending.has(conversationId)) throw new HttpError(409, 'Please wait for the current reply before sending again.');
    const job = (async () => {
      const gemini = modelFactory();
      let messageId;
      await store.mutate(s => {
        const old = s.conversation.messages.find(m => m.requestId === requestId && m.role === 'user');
        if (old) { messageId = old.id; old.status = 'sending'; old.error = null; }
        else {
          messageId = randomUUID();
          s.conversation.messages.push({ id: messageId, role: 'user', text: content, requestId, status: 'sending', at: new Date().toISOString() });
        }
      });
      try {
        let snapshot = store.read(), epoch = snapshot.conversation.epoch;
        const target = snapshot.conversation.messages.find(m => m.id === messageId);
        const context = snapshot.conversation.messages.filter(m => m.id !== messageId).slice(-16).map(m => ({ role: m.role, text: m.text }));
        let categories = [], monitoringError = null;
        if (snapshot.settings.monitoringOn && !target.cueProcessed && snapshot.conversation.cooldown === 0) {
          try { categories = (await gemini.classifyUser(content, context)).categories; }
          catch (error) { monitoringError = safeModelError(error).message; categories = null; }
        }
        await store.mutate(s => {
          if (s.conversation.id !== conversationId) return;
          const m = s.conversation.messages.find(m => m.id === messageId);
          if (s.conversation.epoch !== epoch) { m.cueProcessed = true; return; }
          consumeUserCue(s, messageId, categories);
          if (monitoringError) m.monitoringError = monitoringError;
        });
        snapshot = store.read();
        if (snapshot.conversation.id !== conversationId) return;
        epoch = snapshot.conversation.epoch;
        const wasBalanced = guidanceActive(snapshot);
        const messages = snapshot.conversation.messages.filter(m => m.role === 'assistant' || m.id === messageId || m.status === 'complete').map(m => ({ role: m.role, text: m.text }));
        const reply = await gemini.generate(messages, { balanced: wasBalanced });
        let assistantId;
        await store.mutate(s => {
          if (s.conversation.id !== conversationId) return;
          const m = s.conversation.messages.find(m => m.id === messageId);
          // Do not display a reply generated under a now-disabled guidance mode.
          if (s.conversation.epoch !== epoch || guidanceActive(s) !== wasBalanced) {
            m.status = 'failed'; m.error = 'Your companion settings changed. Retry to generate a reply with your current settings.'; return;
          }
          m.status = 'complete'; m.error = null;
          assistantId = randomUUID();
          s.conversation.messages.push({ id: assistantId, role: 'assistant', text: reply, at: new Date().toISOString(), balanced: wasBalanced });
        });
        if (assistantId && store.read().settings.monitoringOn) {
          try {
            const result = await gemini.classifyReply(reply, [...context, { role: 'user', text: content }]);
            await store.mutate(s => { if (s.conversation.id === conversationId && s.conversation.epoch === epoch) considerReply(s, result.flagged); });
          } catch (error) {
            await store.mutate(s => {
              if (s.conversation.id === conversationId && s.conversation.epoch === epoch) {
                const m = s.conversation.messages.find(m => m.id === assistantId);
                if (m) m.monitoringError = safeModelError(error).message;
              }
            });
          }
        }
      } catch (error) {
        await store.mutate(s => {
          if (s.conversation.id !== conversationId) return;
          const m = s.conversation.messages.find(m => m.id === messageId);
          if (m) { m.status = 'failed'; m.error = safeModelError(error).message; }
        });
      }
    })();
    pending.set(conversationId, job);
    try { await job; } finally { pending.delete(conversationId); }
    return view();
  }
  return async function route(method, path, body) {
    if (method === 'GET' && path === '/api/user') return view();
    if (method === 'GET' && path === '/api/volunteer') {
      const s = store.read();
      return { revision: s.revision, available: s.volunteerAvailable, threads: s.humanThreads };
    }
    if (method === 'POST' && path === '/api/chat') return sendChat(body);
    if (method !== 'POST') throw new HttpError(404, 'Not found.');
    if (path === '/api/bookmarks') {
      if (typeof body.saved !== 'boolean' || !groups.some(g => g.id === body.groupId)) throw new HttpError(400, 'Choose a valid interest group and save state.');
      await store.mutate(s => {
        const ids = new Set(s.bookmarks);
        if (body.saved) ids.add(body.groupId); else ids.delete(body.groupId);
        s.bookmarks = [...ids];
      });
      return view();
    } else if (path === '/api/volunteer/availability') {
      if (typeof body.available !== 'boolean') throw new HttpError(400, 'Choose available or unavailable.');
      await store.mutate(s => { s.volunteerAvailable = body.available; });
      return { available: store.read().volunteerAvailable, threads: store.read().humanThreads };
    } else if (path === '/api/volunteer/request') {
      const requestId = id(body.requestId), content = text(body.text);
      await store.mutate(s => {
        const prior = s.humanThreads.flatMap(t => t.messages).find(m => m.requestId === requestId);
        if (prior) {
          if (prior.text !== content || prior.sender !== 'user') throw new HttpError(409, 'This request identifier is already used.');
          return;
        }
        s.humanThreads.push({ id: randomUUID(), status: 'pending', createdAt: new Date().toISOString(),
          messages: [{ id: randomUUID(), requestId, sender: 'user', text: content, at: new Date().toISOString() }] });
      });
      return view();
    } else if (path === '/api/volunteer/accept') {
      const threadId = id(body.threadId);
      await store.mutate(s => {
        const thread = s.humanThreads.find(t => t.id === threadId);
        if (!thread) throw new HttpError(404, 'Request not found.');
        if (thread.status === 'active') return;
        if (!s.volunteerAvailable) throw new HttpError(409, 'Turn on your availability before accepting a request.');
        thread.status = 'active'; thread.acceptedAt = new Date().toISOString();
      });
      return { available: store.read().volunteerAvailable, threads: store.read().humanThreads };
    } else if (path === '/api/volunteer/message') {
      const requestId = id(body.requestId), threadId = id(body.threadId), content = text(body.text);
      if (!['user', 'volunteer'].includes(body.role)) throw new HttpError(400, 'Invalid message sender.');
      await store.mutate(s => {
        const thread = s.humanThreads.find(t => t.id === threadId);
        if (!thread) throw new HttpError(404, 'Conversation not found.');
        const prior = s.humanThreads.flatMap(t => t.messages).find(m => m.requestId === requestId);
        if (prior) {
          if (prior.text !== content || prior.sender !== body.role || !thread.messages.includes(prior)) throw new HttpError(409, 'This request identifier is already used.');
          return;
        }
        if (thread.status !== 'active') throw new HttpError(409, 'This request must be accepted before continuing the conversation.');
        if (body.role === 'volunteer' && !s.volunteerAvailable) throw new HttpError(409, 'Turn on your availability before replying.');
        thread.messages.push({ id: randomUUID(), requestId, sender: body.role, text: content, at: new Date().toISOString() });
      });
      return body.role === 'user' ? view() : { available: store.read().volunteerAvailable, threads: store.read().humanThreads };
    } else if (path === '/api/settings') {
      if (typeof body.monitoringOn !== 'boolean') throw new HttpError(400, 'Choose on or off.');
      await store.mutate(s => setMonitoring(s, body.monitoringOn));
    } else if (path === '/api/guidance') {
      if (body.enableManual !== true || !store.read().settings.monitoringOn) throw new HttpError(400, 'Turn on the companion before enabling guidance.');
      await store.mutate(s => { s.settings.manualGuidance = true; s.conversation.epoch++; if (s.conversation.replyOffer === 'pending') s.conversation.replyOffer = 'declined'; });
    } else if (path === '/api/chat/new') {
      await store.mutate(s => { s.conversation = newConversation(); });
    } else if (path === '/api/check-in/dismiss' || path === '/api/reply-offer') {
      if (body.conversationId !== store.read().conversation.id) throw new HttpError(409, 'Conversation changed.');
      if (path === '/api/reply-offer' && typeof body.accept !== 'boolean') throw new HttpError(400, 'Choose whether to accept.');
      await store.mutate(s => {
        if (path === '/api/check-in/dismiss') s.conversation.checkIn = false;
        else { resolveReplyOffer(s, body.accept); if (body.accept) s.conversation.epoch++; }
      });
    } else throw new HttpError(404, 'Not found.');
    return view();
  };
}
