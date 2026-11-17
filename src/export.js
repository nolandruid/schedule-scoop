// ScheduleScoop calendar exporters: Google Calendar API, Microsoft Graph, and .ics download.
(function () {
  const schedule = typeof module !== 'undefined' && module.exports
    ? require('./schedule.js')
    : globalThis.ScheduleScoop.schedule;

  const GOOGLE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const GRAPH = 'https://graph.microsoft.com/v1.0/me/events';
  const wait = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

  const headers = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra });

  async function postEach(events, { token, fetch, onProgress, sleep = 100 }, url, toPayload, afterCreate) {
    let created = 0;
    let failed = 0;
    for (let i = 0; i < events.length; i++) {
      let res;
      try {
        res = await fetch(url, { method: 'POST', headers: headers(token), body: JSON.stringify(toPayload(events[i])) });
      } catch (err) {
        res = null;
      }
      if (res && res.status === 401) {
        const err = new Error('auth');
        err.created = created; // events already added before the sign-in expired
        throw err;
      }
      if (res && res.ok) {
        created++;
        if (afterCreate) await afterCreate(events[i], await res.json());
      } else {
        failed++;
      }
      if (onProgress) onProgress(i + 1, events.length);
      if (i < events.length - 1) await wait(sleep);
    }
    return { created, failed };
  }

  function exportToGoogle(events, options) {
    return postEach(events, options, GOOGLE_URL, schedule.toGoogleEvent);
  }

  // Graph can't exclude dates when creating a series, so delete the skipped instances afterwards.
  async function exportToOutlook(events, options) {
    const { token, fetch } = options;
    let skipFailures = 0;
    const removeSkipped = async (event, created) => {
      for (const day of event.exDates) {
        try {
          // Graph reads these as UTC. Noon UTC the day before to noon UTC the day after covers the whole
          // Toronto day (EST or EDT); the startsWith(day) filter below keeps only that day's instance.
          const range = `startDateTime=${schedule.addDays(day, -1)}T12:00:00Z&endDateTime=${schedule.addDays(day, 1)}T12:00:00Z`;
          const res = await fetch(`${GRAPH}/${encodeURIComponent(created.id)}/instances?${range}`, {
            headers: headers(token, { Prefer: 'outlook.timezone="America/Toronto"' }),
          });
          if (!res.ok) { skipFailures++; continue; }
          const matches = ((await res.json()).value || []).filter((inst) => inst.start.dateTime.startsWith(day));
          if (matches.length === 0) skipFailures++;
          for (const inst of matches) {
            const del = await fetch(`${GRAPH}/${encodeURIComponent(inst.id)}`, { method: 'DELETE', headers: headers(token) });
            if (!del.ok) skipFailures++;
          }
        } catch (err) {
          skipFailures++;
        }
      }
    };
    const result = await postEach(events, options, GRAPH, schedule.toOutlookEvent, removeSkipped);
    return { ...result, skipFailures };
  }

  function downloadICS(text, filename, doc = document) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const api = { exportToGoogle, exportToOutlook, downloadICS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.ScheduleScoop.exporters = api;
})();
