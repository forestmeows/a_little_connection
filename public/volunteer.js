const $ = selector => document.querySelector(selector);
let state, selected, busy = false, signature = '', retryId;
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The local app could not complete this request.');
  return result;
}
function error(message) { $('#volunteer-error').textContent = message; $('#volunteer-error').hidden = !message; }
function node(tag, className, text) { const e = document.createElement(tag); e.className = className; if (text) e.textContent = text; return e; }
function render() {
  if (!state) return;
  $('#availability').checked = state.available;
  $('#availability-label').textContent = state.available ? 'Available for a conversation' : 'Unavailable · messages can wait';
  $('#request-count').textContent = `(${state.threads.length})`;
  if (!selected && state.threads.length) {
    selected = state.threads.find(t => t.status === 'pending')?.id || state.threads.at(-1).id;
  }
  $('#requests').replaceChildren();
  if (!state.threads.length) $('#requests').append(node('p', 'micro', 'No requests yet. A participant can send one from the companion panel.'));
  for (const thread of [...state.threads].reverse()) {
    const card = node('div', 'request-card' + (selected === thread.id ? ' selected' : ''));
    const button = node('button', 'request-select');
    button.type = 'button';
    button.disabled = busy;
    button.append(node('span', 'request-title', `Demo request ${state.threads.indexOf(thread) + 1}`));
    button.append(node('span', 'status-chip', thread.status === 'pending' ? 'Pending acceptance' : 'Accepted chat'));
    button.append(node('span', 'request-preview', thread.messages.at(-1).text.slice(0, 110)));
    button.onclick = () => { selected = thread.id; retryId = null; $('#volunteer-input').value = ''; signature = ''; render(); };
    card.append(button);
    if (thread.status === 'pending') {
      const accept = node('button', 'primary request-card-accept', `Accept request ${state.threads.indexOf(thread) + 1} ↗`);
      accept.type = 'button'; accept.disabled = busy || !state.available;
      accept.onclick = () => acceptRequest(thread.id);
      card.append(accept);
      if (!state.available) card.append(node('p', 'micro', 'Turn availability on to accept.'));
    }
    $('#requests').append(card);
  }
  const thread = state.threads.find(t => t.id === selected);
  $('#volunteer-empty').hidden = Boolean(thread);
  $('#thread-content').hidden = !thread;
  $('#volunteer-send').disabled = busy || !state.available || thread?.status !== 'active';
  $('#volunteer-input').disabled = busy || !state.available || thread?.status !== 'active';
  $('#accept-request').hidden = !thread || thread.status !== 'pending';
  $('#accept-request').disabled = busy || !state.available;
  $('#volunteer-action-note').textContent = !state.available
    ? 'Turn on your availability to accept requests or send replies.'
    : thread?.status === 'pending' ? 'Read the request, then accept it to start chatting.' : 'This request is accepted. You can reply below.';
  if (!thread) return;
  $('#thread-title').textContent = `Demo request ${state.threads.indexOf(thread) + 1}`;
  $('#thread-status').textContent = thread.status === 'pending' ? 'Pending acceptance' : 'Accepted chat';
  const nextSignature = JSON.stringify(thread.messages);
  if (nextSignature === signature) return;
  signature = nextSignature;
  $('#volunteer-messages').replaceChildren();
  for (const message of thread.messages) {
    const row = node('article', 'human-message ' + message.sender);
    row.append(node('span', 'message-label', message.sender === 'volunteer' ? 'You · volunteer' : 'Participant'));
    row.append(node('div', '', message.text));
    $('#volunteer-messages').append(row);
  }
  $('#volunteer-messages').scrollTop = $('#volunteer-messages').scrollHeight;
}
$('#availability').onchange = async e => {
  try { state = await api('/api/volunteer/availability', { available: e.target.checked }); error(''); }
  catch (e) { error(e.message); }
  render();
};
async function acceptRequest(threadId) {
  if (!threadId || busy || !state.available) return;
  if (selected !== threadId) {
    selected = threadId; signature = ''; retryId = null; $('#volunteer-input').value = '';
  }
  busy = true; render();
  try { state = await api('/api/volunteer/accept', { threadId }); error(''); }
  catch (e) { error(e.message); }
  finally { busy = false; render(); }
}
$('#accept-request').onclick = () => acceptRequest(selected);
$('#volunteer-form').onsubmit = async e => {
  e.preventDefault();
  if (busy || !selected || !state.available || state.threads.find(t => t.id === selected)?.status !== 'active') return;
  const text = $('#volunteer-input').value.trim(); if (!text) return;
  busy = true; render(); retryId ||= crypto.randomUUID();
  try {
    state = await api('/api/volunteer/message', { threadId: selected, requestId: retryId, role: 'volunteer', text });
    $('#volunteer-input').value = ''; retryId = null; error('');
  } catch (e) { error(e.message); }
  finally { busy = false; render(); }
};
$('#volunteer-input').oninput = () => { retryId = null; };
async function refresh() {
  if (document.hidden) return;
  try { state = await api('/api/volunteer'); render(); }
  catch { error('Disconnected from the local server. Your unsent reply remains here.'); }
}
await refresh();
setInterval(refresh, 2000);
