// ScheduleScoop popup: pick a term, a calendar and a lab frequency, then start the export.
// The export itself runs in the Carleton Central tab (src/carleton.js), so this popup can close.
const { schedule } = globalThis.ScheduleScoop;

const SSO_URL = 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd';
const EXPORT_SCRIPTS = ['src/schedule.js', 'src/carleton-parse.js', 'src/export.js', 'src/status-card.js', 'src/carleton.js'];
const FEEDBACK_WEBHOOK = 'https://discord.com/api/webhooks/1410751558974439526/8mCube_3wFRkxkfDBgJ77JMwaF3olsePFJXXMuLPXHKMoFsqqb6JRNS0NQPHy2Rd_7_Q';
const FEEDBACK_COOLDOWN_MS = 60 * 1000;
const NEW_BADGE_OPENS = 3;

const $ = (id) => document.getElementById(id);
const store = chrome.storage.local;

const state = { code: '30', year: '2026', calendar: 'google', labsBiweekly: true, agreed: false };

function setRadio(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function render() {
  setRadio('semester', state.code);
  $('year').value = state.year;
  setRadio('calendar', state.calendar);
  setRadio('labs', state.labsBiweekly ? 'biweekly' : 'weekly');
  $('outlook-note').hidden = state.calendar !== 'outlook';
  $('privacy').hidden = state.agreed;
  $('export').disabled = !state.agreed;
  $('export-label').textContent = `Export ${schedule.termLabel(state.code, state.year)}`;
}

function fillYears(selected) {
  const years = schedule.yearOptions(new Date());
  if (!years.includes(selected)) years.push(selected);
  $('year').replaceChildren(...years.sort().map((y) => new Option(y, y)));
}

async function load() {
  const s = await store.get(['carleton', 'selected-calendar', 'labs-biweekly', 'privacy_policy_agreement', 'seen-version']);
  const fallback = schedule.defaultTerm(new Date());
  const saved = Array.isArray(s.carleton) ? s.carleton : [];
  state.code = ['10', '20', '30'].includes(saved[0]) ? saved[0] : fallback.code;
  state.year = saved[1] ? String(saved[1]) : fallback.year;
  state.calendar = ['google', 'outlook', 'ics'].includes(s['selected-calendar']) ? s['selected-calendar'] : 'google';
  state.labsBiweekly = s['labs-biweekly'] !== false;
  state.agreed = Array.isArray(s.privacy_policy_agreement) && s.privacy_policy_agreement[0] === true;
  fillYears(state.year);
  render();
  if (!Array.isArray(s.carleton)) saveTerm();
  showVersion(s['seen-version']);
}

function saveTerm() {
  store.set({ carleton: [state.code, state.year, true] });
}

function showVersion(seen) {
  const version = chrome.runtime.getManifest().version;
  const major = version.split('.')[0];
  const opens = seen && seen.version === version ? seen.opens : 0;
  const isNew = opens < NEW_BADGE_OPENS;
  $('version-pill').textContent = isNew ? `v${major} · new` : `v${major}`;
  $('version-pill').classList.toggle('new', isNew);
  $('version-pill').title = `Version ${version}`;
  $('whats-new').hidden = !isNew;
  if (isNew) store.set({ 'seen-version': { version, opens: opens + 1 } });
  $('whats-new-close').addEventListener('click', () => {
    $('whats-new').hidden = true;
    $('version-pill').textContent = `v${major}`;
    $('version-pill').classList.remove('new');
    store.set({ 'seen-version': { version, opens: NEW_BADGE_OPENS } });
  });
}

function wireControls() {
  document.querySelectorAll('input[name="semester"]').forEach((r) => r.addEventListener('change', () => {
    state.code = r.value; saveTerm(); render();
  }));
  $('year').addEventListener('change', () => { state.year = $('year').value; saveTerm(); render(); });
  document.querySelectorAll('input[name="calendar"]').forEach((r) => r.addEventListener('change', () => {
    state.calendar = r.value; store.set({ 'selected-calendar': r.value }); render();
  }));
  document.querySelectorAll('input[name="labs"]').forEach((r) => r.addEventListener('change', () => {
    state.labsBiweekly = r.value === 'biweekly'; store.set({ 'labs-biweekly': state.labsBiweekly }); render();
  }));

  $('agree').addEventListener('change', () => { $('agree-btn').disabled = !$('agree').checked; });
  $('agree-btn').addEventListener('click', () => {
    if (!$('agree').checked) return;
    const when = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
    store.set({ privacy_policy_agreement: [true, when, false] });
    state.agreed = true;
    render();
    $('export').focus();
  });

  $('export').addEventListener('click', startExport);
}

async function startExport() {
  if (!state.agreed) return;
  $('export').disabled = true;
  $('export-label').textContent = 'Opening Carleton Central…';
  await chrome.storage.session.set({ 'timetable-requested': [true, 'carleton', 'src/carleton.js'] });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.startsWith('https://central.carleton.ca/')) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: EXPORT_SCRIPTS });
  } else {
    chrome.runtime.sendMessage({ action: 'newCarletonTempTab', login: SSO_URL, type: 'timetable' });
  }
  setTimeout(() => window.close(), 1500);
}

function wireFeedback() {
  const dialog = $('feedback');
  const status = $('feedback-status');
  const setStatus = (text, kind = '') => { status.textContent = text; status.className = `hint ${kind}`; };

  $('feedback-open').addEventListener('click', () => { setStatus(''); dialog.showModal(); });
  $('feedback-cancel').addEventListener('click', () => dialog.close());

  $('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('feedback-text').value.trim();
    if (!text) { setStatus('Write a message first.', 'error'); $('feedback-text').focus(); return; }
    const { 'feedback-last-sent': last = 0 } = await store.get('feedback-last-sent');
    if (Date.now() - last < FEEDBACK_COOLDOWN_MS) { setStatus('You just sent feedback. Try again in a minute.', 'error'); return; }

    $('feedback-send').disabled = true;
    setStatus('Sending…');
    try {
      await sendFeedback({ email: $('feedback-email').value.trim(), feedback: text.slice(0, 2000) });
      await store.set({ 'feedback-last-sent': Date.now() });
      $('feedback-form').reset();
      setStatus('Thanks, your feedback was sent.', 'ok');
      setTimeout(() => dialog.close(), 1200);
    } catch (err) {
      setStatus("Couldn't send it. Check your connection and try again.", 'error');
    } finally {
      $('feedback-send').disabled = false;
    }
  });
}

async function sendFeedback({ email, feedback }) {
  const now = new Date();
  const payload = {
    username: 'Schedule Scoop Feedback',
    avatar_url: 'https://raw.githubusercontent.com/nolandruid/schedule-scoop/main/images/calendar128.png',
    embeds: [{
      description: `\`\`\`\n${feedback.length > 1994 ? `${feedback.substring(0, 1991)}...` : feedback}\n\`\`\``,
      color: 0x4f46e5,
      fields: [
        { name: 'Contact Email', value: email || 'Anonymous', inline: false },
        { name: 'Version', value: chrome.runtime.getManifest().version, inline: false },
      ],
      timestamp: now.toISOString(),
    }],
  };
  const res = await fetch(FEEDBACK_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Feedback failed: ${res.status}`);
}

wireControls();
wireFeedback();
load();
