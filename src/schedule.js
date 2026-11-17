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

  // Fall break Mondays confirmed from Carleton's academic dates. Other years use the fallback rule.
  const FALL_BREAK_MONDAY = { 2025: '2025-10-27', 2026: '2026-10-26' };

  function nthMonday(year, month, n) {
    const first = toISO(year, month, 1);
    const offset = (8 - weekday(first)) % 7; // days until first Monday
    return addDays(first, offset + 7 * (n - 1));
  }

  function easterSunday(year) {
    // Anonymous Gregorian algorithm
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return toISO(year, month, day);
  }

  const weekOf = (monday) => [0, 1, 2, 3, 4].map((n) => addDays(monday, n));

  function lastFullWeekOfOctober(year) {
    let friday = toISO(year, 10, 31);
    while (weekday(friday) !== 5) friday = addDays(friday, -1);
    return addDays(friday, -4);
  }

  function skippedDates(code, year) {
    const y = Number(year);
    let days = [];
    if (code === '10') {
      days = [...weekOf(nthMonday(y, 2, 3)), addDays(easterSunday(y), -2)];
    } else if (code === '30') {
      days = [...weekOf(FALL_BREAK_MONDAY[y] || lastFullWeekOfOctober(y)), nthMonday(y, 10, 2), nthMonday(y, 9, 1)];
    } else if (code === '20') {
      let victoria = toISO(y, 5, 24);
      while (weekday(victoria) !== 1) victoria = addDays(victoria, -1);
      days = [victoria, toISO(y, 7, 1), nthMonday(y, 8, 1)];
    }
    return [...new Set(days)].filter((d) => weekday(d) !== 0 && weekday(d) !== 6).sort();
  }

  const DAY_CODES = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR', S: 'SA', U: 'SU' };
  const DAY_NUMBERS = { M: 1, T: 2, W: 3, R: 4, F: 5, S: 6, U: 0 };

  // Today's rule, kept: tutorials and labs start in week two unless their weekday is
  // earlier in the week than the term's first day (then the first match is already week two).
  function firstMeetingDate(startDate, letter, type) {
    const startDay = weekday(startDate);
    let diff = DAY_NUMBERS[letter] - startDay;
    const earlier = diff < 0;
    if (earlier) diff += 7;
    const t = (type || '').toLowerCase();
    if ((t.includes('tutorial') || t.includes('lab')) && !earlier) diff += 7;
    return addDays(startDate, diff);
  }

  function buildEvents(sections, { code, year, labsBiweekly }) {
    const skipped = new Set(skippedDates(code, year));
    const events = [];
    let skippedSections = 0;
    for (const s of sections) {
      const timed = (s.meetings || []).filter((m) => m.start && m.end && m.days);
      if (timed.length === 0) { skippedSections++; continue; }
      const isLab = (s.type || '').toLowerCase().includes('lab');
      const interval = isLab && labsBiweekly ? 2 : 1;
      for (const m of timed) {
        for (const letter of m.days.replace(/\s/g, '')) {
          if (!DAY_CODES[letter]) continue;
          const date = firstMeetingDate(m.startDate, letter, s.type);
          if (date > m.endDate) continue;
          const exDates = [];
          for (let d = date; d <= m.endDate; d = addDays(d, interval * 7)) {
            if (skipped.has(d)) exDates.push(d);
          }
          const byDay = DAY_CODES[letter];
          events.push({
            uid: `${s.code}-${s.section}-${byDay}-${m.start.replace(':', '')}-${year}${code}@schedulescoop`.replace(/\s/g, ''),
            title: `${s.code} ${s.type}`,
            description: [s.name, `Section ${s.section}`, s.instructor, `CRN ${s.crn}`, m.location || 'Location TBA'].join('\n'),
            location: m.location || '',
            date, start: m.start, end: m.end, byDay, interval, until: m.endDate, exDates,
          });
        }
      }
    }
    return { events, skippedSections };
  }

  const api = {
    termLabel, defaultTerm, yearOptions, parseTime12, parseCarletonDate, addDays, weekday, skippedDates,
    firstMeetingDate, buildEvents,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    globalThis.ScheduleScoop = globalThis.ScheduleScoop || {};
    globalThis.ScheduleScoop.schedule = api;
  }
})();
