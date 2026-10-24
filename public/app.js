const $ = selector => document.querySelector(selector);
let state, busy = false, lastMessageSignature = '';
let requestBusy = false, requestRetryId;

async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The local app could not complete this request.');
  return result;
}
function error(message) { $('#global-error').textContent = message; $('#global-error').hidden = !message; }
function panel(open) {
  $('#companion').hidden = !open;
  $('#companion-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('#close-panel').focus();
  else $('#companion-toggle').focus();
}
function element(tag, className, content) { const node = document.createElement(tag); node.className = className; if (content) node.textContent = content; return node; }
function render() {
  if (!state) return;
  const c = state.conversation, on = state.settings.monitoringOn;
  $('#monitoring').checked = on;
  $('#monitoring-label').textContent = on ? 'On · noticing patterns, gently' : 'Off · your choice, always';
  $('#status-dot').classList.toggle('on', on);
  $('#guidance-notice').hidden = !state.guidanceActive;
  $('#manual-guidance').disabled = !on || state.settings.manualGuidance;
  $('#manual-guidance').textContent = state.settings.manualGuidance ? '✓ Response adjustments manually on' : 'Turn on response adjustments';
  $('#guidance-source').textContent = !on ? 'Turn on control 1 above to enable this button.' : !state.guidanceActive ? 'Adjustments are off. Turn them on here whenever you choose.' : state.settings.manualGuidance ? 'Manual guidance stays on when you start a new AI conversation.' : 'Guidance is active for this AI conversation. Monitoring off stops adjustments.';
  $('#check-in').hidden = !on || !c.checkIn;
  $('#reply-offer').hidden = !on || c.replyOffer !== 'pending' || state.guidanceActive;
  $('#welcome').hidden = c.messages.length > 0;
  renderHuman();
  $('#send').disabled = busy;
  $('#send').textContent = busy ? '…' : '↑';
  const signature = JSON.stringify(c.messages);
  if (signature === lastMessageSignature) return;
  lastMessageSignature = signature;
  $('#messages').replaceChildren();
  for (const m of c.messages) {
    const row = element('article', `message ${m.role}`);
    row.append(element('span', 'message-label', m.role === 'user' ? 'You' : 'AI assistant' + (m.balanced ? ' · balanced guidance' : '')));
    row.append(element('div', 'message-text', m.text));
    if (m.status === 'sending') row.append(element('div', 'micro', 'Thinking…'));
    if (m.monitoringError) row.append(element('div', 'monitoring-error', 'Monitoring unavailable for this turn: ' + m.monitoringError));
    if (m.status === 'failed') {
      row.append(element('div', 'message-error', m.error || 'Reply interrupted. You can retry.'));
      const retry = element('button', '', 'Retry this message');
      retry.disabled = busy;
      retry.onclick = () => send(m.text, m.requestId);
      row.append(retry);
    }
    $('#messages').append(row);
  }
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
}
async function action(path, body) {
  try { error(''); state = await api(path, body); render(); }
  catch (e) { error(e.message); render(); }
}
async function send(content, requestId = crypto.randomUUID()) {
  if (busy || !content.trim() || !state) return;
  busy = true; error(''); render();
  const conversationId = state.conversation.id;
  let success = false;
  try {
    state = await api('/api/chat', { conversationId, requestId, text: content });
    success = state.conversation.messages.some(m => m.requestId === requestId && m.status === 'complete');
  } catch (e) { error(e.message); }
  finally { busy = false; if (success) $('#message-input').value = ''; render(); }
}
$('#companion-toggle').onclick = () => panel($('#companion').hidden);
$('#close-panel').onclick = () => panel(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#companion').hidden) panel(false); });
$('#monitoring').onchange = e => action('/api/settings', { monitoringOn: e.target.checked });
$('#manual-guidance').onclick = () => action('/api/guidance', { enableManual: true });
$('#new-chat').onclick = () => action('/api/chat/new', {});
$('#dismiss-check-in').onclick = () => action('/api/check-in/dismiss', { conversationId: state.conversation.id });
$('#accept-offer').onclick = () => action('/api/reply-offer', { conversationId: state.conversation.id, accept: true });
$('#decline-offer').onclick = () => action('/api/reply-offer', { conversationId: state.conversation.id, accept: false });
function renderHuman() {
  $('#human-availability').textContent = state.volunteerAvailable
    ? 'A volunteer is available for a conversation.'
    : 'No volunteers are available right now. You can leave a message for a later reply.';
  $('#intro-text').textContent = state.humanThreads.length || state.bookmarks.length
    ? 'Welcome back. Your human conversations and saved interests stay here, whenever you need them.'
    : 'Use AI thoughtfully, and leave room for people. The companion can notice patterns and help you find a path to real connection.';
  const pending = state.humanThreads.filter(t => t.status === 'pending').length;
  const accepted = state.humanThreads.filter(t => t.status === 'active').length;
  $('#human-summary').textContent = state.humanThreads.length
    ? `${pending} pending request${pending === 1 ? '' : 's'} · ${accepted} accepted chat${accepted === 1 ? '' : 's'}. Open current chats to view them.`
    : 'Send a request first, then continue in a full-page chat once it is accepted.';
}
function openHuman() { window.location.assign('/messages'); }
function openRequest() { panel(true); $('#request-box').hidden = false; $('#human-section').scrollIntoView({ block:'start' }); $('#request-input').focus(); }
$('#request-volunteer').onclick = openRequest;
$('#open-request').onclick = openRequest;
$('#open-human').onclick = openHuman;
$('#request-input').oninput = () => { requestRetryId = null; };
$('#request-form').onsubmit = async e => {
  e.preventDefault(); if (requestBusy) return;
  const text = $('#request-input').value.trim(); if (!text) return;
  requestBusy = true; requestRetryId ||= crypto.randomUUID();
  $('#request-send').disabled = true; $('#request-input').disabled = true;
  $('#request-send-status').textContent = 'Saving request…';
  try {
    state = await api('/api/volunteer/request', { requestId:requestRetryId, text });
    requestRetryId = null; $('#request-input').value = '';
    $('#request-send-status').textContent = 'Request saved and pending acceptance. Find it under Open current chats, or write another request here.';
    render();
  } catch (e) { $('#request-send-status').textContent = e.message + ' Your message is still here.'; }
  finally { requestBusy = false; $('#request-send').disabled = false; $('#request-input').disabled = false; }
};
$('#chat-form').onsubmit = e => { e.preventDefault(); send($('#message-input').value); };
$('#message-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); } };
for (const button of document.querySelectorAll('[data-prompt]')) button.onclick = () => { $('#message-input').value = button.dataset.prompt; $('#message-input').focus(); };
async function refresh() {
  if (document.hidden) return;
  try { state = await api('/api/user'); render(); }
  catch { error('The local server is disconnected. Check that npm start is still running.'); }
}
await refresh();
if (state && new URLSearchParams(location.search).get('request') === '1') openRequest();
setInterval(refresh, 2000);
