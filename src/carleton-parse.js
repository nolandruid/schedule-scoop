// Parses Carleton Central's "Student Detail Schedule" page into sections.
//
// Page layout (checked against a saved page, Winter 2027):
// - Each course is a `table.datadisplaytable` whose summary mentions "course detail". Its
//   `th.ddtitle a` reads "<Name> - <CODE NNNN> - <Section>" (the name itself may contain " - ").
//   Rows are `th.ddlabel` / `td.dddefault` pairs: "CRN:", "Assigned Instructor:", ...
// - It is usually followed by a `table.datadisplaytable` whose summary mentions "meeting times".
//   Its header row holds Type, Time, Days, Where, Date Range, Schedule Type, Instructors, and
//   there can be more than one meeting row. A course may have no meeting table at all.
// - Time is "8:35 am - 9:55 am" or "TBA"; Date Range is "Jan 06, 2027 - Apr 09, 2027".
// - No final-exam rows appear on this page.
(function () {
  const schedule = typeof module !== 'undefined' && module.exports
    ? require('./schedule.js')
    : globalThis.ScheduleScoop.schedule;

  const clean = (el) => (el ? el.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim() : '');

  function readDetail(table) {
    const title = clean(table.querySelector('th.ddtitle a') || table.querySelector('th.ddtitle'));
    const parts = title.split(' - ');
    const section = parts.length >= 3 ? parts.pop() : '';
    const code = parts.length >= 2 ? parts.pop() : '';
    const labels = {};
    for (const row of table.querySelectorAll('tr')) {
      const th = row.querySelector('th.ddlabel');
      const td = row.querySelector('td');
      if (th && td) labels[clean(th).replace(/:$/, '')] = clean(td);
    }
    return {
      code, section, name: parts.join(' - '), type: '', crn: labels.CRN || '',
      instructor: labels['Assigned Instructor'] || 'Instructor TBA', meetings: [],
    };
  }

  function readMeetings(table) {
    const rows = [...table.querySelectorAll('tr')];
    const headers = rows.length ? [...rows[0].querySelectorAll('th')].map(clean) : [];
    const col = (name) => headers.indexOf(name);
    return rows.slice(1).map((row) => {
      const cells = [...row.querySelectorAll('td')].map(clean);
      const get = (name) => (col(name) >= 0 ? cells[col(name)] || '' : '');
      const [from = '', to = ''] = get('Time').split(' - ');
      const [startDate = '', endDate = ''] = get('Date Range').split(' - ');
      const start = schedule.parseTime12(from);
      const end = schedule.parseTime12(to);
      const where = get('Where');
      return {
        days: start && end ? get('Days').replace(/\s/g, '') : '',
        start: start && end ? start : null,
        end: start && end ? end : null,
        location: /^on ?line$/i.test(where) ? 'Online' : (where === 'TBA' ? '' : where),
        type: get('Schedule Type'),
        startDate: schedule.parseCarletonDate(startDate),
        endDate: schedule.parseCarletonDate(endDate),
      };
    }).filter((m) => m.startDate && m.endDate);
  }

  function parseSchedulePage(doc) {
    const sections = [];
    for (const table of doc.querySelectorAll('table.datadisplaytable')) {
      const summary = (table.getAttribute('summary') || '').toLowerCase();
      if (summary.includes('course detail')) {
        sections.push(readDetail(table));
      } else if (summary.includes('meeting times') && sections.length) {
        const current = sections[sections.length - 1];
        current.meetings.push(...readMeetings(table));
        if (!current.type && current.meetings.length) current.type = current.meetings[0].type;
      }
    }
    return sections;
  }

  // "Winter 2027" from the first "Associated Term:" row, or null when the page doesn't show one.
  function shownTerm(doc) {
    const th = [...doc.querySelectorAll('th.ddlabel')].find((x) => clean(x) === 'Associated Term:');
    const td = th && th.parentElement.querySelector('td');
    const m = td && /^(Winter|Summer|Fall) \d{4}/.exec(clean(td));
    return m ? m[0] : null;
  }

  function detailUrl(code, year) {
    return `https://central.carleton.ca/prod/bwskfshd.P_CrseSchdDetl?term_in=${year}${code}`;
  }

  const api = { parseSchedulePage, shownTerm, detailUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(globalThis.ScheduleScoop, api);
})();
