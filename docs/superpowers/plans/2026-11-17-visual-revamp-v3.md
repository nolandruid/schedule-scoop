# ScheduleScoop v3 Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ScheduleScoop popup and export flow as v3, with a new look, an in-page status card,
reading-week and holiday skipping, a weekly-lab option, and fixes for every listed bug.

**Architecture:** Pure scheduling logic (`src/schedule.js`) turns scraped sections into neutral events
that use wall-clock date and time strings, so nothing depends on the computer's timezone. It also
serialises them to ICS, Google and Outlook. `src/carleton.js` navigates Carleton Central and scrapes the
schedule. `src/export.js` makes the network calls. `src/status-card.js` shows progress on the page. The
popup is a thin settings screen. Everything is classic scripts loaded directly by Chrome, with no build
step.

**Tech Stack:** Chrome MV3, plain HTML/CSS/JS, `node --test` for tests, `linkedom` (dev only) for DOM
tests.

**Spec:** `docs/superpowers/specs/2026-11-16-visual-revamp-design.md`

## Global Constraints

- No new `permissions` or `host_permissions`. No new data leaves the browser beyond Google, Graph and
  the existing Discord feedback.
- No build step. Shipped files are classic scripts, except `popup.js`, which stays `type="module"`.
- Every file under `src/` that both the browser and Node use ends with
  `if (typeof module !== 'undefined') module.exports = …;` and in the browser assigns to
  `globalThis.ScheduleScoop.<name>`.
- Timezone is always `America/Toronto`. Neutral events carry `YYYY-MM-DD` and `HH:MM` strings, never
  `Date` objects.
- Term codes: `'10'` Winter, `'20'` Summer, `'30'` Fall. Carleton term id = `year + code`, e.g.
  `'202710'`.
- User-facing name is "ScheduleScoop" everywhere. "NeuroNest", "Timetable Tools" and "yawndeer"
  must not appear in any shipped file.
- Copy is sentence case, with no "please", no "successfully" and no "!".
- Manifest `version` is `"3.0.0"`.
- Personal data (names, student numbers, real course lists) only ever goes in
  `tests/fixtures/private/` (git-ignored). Run `git diff --cached` before every commit and check for
  it.
- Commit messages carry no AI attribution lines.

## Review Focus

1. A section with time "TBA" or no meeting row (online or async courses) is skipped and counted in
   "N courses had no set times and were skipped". It must not crash or emit an event at 00:00
   (Task 3).
2. A meeting on several days ("MWF") produces one event per day, each starting on its own first
   date (Task 3).
3. A class that meets on the term's last day in the evening (e.g. 18:05–20:55) still includes that
   last occurrence (Task 4 `UNTIL` test).
4. A term whose first day is a Wednesday, with a Monday tutorial, starts in week two. A Thursday
   tutorial starts in week two too (today's rule, kept) (Task 3).
5. Summer sections with different date ranges (early vs late summer) each use their own start and
   end dates, not the first section's (Task 7 fixture test plus Task 3).

---

### Task 0: Branch and tooling

**Files:**
- Create: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1:** `git switch -c revamp-v3`
- [ ] **Step 2:** Create `package.json` with `"private": true`, `"scripts": {"test": "node --test tests/"}`,
  and `"devDependencies": {"linkedom": "^0.18.0"}`. Run `npm install`.
- [ ] **Step 3:** Add `node_modules/` to `.gitignore`. The line `tests/fixtures/private/` is already
  there, so keep it.
- [ ] **Step 4:** Run `npm test`. Expected: exits 0 with "tests 0".
- [ ] **Step 5:** Commit `package.json package-lock.json .gitignore docs/superpowers/` with the message
  "Add revamp design, plan and test tooling".

### Task 1: Terms, times and dates

**Files:**
- Create: `src/schedule.js`
- Test: `tests/schedule-basics.test.js`

**Interfaces:**
- Produces, on `ScheduleScoop.schedule`:
  - `termLabel(code: string, year: string) -> string`, e.g. `('10','2027') → 'Winter 2027'`
  - `defaultTerm(now: Date) -> {code: string, year: string}`
  - `yearOptions(now: Date) -> string[]`, which is current year −1, current, +1
  - `parseTime12(s: string) -> string|null`, e.g. `'2:30 pm' → '14:30'`, `'TBA' → null`
  - `parseCarletonDate(s: string) -> string|null`, e.g. `'Jan 06, 2027' → '2027-01-06'`. Confirm the
    format against the fixture in Task 7, and change the parser there if it differs.
  - `addDays(iso: string, n: number) -> string` and `weekday(iso: string) -> number` (0 = Sun). Both
    use `Date.UTC` internally so they ignore the local timezone.

- [ ] **Step 1: Write failing tests**

```js
test('defaultTerm', () => {
  assert.deepEqual(defaultTerm(new Date(2026, 0, 15)), {code:'10', year:'2026'});
  assert.deepEqual(defaultTerm(new Date(2026, 4, 1)),  {code:'20', year:'2026'});
  assert.deepEqual(defaultTerm(new Date(2026, 10, 17)),{code:'30', year:'2026'});
  assert.deepEqual(defaultTerm(new Date(2026, 11, 2)), {code:'10', year:'2027'});
});
test('yearOptions', () => assert.deepEqual(yearOptions(new Date(2026,10,17)), ['2025','2026','2027']));
test('parseTime12', () => {
  assert.equal(parseTime12('8:35 am'), '08:35');
  assert.equal(parseTime12('12:05 pm'), '12:05');
  assert.equal(parseTime12('12:30 am'), '00:30');
  assert.equal(parseTime12('6:05 pm'), '18:05');
  assert.equal(parseTime12('TBA'), null);
});
test('parseCarletonDate', () => assert.equal(parseCarletonDate('Jan 06, 2027'), '2027-01-06'));
test('date math ignores TZ', () => {
  assert.equal(addDays('2027-03-13', 1), '2027-03-14');
  assert.equal(weekday('2027-01-06'), 3);
});
test('termLabel', () => assert.equal(termLabel('30','2026'), 'Fall 2026'));
```

- [ ] **Step 2:** Run `TZ=Asia/Tokyo npm test`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement these in `src/schedule.js` using the browser/Node export pattern from the
  Global Constraints.
- [ ] **Step 4:** Run `TZ=Asia/Tokyo npm test` and `TZ=America/Toronto npm test`. Expected: both PASS.
- [ ] **Step 5:** Commit with the message "Add term and date helpers".

### Task 2: Skipped dates (reading week and holidays)

**Files:**
- Modify: `src/schedule.js`
- Test: `tests/skipped-dates.test.js`

**Interfaces:**
- Produces: `skippedDates(code: string, year: string) -> string[]`, sorted ISO dates (weekdays only)
  on which there are no classes.

Rules:
- **Winter:** Mon–Fri of the week containing Family Day (third Monday of February), plus Good Friday.
- **Fall:** the fall-break Mon–Fri from `FALL_BREAK_MONDAY` (a table keyed by year), plus Thanksgiving
  (second Monday of October) and Labour Day (first Monday of September).
- **Summer:** Victoria Day (the Monday before May 25), Canada Day (Jul 1, if a weekday) and Civic
  Holiday (first Monday of August).
- Fill `FALL_BREAK_MONDAY` for 2025–2030 from Carleton's published academic calendar
  (carleton.ca/calendars or the Registrar's "academic dates" page). Use only years you can confirm.
  If a year isn't in the table, fall back to the Monday of the last full Mon–Fri week of October.
- Good Friday comes from Easter (anonymous Gregorian algorithm) minus 2 days.

- [ ] **Step 1: Write failing tests**

```js
test('winter break is Family Day week', () => {
  const d = skippedDates('10','2027');           // Family Day 2027 = Feb 15
  for (const x of ['2027-02-15','2027-02-16','2027-02-17','2027-02-18','2027-02-19']) assert.ok(d.includes(x));
  assert.ok(d.includes('2027-03-26'));           // Good Friday 2027
});
test('fall has break + thanksgiving', () => {
  const d = skippedDates('30','2026');
  assert.ok(d.includes('2026-10-12'));           // Thanksgiving
  assert.equal(d.filter(x => x.startsWith('2026-10-2') || x.startsWith('2026-10-3')).length >= 5, true);
});
test('fall fallback for unlisted year', () => {
  assert.ok(skippedDates('30','2040').includes('2040-10-22')); // last full Mon–Fri week of Oct 2040 starts Oct 22
});
test('summer holidays', () => {
  const d = skippedDates('20','2027');
  for (const x of ['2027-05-24','2027-07-01','2027-08-02']) assert.ok(d.includes(x));
});
test('no weekends', () => assert.ok(skippedDates('20','2028').every(x => ![0,6].includes(weekday(x)))));
```

Check the 2040 date by hand before relying on it. Oct 31 2040 is a Wednesday, so the last full
Mon–Fri week is Oct 22–26.

- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `skippedDates`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Skip reading week and statutory holidays".

### Task 3: Building events from sections

**Files:**
- Modify: `src/schedule.js`
- Test: `tests/build-events.test.js`

**Interfaces:**
- Consumes: Task 1 helpers and `skippedDates`.
- Section, the scraper output in Task 7:
  `{code:'COMP 3106', section:'B', name:'Intro to AI', type:'Lecture', crn:'31234', instructor:'…',
    meetings:[{days:'MW', start:'08:35'|null, end:'09:55'|null, location:'SA 302'|'', startDate:'2027-01-06', endDate:'2027-04-09'}]}`
- Produces: `buildEvents(sections, {code, year, labsBiweekly: boolean}) -> {events: Event[], skippedSections: number}`
- Event:
  `{uid, title, description, location, date:'YYYY-MM-DD', start:'HH:MM', end:'HH:MM', byDay:'MO', interval:1|2, until:'YYYY-MM-DD', exDates:string[]}`
  - `title` is `` `${code} ${type}` ``, e.g. `'COMP 3106 Lecture'`
  - `description` has these lines: name, `Section B`, instructor, `CRN 31234`, location (or
    `Location TBA`)
  - `uid` is `` `${code}-${section}-${byDay}-${year}${termCode}@schedulescoop` `` with spaces removed.
    It must be stable across runs.
  - `exDates` holds only dates that are real occurrences: dates stepped from `date` by
    `interval*7` days up to `until`, that also appear in `skippedDates`.
- Rules:
  - Day letters are `M T W R F`, mapped to `MO TU WE TH FR`.
  - First date: the first matching weekday on or after `startDate`. If the type contains `tutorial`
    or `lab`, add 7 days unless the target weekday is earlier in the week than `startDate`'s weekday.
    This is today's `adjustStartDateToDay` rule, kept as is.
  - `interval` is 2 only when the type contains `lab` and `labsBiweekly` is true.
  - A meeting with `start === null` contributes nothing. A section where every meeting is null
    increments `skippedSections`.

- [ ] **Step 1: Write failing tests.** The asserted values below come from the rules above. Term starts
  Wed 2027-01-06 and ends Fri 2027-04-09.
  - `lecture MW → two events, first dates 2027-01-06 (WE) and 2027-01-11 (MO)`
  - `tutorial on Monday → 2027-01-11 (target earlier in week, no extra week)`
  - `tutorial on Thursday → 2027-01-14 (week two)`
  - `lab with labsBiweekly=true → interval 2; labsBiweekly=false → interval 1`
  - `weekly Wednesday lecture has exDates ['2027-02-17']; Friday lecture has ['2027-02-19','2027-03-26']`
  - `biweekly Wednesday lab → first 2027-01-13 (week two); occurrences 01-13, 01-27, 02-10, 02-24… so exDates []`
  - `TBA section → events [] and skippedSections 1`
  - `title/description/uid format as specified; uid identical across two calls`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `buildEvents`.
- [ ] **Step 4:** Run `TZ=Asia/Tokyo npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Build neutral events from sections".

### Task 4: ICS output

**Files:**
- Modify: `src/schedule.js`
- Test: `tests/ics.test.js`

**Interfaces:**
- Produces:
  - `toICS(events: Event[], {now: Date}) -> string`
  - `icsFilename(code, year) -> 'ScheduleScoop-Winter-2027.ics'`

Requirements:
- `PRODID:-//ScheduleScoop//Timetable Export//EN`
- Include a `VTIMEZONE` block for America/Toronto with the standard EST/EDT rules.
- Use CRLF line endings everywhere.
- Escape `\ ; ,` and newlines in TEXT values.
- Fold lines at 75 octets (count UTF-8 bytes, continuation lines start with a space).
- Each VEVENT has `UID`, `DTSTAMP` (UTC from `now`), `DTSTART;TZID=America/Toronto:YYYYMMDDTHHMMSS`,
  `DTEND`, `RRULE:FREQ=WEEKLY;INTERVAL=n;BYDAY=XX;UNTIL=…;WKST=SU`, one
  `EXDATE;TZID=America/Toronto:` per exDate (at the class start time), `SUMMARY`, `DESCRIPTION` and
  `LOCATION`.
- `UNTIL` is `(until + 1 day)` + `T045959Z`. That's 23:59:59 EST or 00:59:59 EDT, so it always
  covers an evening class on the last day.

- [ ] **Step 1: Write failing tests**
  - Every line ends with `\r\n`, and no bare `\n` remains after removing `\r\n`.
  - A name `'Ethics, Law; and AI\\'` appears as `Ethics\, Law\; and AI\\\\`.
  - A 200-character description folds into lines of ≤ 75 bytes, and unfolding restores it.
  - For an event with until `2027-04-09`, the output contains `UNTIL=20270410T045959Z`.
  - For an exDate `2027-02-17` at 08:35, it contains `EXDATE;TZID=America/Toronto:20270217T083500`.
  - Two calls produce the same UIDs.
  - `icsFilename('10','2027') === 'ScheduleScoop-Winter-2027.ics'`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `toICS` and `icsFilename`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Write RFC 5545 ICS with exclusions".

### Task 5: Google and Outlook payloads

**Files:**
- Modify: `src/schedule.js`
- Test: `tests/payloads.test.js`

**Interfaces:**
- Produces:
  - `toGoogleEvent(e: Event) -> object`
  - `toOutlookEvent(e: Event) -> object`

Requirements:
- **Google:** `start.dateTime` / `end.dateTime` are `'2027-01-06T08:35:00'`, with no offset and no `Z`,
  and `timeZone:'America/Toronto'`. `recurrence` is `['RRULE:…'` (same rule as ICS)`, 'EXDATE;TZID=America/Toronto:…'` (comma-joined)`]`,
  with the EXDATE entry left out when there are none.
- **Outlook:** `start.dateTime` is `'2027-01-06T08:35:00'` and `timeZone` is `'America/Toronto'`.
  `recurrence.pattern` is `{type:'weekly', interval, daysOfWeek:['wednesday'], firstDayOfWeek:'sunday'}`.
  `recurrence.range` is `{type:'endDate', startDate: e.date, endDate: e.until, recurrenceTimeZone:'America/Toronto'}`.
  Include `location` only when it's non-empty.

- [ ] **Step 1:** Write failing tests that assert the shapes above field by field, and run them under
  `TZ=Asia/Tokyo`.
- [ ] **Step 2:** Run `TZ=Asia/Tokyo npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both functions.
- [ ] **Step 4:** Run `TZ=Asia/Tokyo npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Build Google and Outlook payloads in Toronto wall time".

### Task 6: Calendar exporters

**Files:**
- Create: `src/export.js`
- Test: `tests/export.test.js`

**Interfaces:**
- Consumes: `toGoogleEvent` and `toOutlookEvent`.
- Produces, on `ScheduleScoop.exporters`:
  - `exportToGoogle(events, {token, fetch, onProgress(done,total)}) -> Promise<{created, failed}>`
  - `exportToOutlook(events, {token, fetch, onProgress}) -> Promise<{created, failed, skipFailures}>`
  - `downloadICS(text, filename, doc = document) -> void`

Requirements:
- POST sequentially with a 100 ms gap (the existing rate-limit behaviour).
- A 401 aborts with `Error('auth')`, so the status card can say "Sign-in expired".
- **Outlook:** after each created series that has exDates, call
  `GET https://graph.microsoft.com/v1.0/me/events/{id}/instances?startDateTime={d}T00:00:00&endDateTime={d+1}T00:00:00`
  with the header `Prefer: outlook.timezone="America/Toronto"`. Then DELETE each instance whose
  `start.dateTime` starts with `d`. Count failures in `skipFailures`, and don't throw for them.

- [ ] **Step 1:** Write failing tests with a fake `fetch` that records calls:
  - Google: 3 events → 3 POSTs to `.../calendars/primary/events`, `created 3`, and `onProgress`
    called with (1,3), (2,3), (3,3).
  - One POST returns 500 → `failed 1`, and the rest continue.
  - A 401 → rejects with `'auth'`.
  - Outlook: an event with exDates `['2027-02-17']` → POST, GET instances (URL contains
    `startDateTime=2027-02-17T00:00:00`), then DELETE of the matching instance id only.
  - A failing DELETE → `skipFailures 1`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Pass `setTimeout`-based sleep through an injectable `sleep` option that
  defaults to 100 ms, so tests can pass `0`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Add Google and Outlook exporters with holiday removal".

### Task 7: Scraping the schedule page

**Precondition:** an HTML file exists in `tests/fixtures/private/`. If none is there, stop and ask the
owner to save Carleton Central's Student Detail Schedule page there (Cmd+S, "Webpage, HTML only").

**Files:**
- Create: `src/carleton-parse.js`
- Create: `tests/fixtures/detail-schedule.sample.html` (anonymised)
- Test: `tests/parse.test.js`

**Interfaces:**
- Consumes: `parseTime12` and `parseCarletonDate`.
- Produces: `ScheduleScoop.parseSchedulePage(doc: Document) -> Section[]` (the shape from Task 3).

Steps:
- [ ] **Step 1:** Read the private fixture. Write down in a comment at the top of
  `src/carleton-parse.js` how the course table and meeting table are laid out: header table with a
  course link, then a meeting-times table. Note whether one course can have several meeting rows (the
  current code only reads row 2, which is a likely bug). Also note the date format, and whether
  final-exam rows appear. Read meeting rows by the header text (`Time`, `Days`, `Where`,
  `Date Range`, `Schedule Type`), not by column position.
- [ ] **Step 2:** Make the anonymised sample. Copy the private file. Replace the student name, student
  number and instructor names with `Student Example` / `Instructor A`, and keep at most 4 courses.
  Include one TBA/online course, and if the source has one, a course with two meeting rows. Run
  `grep -i` for the real name and student number on the sample. Expected: no matches.
- [ ] **Step 3:** Write failing tests:
  - The sample parses to the exact expected `Section[]` (written by hand from the sample).
  - If the private fixture exists, it parses with no section missing `code`, every non-TBA meeting has
    `start`, `end`, `startDate` and `endDate`, and the course count equals the number of course
    links on the page. Skip this test with `t.skip` when the private file is absent.
- [ ] **Step 4:** Run `npm test`. Expected: FAIL.
- [ ] **Step 5:** Implement `parseSchedulePage` using standard DOM only (it runs on the page and in
  linkedom).
- [ ] **Step 6:** Run `npm test`. Expected: PASS.
- [ ] **Step 7:** Run `git diff --cached`. Confirm no personal data, then commit with the message
  "Parse the detail schedule by header names".

### Task 8: Status card

**Files:**
- Create: `src/status-card.js`
- Create: `tests/manual/status-card.html` (loads the script and buttons that trigger each state)

**Interfaces:**
- Produces on `ScheduleScoop.statusCard`:
  - `show({state, title, detail?, progress?:{done,total}, actions?:[{label, primary?, onClick}], link?:{label, href}})`
  - `hide()`
  - `state` is `'working' | 'progress' | 'success' | 'error' | 'confirm'`

Requirements:
- A single host element `#schedulescoop-status`, fixed at the bottom-right with z-index 2147483647
  and an attached `shadowRoot` (mode `closed`). All styles live inside it, using the same tokens as
  `popup.css` (light and dark through `prefers-color-scheme`).
- Calling `show` again updates the card in place.
- It has `role="status"` and `aria-live="polite"`. Errors use `role="alert"`.
- A close button is always present, except in `confirm`.
- [ ] **Step 1:** Implement the module and the manual page.
- [ ] **Step 2:** Serve the repo (`python3 -m http.server 8765`). Open
  `http://localhost:8765/tests/manual/status-card.html` in the browser pane. Click through all five
  states in light and dark mode. Expected: each one renders like the mockup, with the progress bar
  moving and buttons that work by keyboard.
- [ ] **Step 3:** Commit with the message "Add in-page status card".

### Task 9: Export runner on Carleton Central, background and manifest

**Files:**
- Create: `src/carleton.js` (replaces `carleton-timetables.js`, which is deleted)
- Modify: `background.js`, `manifest.json`

**Interfaces:**
- Consumes: everything above.
- Storage it reads (`chrome.storage.local`):
  - `carleton`: `[code, year, …]` (legacy array, read `[0]` and `[1]`)
  - `selected-calendar`: `'google'|'outlook'|'ics'`
  - `labs-biweekly`: boolean, default `true`
  - `privacy_policy_agreement`: `[true, …]`
  - `export-history`: `{ "<code>-<year>-<calendar>": ISO }`
- Session: `timetable-requested`: `[true, 'carleton', file]` (unchanged contract)

Behaviour, a page-title state machine kept from the old file:
- On "Sign out", use `location.href` = SSO URL (this runs in the page, which is fine).
- On "Main Menu", "Student Timetable" and "Registration Term", show
  `working "Opening your timetable…"` and navigate as today. A term missing from `#term_id` gives
  error "{Term} isn't on your Carleton account. Pick another term in ScheduleScoop."
- On "Student Detail Schedule":
  1. Show `working "Reading {Term}…"`.
  2. Run `parseSchedulePage`, then `buildEvents`.
  3. With 0 events, show error "No classes with set times found for {Term}."
  4. If `export-history` has the key, show `confirm` with "You already exported {Term} to {Calendar} on
     {Mon D}. Export again? This will create duplicates.", and the actions Export again / Cancel.
  5. Export with progress, then show `success` "Added {n} events to {Calendar}". For Google, add the
     link "Open Google Calendar" → `https://calendar.google.com/calendar/r/week/{date of first event as YYYY/MM/DD}`.
     For .ics, say "Downloaded {filename}". Add detail lines for `skippedSections` and
     `skipFailures` when they're non-zero.
  6. Write `export-history`, then send `end-timetable-request`.
- Every error path sends `end-timetable-request`. No `alert()` remains anywhere
  (`grep -rn "alert(" src popup.js background.js` → nothing).
- `background.js`:
  - In `onCommitted`, replace `window.location.href = …` with
    `chrome.tabs.update(details.tabId, {url: SSO_URL})`.
  - `injectScript` injects `['src/schedule.js','src/carleton-parse.js','src/export.js','src/status-card.js','src/carleton.js']`.
  - Delete the `closeTempTabs`, `log_calendar` and `update_agreement` handlers.
  - Keep the Google and Outlook token handlers as they are.
- `manifest.json`:
  - `version "3.0.0"`
  - `description "Export your Carleton timetable to Google Calendar, Outlook or an .ics file"`
  - Remove `web_accessible_resources`.

- [ ] **Step 1:** Implement `src/carleton.js` and the edits.
- [ ] **Step 2:** Run `npm test`. Expected: PASS.
- [ ] **Step 3:** Run `grep -rniE "alert\(|neuronest|timetable tools|yawndeer" src background.js manifest.json`.
  Expected: no output.
- [ ] **Step 4:** Load the unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load
  unpacked) and open the service worker console. Expected: no errors on load.
- [ ] **Step 5:** Commit with the message "Run exports through the status card; fix logout redirect".

### Task 10: Popup rebuild

**Files:**
- Rewrite: `popup.html` and `popup.js`
- Create: `popup.css`
- Create: `tests/manual/chrome-stub.js` and `tests/manual/popup-preview.html`
- Delete: `styles/`, `boxicons-2.1.4/`, `tests/webhook-test.txt`

**Interfaces:**
- Consumes: `defaultTerm`, `yearOptions` and `termLabel`. Load `src/schedule.js` with a classic
  `<script>` before the `popup.js` module.
- Writes the storage keys listed in Task 9, plus:
  - `seen-version`: `{version:'3.0.0', opens:n}`
  - `feedback-last-sent`: ms timestamp

Requirements (layout per the spec mockup, 360 px wide):
- **Term:** a segmented radio group (Winter/Summer/Fall) plus a year `<select>` from `yearOptions`.
  Changes save immediately to `carleton` as `[code, year, true]`.
- **Labs:** a segmented switch, "Labs every week" / "Every 2 weeks", saved to `labs-biweekly`.
- **Calendar:** a 3-card radio group. The Outlook note shows only when Outlook is selected.
- **Export button:** labelled "Export {Term}". On click, do the same thing as today's `injectCarleton`:
  if the active tab matches `central.carleton.ca/prod/bwskfshd.P_CrseSchdDetl`, inject; otherwise set
  session and send `newCarletonTempTab`. Show "Opening Carleton Central…" for 1.5 s, then
  `window.close()`.
- **First run:** an inline privacy card with a checkbox and a Continue button. Export is disabled until
  it's accepted. Save `privacy_policy_agreement = [true, <date>, false]`.
- **Header:** "ScheduleScoop" and a `v3` pill. While `seen-version.opens < 3`, the pill reads
  "v3 · new" and a dismissible line under it says "New look, skips reading week, weekly-lab option".
  Dismissing it sets `opens` to 3.
- **Footer:**
  - GitHub (`https://github.com/nolandruid/schedule-scoop`)
  - Privacy (`https://github.com/nolandruid/schedule-scoop/blob/main/ext-privacy-policy.md`)
  - Feedback
  - "Made by Nolan and Siddig", linking to the existing two LinkedIn URLs
- **Feedback:** a `<dialog>` with an optional email and a required message (`maxlength=2000`). Keep the
  Discord webhook `sendFeedback` payload as is. If `feedback-last-sent` is under 60 s ago, show
  "You just sent feedback. Try again in a minute." and don't send. Show success and failure inline in
  the dialog.
- **CSS:** system font stack, tokens on `:root` with a dark override under
  `@media (prefers-color-scheme: dark)`, one accent, visible `:focus-visible` rings,
  `prefers-reduced-motion`, and inline SVG icons (Google and Microsoft logos stay as the existing PNGs).
- **Preview harness:** `chrome-stub.js` fakes `chrome.storage.local/session` (in memory),
  `chrome.tabs.query/create`, `chrome.runtime.sendMessage/getManifest` and `chrome.scripting`.
  `popup-preview.html` loads the stub, then `src/schedule.js`, then fetches `/popup.html`, copies its
  body and stylesheet in, and imports `/popup.js`.

- [ ] **Step 1:** Implement the popup and the harness.
- [ ] **Step 2:** In the browser pane at `http://localhost:8765/tests/manual/popup-preview.html`, check
  the following:
  - first-run card blocks Export
  - after Continue, the default term is Fall 2026 (today is 2026-11-17)
  - every control saves (inspect the stub storage in the console)
  - the Outlook note toggles
  - keyboard-only navigation works
  - dark mode via `resize_window colorScheme: dark`
  - no console errors
- [ ] **Step 3:** Run `grep -rniE "neuronest|timetable tools|yawndeer|fonts.googleapis|boxicons" popup.* src`.
  Expected: no output.
- [ ] **Step 4:** Commit with the message "Rebuild popup for v3".

### Task 11: Docs, final checks and handoff

**Files:**
- Modify: `README.md`, `docs/tasks.md` (title to "ScheduleScoop", tick the items this work covers),
  and `ext-privacy-policy.md` (rename any old product names only, with no policy changes)

- [ ] **Step 1:** Update the README features list: reading-week skip, weekly or biweekly labs, and the
  status card. Remove the "Keep the tab open ~10 seconds" phrasing in favour of the status card.
- [ ] **Step 2:** Run `TZ=Asia/Tokyo npm test && TZ=America/Toronto npm test`. Expected: all PASS.
- [ ] **Step 3:** Run
  `git grep -niE "neuronest|timetable tools|yawndeer"`. Expected: matches only in
  `docs/superpowers/` (history).
- [ ] **Step 4:** Commit with the message "Update docs for v3".
- [ ] **Step 5:** Hand the owner this live checklist and stop until they report back:
  - Load unpacked, then export Winter 2027 (or the current term) to `.ics`. Import it into Apple or
    Google Calendar. Check one lecture, one tutorial (week two) and one lab, and check that reading
    week is empty.
  - Export the same term to Google, then delete the events afterwards.
  - Export to Outlook (personal account), and check that the reading-week instances are gone.
  - Export the same term to Google a second time. The duplicate warning should appear.
- [ ] **Step 6:** After the owner confirms, push `revamp-v3` to `origin` (Siddigz). Ask the owner
  whether the PR targets the fork's `main` or `nolandruid/schedule-scoop`, then open it with `gh pr create`.
