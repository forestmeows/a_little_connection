const $ = selector => document.querySelector(selector);
let state, busy = false, lastMessageSignature = '';
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
function openHuman() { panel(true); $('#human-placeholder').hidden = false; $('#human-placeholder').scrollIntoView({ block: 'nearest' }); }
$('#request-volunteer').onclick = openHuman;
$('#open-human').onclick = openHuman;
$('#chat-form').onsubmit = e => { e.preventDefault(); send($('#message-input').value); };
$('#message-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); } };
for (const button of document.querySelectorAll('[data-prompt]')) button.onclick = () => { $('#message-input').value = button.dataset.prompt; $('#message-input').focus(); };
async function refresh() {
  if (document.hidden) return;
  try { state = await api('/api/user'); render(); }
  catch { error('The local server is disconnected. Check that npm start is still running.'); }
}
await refresh();
setInterval(refresh, 2000);
