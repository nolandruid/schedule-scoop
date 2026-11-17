// Runs on Carleton Central pages while an export is requested. Walks Main Menu → Student Timetable →
// Registration Term → Student Detail Schedule, then scrapes, builds events and exports them.
// Injected after src/schedule.js, src/carleton-parse.js, src/export.js and src/status-card.js.
(function () {
  // Scripts can be injected again into the same page (another Export press); don't run twice at once.
  if (window.__scheduleScoopBusy) return;
  window.__scheduleScoopBusy = true;

  const { schedule, parseSchedulePage, exporters, statusCard: card } = globalThis.ScheduleScoop;
  const SSO_URL = 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd';
  const DETAIL_URL = 'https://central.carleton.ca/prod/bwskfshd.P_CrseSchdDetl';
  const CALENDAR_NAMES = { google: 'Google Calendar', outlook: 'Outlook', ics: '.ics file' };

  const storage = (keys) => chrome.storage.local.get(keys);
  const finish = () => {
    window.__scheduleScoopBusy = false;
    chrome.runtime.sendMessage({ action: 'end-timetable-request' });
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function fail(title, detail) {
    card.show({ state: 'error', title, detail });
    finish();
  }

  async function waitFor(find, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = find();
      if (found) return found;
      await sleep(150);
    }
    return null;
  }

  const linkWithText = (text) => () => [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === text);

  async function clickLink(text) {
    const link = await waitFor(linkWithText(text));
    if (!link) return fail("Couldn't find your timetable", `Carleton Central's "${text}" link is missing. Try again, or open it yourself and press Export.`);
    link.click();
  }

  async function loadSettings() {
    const s = await storage(['carleton', 'selected-calendar', 'labs-biweekly', 'privacy_policy_agreement', 'export-history']);
    const fallback = schedule.defaultTerm(new Date());
    const saved = Array.isArray(s.carleton) ? s.carleton : [];
    return {
      code: saved[0] || fallback.code,
      year: String(saved[1] || fallback.year),
      calendar: CALENDAR_NAMES[s['selected-calendar']] ? s['selected-calendar'] : 'google',
      labsBiweekly: s['labs-biweekly'] !== false,
      agreed: Array.isArray(s.privacy_policy_agreement) && s.privacy_policy_agreement[0] === true,
      history: s['export-history'] || {},
    };
  }

  function getToken(action) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action }, (res) => {
        if (res && res.success) resolve(res.token);
        else reject(new Error((res && res.error && res.error.message) || 'Sign-in was cancelled'));
      });
    });
  }

  const shortDate = (iso) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  async function runExport(settings, term, events, skippedSections) {
    const name = CALENDAR_NAMES[settings.calendar];
    const notes = [];
    if (skippedSections) notes.push(`${plural(skippedSections, 'course had', 'courses had')} no set times and ${skippedSections === 1 ? 'was' : 'were'} skipped.`);
    let link;

    if (settings.calendar === 'ics') {
      const filename = schedule.icsFilename(settings.code, settings.year);
      exporters.downloadICS(schedule.toICS(events, { now: new Date() }), filename);
      card.show({ state: 'success', title: `Downloaded ${filename}`, detail: [`${plural(events.length, 'event', 'events')} for ${term}. Open the file to add it to any calendar app.`, ...notes].join('\n') });
    } else {
      card.show({ state: 'working', title: `Connecting to ${name}…`, detail: 'Finish signing in in the window that opens.' });
      let token;
      try {
        token = await getToken(settings.calendar === 'google' ? 'getGoogleCalendarToken' : 'getOutlookCalendarToken');
      } catch (err) {
        return fail(`Couldn't connect to ${name}`, `${err.message}. Press Export to try again.`);
      }
      const onProgress = (done, total) => card.show({
        state: 'progress', title: `Adding to ${name}`, detail: `${plural(total, 'event', 'events')} for ${term} · ${done} of ${total}`, progress: { done, total },
      });
      onProgress(0, events.length);
      let result;
      try {
        const run = settings.calendar === 'google' ? exporters.exportToGoogle : exporters.exportToOutlook;
        result = await run(events, { token, fetch: (...a) => fetch(...a), onProgress });
      } catch (err) {
        if (err.message === 'auth') {
          if (settings.calendar === 'google') chrome.runtime.sendMessage({ action: 'clearGoogleToken', token });
          return fail(`Your ${name} sign-in expired`, 'Press Export to sign in again.');
        }
        return fail(`Couldn't add events to ${name}`, 'Check your connection and try again.');
      }
      if (result.created === 0) return fail(`Couldn't add events to ${name}`, 'Nothing was added. Try again in a minute.');
      if (result.failed) notes.push(`${plural(result.failed, 'event', 'events')} couldn't be added.`);
      if (result.skipFailures) notes.push(`${plural(result.skipFailures, 'holiday class', 'holiday classes')} couldn't be removed.`);
      if (settings.calendar === 'google') {
        link = { label: 'Open Google Calendar', href: `https://calendar.google.com/calendar/r/week/${events[0].date.replace(/-/g, '/')}` };
      }
      card.show({ state: 'success', title: `Added ${plural(result.created, 'event', 'events')} to ${name}`, detail: notes.join('\n') || `Your ${term} classes are in your calendar.`, link });
    }

    const key = `${settings.code}-${settings.year}-${settings.calendar}`;
    await chrome.storage.local.set({ 'export-history': { ...settings.history, [key]: new Date().toISOString() } });
    finish();
  }

  async function onDetailSchedule(settings) {
    const term = schedule.termLabel(settings.code, settings.year);
    card.show({ state: 'working', title: `Reading ${term}…` });

    const shownTerm = [...document.querySelectorAll('th.ddlabel')].find((th) => th.textContent.trim() === 'Associated Term:');
    if (shownTerm && !shownTerm.nextElementSibling.textContent.trim().startsWith(term)) {
      location.href = DETAIL_URL; // shows the term picker for the right term
      return;
    }

    const sections = parseSchedulePage(document);
    const { events, skippedSections } = schedule.buildEvents(sections, settings);
    if (events.length === 0) {
      return fail(`No classes with set times found for ${term}`, sections.length ? 'Your courses are online or have no scheduled times yet.' : 'You have no registered courses for this term.');
    }

    const key = `${settings.code}-${settings.year}-${settings.calendar}`;
    const go = () => runExport(settings, term, events, skippedSections);
    if (settings.history[key]) {
      card.show({
        state: 'confirm',
        title: `You already exported ${term} to ${CALENDAR_NAMES[settings.calendar]} on ${shortDate(settings.history[key])}`,
        detail: 'Export again? This will create duplicates.',
        actions: [
          { label: 'Cancel', onClick: () => { card.hide(); finish(); } },
          { label: 'Export again', primary: true, onClick: go },
        ],
      });
      return;
    }
    await go();
  }

  async function main() {
    const settings = await loadSettings();
    const term = schedule.termLabel(settings.code, settings.year);
    if (!settings.agreed) return fail('Accept the privacy policy first', 'Open ScheduleScoop and press Continue.');

    const title = document.title.trim();
    if (title === 'Sign out') {
      location.href = SSO_URL;
    } else if (title === 'Main Menu') {
      card.show({ state: 'working', title: 'Opening your timetable…' });
      await clickLink('Student Timetable');
    } else if (title === 'Student Timetable') {
      card.show({ state: 'working', title: 'Opening your timetable…' });
      await clickLink('Detail Schedule');
    } else if (title === 'Registration Term') {
      card.show({ state: 'working', title: `Opening ${term}…` });
      const select = await waitFor(() => document.getElementById('term_id'));
      const target = `${settings.year}${settings.code}`;
      if (!select || ![...select.options].some((o) => o.value === target)) {
        return fail(`${term} isn't on your Carleton account`, 'Pick another term in ScheduleScoop.');
      }
      select.value = target;
      const submit = document.querySelector('input[type=submit]');
      if (!submit) return fail("Couldn't open your timetable", 'Try again in a minute.');
      submit.click();
    } else if (title === 'Student Detail Schedule') {
      await onDetailSchedule(settings);
    } else {
      window.__scheduleScoopBusy = false; // some other Carleton page; wait for the next navigation
    }
  }

  main().catch(() => fail('Something went wrong', 'Press Export in ScheduleScoop to try again.'));
})();
