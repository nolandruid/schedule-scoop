// In-memory stand-in for the chrome.* APIs the popup uses, so popup.html can be previewed in a
// normal browser tab. Inspect `window.__stubStorage` and `window.__stubCalls` from the console.
(function () {
  const makeArea = (data) => ({
    async get(keys) {
      const list = keys == null ? Object.keys(data) : [].concat(keys);
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, structuredClone(data[k])]));
    },
    async set(obj) { Object.assign(data, structuredClone(obj)); },
  });
  const local = {};
  const session = {};
  const calls = [];
  window.__stubStorage = { local, session };
  window.__stubCalls = calls;
  window.chrome = {
    storage: { local: makeArea(local), session: makeArea(session) },
    tabs: {
      async query() { return [{ id: 1, url: 'https://example.com/' }]; },
      async create(opts) { calls.push(['tabs.create', opts]); },
    },
    scripting: { async executeScript(opts) { calls.push(['executeScript', opts]); } },
    runtime: {
      getManifest: () => ({ version: '3.0.0' }),
      sendMessage(msg) { calls.push(['sendMessage', msg]); },
    },
  };
  // Keep the preview open after Export.
  window.close = () => calls.push(['window.close']);
})();
