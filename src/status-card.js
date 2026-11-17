// In-page status card shown on Carleton Central during an export. Lives in a closed Shadow DOM
// so the page's CSS can't touch it. API: ScheduleScoop.statusCard.show({...}) / .hide().
(function () {
  const ID = 'schedulescoop-status';

  const CSS = `
:host { all: initial; }
.card {
  --bg: #ffffff; --text: #111827; --muted: #5b6270; --border: #e3e5ea;
  --accent: #4f46e5; --on-accent: #ffffff; --track: #eceef3;
  --success: #15803d; --success-bg: #ecfdf3; --danger: #b42318; --danger-bg: #fef3f2;
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
  width: 320px; box-sizing: border-box; padding: 14px 16px 16px;
  background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 14px;
  box-shadow: 0 10px 30px rgba(17, 24, 39, .14), 0 2px 6px rgba(17, 24, 39, .08);
  font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  animation: rise .18s ease-out;
}
@media (prefers-color-scheme: dark) {
  .card { --bg: #1d1d24; --text: #f3f4f6; --muted: #a1a6b3; --border: #33343f;
    --accent: #8b93ff; --on-accent: #0e0f1a; --track: #2c2d38;
    --success: #4ade80; --success-bg: #12261a; --danger: #fca5a5; --danger-bg: #2b1515; }
}
@media (prefers-reduced-motion: reduce) { .card { animation: none; } .spin { animation: none !important; } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes spin { to { transform: rotate(360deg); } }
.card.success { background: var(--success-bg); border-color: color-mix(in srgb, var(--success) 35%, transparent); }
.card.error { background: var(--danger-bg); border-color: color-mix(in srgb, var(--danger) 35%, transparent); }
.head { display: flex; align-items: flex-start; gap: 10px; }
.icon { flex: none; width: 20px; height: 20px; margin-top: 1px; color: var(--accent); }
.success .icon { color: var(--success); } .error .icon { color: var(--danger); }
.spin { animation: spin .9s linear infinite; }
.text { flex: 1; min-width: 0; }
.brand { font-size: 11px; letter-spacing: .04em; color: var(--muted); margin: 0 0 2px; }
.title { font-weight: 600; margin: 0; }
.detail { color: var(--muted); margin: 4px 0 0; font-size: 13px; white-space: pre-line; }
.close { all: unset; cursor: pointer; width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; color: var(--muted); }
.close:hover { background: var(--track); color: var(--text); }
.bar { height: 6px; border-radius: 3px; background: var(--track); margin-top: 12px; overflow: hidden; }
.fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .2s ease; }
.actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
button.btn { font: inherit; font-size: 13px; font-weight: 600; padding: 7px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--border); background: transparent; color: var(--text); }
button.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
a.link { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 600; color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

  const ICONS = {
    working: '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
    confirm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.8"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v6M12 16.5v.5"/></svg>',
  };
  const CLOSE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  let host = null;
  let root = null;

  function ensureRoot(doc) {
    if (host && doc.contains(host)) return root;
    host = doc.createElement('div');
    host.id = ID;
    root = host.attachShadow({ mode: 'closed' });
    const style = doc.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    (doc.body || doc.documentElement).appendChild(host);
    return root;
  }

  function el(doc, tag, cls, text) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function show({ state, title, detail, progress, actions, link }, doc = document) {
    const r = ensureRoot(doc);
    const old = r.querySelector('.card');
    if (old) old.remove();

    const card = el(doc, 'div', `card ${state}`);
    card.setAttribute('role', state === 'error' ? 'alert' : 'status');
    card.setAttribute('aria-live', state === 'error' ? 'assertive' : 'polite');

    const head = el(doc, 'div', 'head');
    const icon = el(doc, 'span', 'icon');
    icon.innerHTML = ICONS[state] || ICONS.working;
    icon.setAttribute('aria-hidden', 'true');
    const text = el(doc, 'div', 'text');
    text.append(el(doc, 'p', 'brand', 'ScheduleScoop'), el(doc, 'p', 'title', title));
    if (detail) text.append(el(doc, 'p', 'detail', detail));
    if (link) {
      const a = el(doc, 'a', 'link', `${link.label} ↗`);
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      text.append(a);
    }
    head.append(icon, text);
    if (state !== 'confirm') {
      const close = el(doc, 'button', 'close');
      close.innerHTML = CLOSE;
      close.setAttribute('aria-label', 'Close');
      close.addEventListener('click', hide);
      head.append(close);
    }
    card.append(head);

    if (state === 'progress' && progress && progress.total > 0) {
      const bar = el(doc, 'div', 'bar');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(progress.total));
      bar.setAttribute('aria-valuenow', String(progress.done));
      const fill = el(doc, 'div', 'fill');
      fill.style.width = `${Math.round((progress.done / progress.total) * 100)}%`;
      bar.append(fill);
      card.append(bar);
    }

    if (actions && actions.length) {
      const row = el(doc, 'div', 'actions');
      for (const a of actions) {
        const b = el(doc, 'button', `btn${a.primary ? ' primary' : ''}`, a.label);
        b.addEventListener('click', a.onClick);
        row.append(b);
      }
      card.append(row);
      const primary = row.querySelector('.primary') || row.querySelector('button');
      setTimeout(() => primary.focus(), 0);
    }
    r.append(card);
  }

  function hide() {
    if (host) host.remove();
    host = null;
    root = null;
  }

  globalThis.ScheduleScoop = globalThis.ScheduleScoop || {};
  globalThis.ScheduleScoop.statusCard = { show, hide };
})();
