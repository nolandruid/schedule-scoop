// ScheduleScoop scheduling logic: pure functions, no DOM or Chrome APIs.
// Runs as a classic script in the page/popup and as a CommonJS module in Node tests.
// Dates are 'YYYY-MM-DD' strings and times are 'HH:MM' wall-clock strings in America/Toronto.
(function () {
  const TERM_NAMES = { '10': 'Winter', '20': 'Summer', '30': 'Fall' };
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parseISO = (iso) => iso.split('-').map(Number);

  function termLabel(code, year) {
    return `${TERM_NAMES[code]} ${year}`;
  }

  function defaultTerm(now) {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (month === 12) return { code: '10', year: String(year + 1) };
    if (month <= 3) return { code: '10', year: String(year) };
    if (month <= 7) return { code: '20', year: String(year) };
    return { code: '30', year: String(year) };
  }

  function yearOptions(now) {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }

  function parseTime12(s) {
    const m = /^\s*(\d{1,2}):(\d{2})\s*([ap])\.?m\.?\s*$/i.exec(s || '');
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'p') h += 12;
    return `${pad(h)}:${m[2]}`;
  }

  function parseCarletonDate(s) {
    const m = /^\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})\s*$/.exec(s || '');
    if (!m || !MONTHS[m[1].toLowerCase()]) return null;
    return toISO(m[3], MONTHS[m[1].toLowerCase()], m[2]);
  }

  function addDays(iso, n) {
    const [y, m, d] = parseISO(iso);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return toISO(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }

  function weekday(iso) {
    const [y, m, d] = parseISO(iso);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  const api = { termLabel, defaultTerm, yearOptions, parseTime12, parseCarletonDate, addDays, weekday };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    globalThis.ScheduleScoop = globalThis.ScheduleScoop || {};
    globalThis.ScheduleScoop.schedule = api;
  }
})();
