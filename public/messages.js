const $ = selector => document.querySelector(selector);
let state, selected, busy = false, signature = '', retryId;
const drafts = new Map();
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Your message could not be saved.');
  return result;
}
function node(tag, className, text) { const e = document.createElement(tag); e.className = className; if (text) e.textContent = text; return e; }
function error(message) { $('#inbox-error').textContent = message; $('#inbox-error').hidden = !message; }
function select(id) {
  if (busy) return;
  drafts.set(selected || 'new', $('#inbox-input').value);
  selected = id; signature = ''; retryId = null;
  $('#inbox-input').value = drafts.get(selected || 'new') || '';
  $('#inbox-send-status').textContent = ''; render();
}
function render() {
  if (!state) return;
  const threads = [...state.humanThreads].reverse();
  if (selected === undefined) selected = threads[0]?.id || null;
  const thread = threads.find(t => t.id === selected);
  $('#contact-availability').textContent = state.volunteerAvailable
    ? 'Available for a conversation' : 'Currently away · you can leave a message';
  $('#contact-status').textContent = thread?.status === 'pending' ? 'Pending acceptance' : thread ? 'Accepted chat' : 'Human conversation';
  $('#inbox-contacts').replaceChildren();
  if (!threads.length) $('#inbox-contacts').append(node('p', 'inbox-list-empty', 'No requests yet. Send a new request to start a conversation.'));
  const contacts = [...threads.filter(t => t.status === 'pending'), ...threads.filter(t => t.status === 'active')];
  let currentGroup;
  for (const item of contacts) {
    if (currentGroup !== item.status) {
      currentGroup = item.status;
      $('#inbox-contacts').append(node('h3', 'inbox-group-heading', item.status === 'pending' ? 'Pending requests' : 'Accepted chats'));
    }
    const button = node('button', 'inbox-contact' + (selected === item.id ? ' selected' : ''));
    button.type = 'button'; button.disabled = busy;
    button.setAttribute('aria-current', selected === item.id ? 'true' : 'false');
    button.append(node('span', 'contact-avatar', '♡'));
    const info = node('span', 'inbox-contact-info');
    info.append(node('strong', '', `Request ${state.humanThreads.indexOf(item) + 1} · Youth volunteer`));
    info.append(node('span', 'contact-preview', item.messages.at(-1)?.text.slice(0, 75) || 'Start a human conversation'));
    info.append(node('small', '', item.status === 'pending' ? 'Waiting for a volunteer to accept' : 'Accepted · open conversation'));
    button.append(info);
    button.onclick = () => select(item.id);
    $('#inbox-contacts').append(button);
  }
  $('#pending-notice').hidden = thread?.status !== 'pending';
  $('#inbox-send').disabled = busy || thread?.status !== 'active';
  $('#inbox-input').disabled = busy || thread?.status !== 'active';
  $('#inbox-input').placeholder = !thread ? 'Send a new request to start a chat…' : thread.status === 'pending' ? 'Chat opens when your request is accepted…' : 'Write to the volunteer…';
  $('#inbox-send').textContent = busy ? '…' : '↑';
  const nextSignature = JSON.stringify({ id: selected, messages: thread?.messages || [] });
  if (nextSignature === signature) return;
  signature = nextSignature;
  const atBottom = $('#inbox-messages').scrollHeight - $('#inbox-messages').scrollTop - $('#inbox-messages').clientHeight < 100;
  $('#inbox-messages').replaceChildren();
  if (!thread?.messages.length) {
    const welcome = node('div', 'inbox-welcome');
    welcome.append(node('span', '', '♡'), node('h2', '', 'Start with a request.'),
      node('p', '', 'Use Send a new request to introduce what you would like to talk about. Your requests and accepted conversations will appear here.'));
    $('#inbox-messages').append(welcome);
  }
  for (const message of thread?.messages || []) {
    const row = node('article', 'inbox-bubble ' + message.sender);
    row.append(node('span', 'message-label', message.sender === 'user' ? 'You' : 'Human volunteer'));
    row.append(node('div', 'bubble-text', message.text));
    const date = new Date(message.at);
    const time = node('time', 'bubble-time', date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    time.dateTime = message.at; row.append(time);
    $('#inbox-messages').append(row);
  }
  if (atBottom || thread?.messages.at(-1)?.sender === 'user') $('#inbox-messages').scrollTop = $('#inbox-messages').scrollHeight;
}
$('#inbox-input').oninput = () => { retryId = null; };
$('#inbox-form').onsubmit = async e => {
  e.preventDefault();
  const text = $('#inbox-input').value.trim();
  if (!text || busy || !state || state.humanThreads.find(t => t.id === selected)?.status !== 'active') return;
  busy = true; retryId ||= crypto.randomUUID(); error(''); render();
  const requestId = retryId;
  try {
    state = await api('/api/volunteer/message', { threadId: selected, requestId, role:'user', text });
    selected ||= state.humanThreads.find(t => t.messages.some(m => m.requestId === requestId))?.id;
    $('#inbox-input').value = ''; drafts.delete(selected); drafts.delete('new'); retryId = null;
    $('#inbox-send-status').textContent = 'Message saved.';
  } catch (e) { error(e.message + ' Your unsent message is still in the box.'); }
  finally { busy = false; render(); }
};
$('#inbox-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#inbox-form').requestSubmit(); } };
async function refresh() {
  if (document.hidden) return;
  try { state = await api('/api/user'); render(); }
  catch { error('Disconnected from the local server. Your unsent message remains here.'); }
}
await refresh(); setInterval(refresh, 2000);
