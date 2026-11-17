# ScheduleScoop visual revamp: design

Date: 2026-11-16

## Intent

ScheduleScoop is a Chrome extension (Manifest V3) for Carleton students. It signs into Carleton
Central, opens the Student Detail Schedule for a chosen term, scrapes the classes, and exports them to
Google Calendar, Outlook or an `.ics` file.

The owner wants three things:

1. **A visual revamp.** The popup and every message a student sees during an export should look
   clean and modern.
2. **Everything works perfectly.** Export results must be correct, and the known bugs fixed.
3. **Small additions** that make it nicer to use, picked by the builder (listed below).

The owner left visual and technical calls to the builder. This document records those calls.

## Goals

- A one-screen popup: pick a term, pick a calendar, press Export.
- Light and dark themes that follow the system setting.
- No more browser `alert()` boxes during an export. A status card injected into the Carleton page
  shows each step, then success or a clear error.
- Correct events in all three exports: right times, right dates, tutorials and labs starting in
  week two (as today), labs weekly or every two weeks per the student's choice, and no classes on
  reading week.
- Fix every bug listed under "Fixes".
- Automated tests for the parts that don't need a live Carleton sign-in.

## Non-goals

- Supporting other universities. The hidden school picker is removed.
- Apple Calendar or CalDAV export (already commented out; it stays out).
- "Individual" export mode, meaning one file per course (already disabled; it gets removed).
- A framework or build step. It stays plain HTML, CSS and JS, loaded directly by Chrome.
- Changing the OAuth client IDs or scopes.

## Anti-goals (failure even if it technically works)

- Events land at the wrong time or on the wrong days for any student. Correctness beats looks.
- Extra Chrome permissions or new data leaving the browser. The privacy policy promises local
  processing, and a Web Store re-review over new permissions is not wanted.
- Personal data (names, student numbers, real timetables) committed to this public repo.

## Constraints

- Both `nolandruid/schedule-scoop` (upstream) and `Siddigz/schedule-scoop` are **public**.
- Popup width is 320px today. Chrome popups max out at 800×600.
- Content scripts are injected with `chrome.scripting.executeScript({files})`, so they can't be
  ES modules. Shared code must load as classic scripts.
- The builder can't sign in to Carleton Central. End-to-end checks against the live site are done
  by the owner. Automated tests run against a saved HTML fixture (see open questions).
- Carleton Central page titles and markup ("Main Menu", "Student Timetable", "Registration Term",
  "Student Detail Schedule", `table.datadisplaytable`) are the scraping contract. Don't change how
  they are detected unless a fix requires it.

## Approaches considered

1. **Rebuild the popup (chosen).** A new single-screen `popup.html`/`popup.css`/`popup.js` and an
   in-page status card. The dropdown accordion, config overlay, banner overlay and dead handlers are
   removed. `popup.js` goes from about 860 lines to about 250. Chosen because most of the clunkiness is
   in the structure, not the colours, and less code means fewer places to break.
2. **Reskin in place.** Only `style.css` is replaced. Lower risk, but it keeps the dropdown-and-overlay
   flow and the dead code that hides bugs.
3. **Framework rewrite (Preact/Vite).** Rejected because it adds a build step and dependencies for one
   small popup.

## The design

### Popup (one screen, 360px wide)

```
┌──────────────────────────────────┐
│ 📅 ScheduleScoop        [v3 new] │
│                                  │
│ TERM                             │
│ [Winter] [Summer] [Fall]  [2027▾]│
│                                  │
│ CALENDAR                         │
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │  G   │ │  O   │ │ .ics │       │
│ │Google│ │Outlk │ │ File │       │
│ └──────┘ └──────┘ └──────┘       │
│ ⓘ Outlook: personal accounts     │
│   only (cmail isn't supported)   │  ← only when Outlook is selected
│                                  │
│ [   ⬇  Export Winter 2027    ]   │
│ Sign in to Carleton Central      │
│ first. Takes about 10 seconds.   │
│──────────────────────────────────│
│ GitHub · Privacy · Feedback      │
│ Made by Nolan & Siddig           │
└──────────────────────────────────┘
```

- **Term:** three segmented buttons plus a year `<select>`. The year list is built at runtime as
  the current year −1 to +1. The default term is the existing rule: Jan–Mar Winter, Apr–Jul Summer,
  Aug–Nov Fall, Dec → next year's Winter. Changing either control saves right away (no Save/Reset
  buttons).
- **Labs:** a two-option switch, "Labs every week / every 2 weeks". The default is every 2 weeks
  (today's behaviour). The choice is saved right away and only affects sections whose schedule type
  contains "lab".
- **Calendar:** three selectable cards (radio-group semantics). The choice is saved right away.
  The default is Google.
- **Export button:** its label names the term. While an export runs it shows a busy state, and the
  popup can close safely because the work runs in the Carleton tab.
- **First run:** the privacy-policy agreement becomes an inline card at the top of the same screen.
  It has a link, a checkbox and "Continue", and Export stays disabled until it is accepted. It is
  stored as before (`privacy_policy_agreement`), so people who already agreed aren't asked again.
- **Footer:** GitHub, Privacy Policy (fixed link), Feedback (the existing Discord form, restyled; see fix #1), credits. The
  hidden "theme" and "coffee" buttons are removed.
- **Visual language:** system font stack (no remote Google Fonts). Colours are defined once as CSS
  custom properties for light and dark. There is one accent colour. Boxicons is dropped in favour of a
  few inline SVG icons. Focus rings are visible, full keyboard use works, and there are ARIA labels and
  `prefers-reduced-motion` support.

### In-page status card (on Carleton Central)

A fixed card in the bottom-right corner of the Carleton tab, isolated in a Shadow DOM so Carleton's
CSS can't break it, and styled like the popup. It shows these steps:

1. "Opening your timetable…" (while it navigates Main Menu → Student Timetable → Registration Term)
2. "Reading Winter 2027…"
3. "Found 7 courses, adding 14 events" with a progress bar (Google/Outlook), or "Downloading
   Winter-2027.ics"
4. Success: "Added 14 events to Google Calendar ✓" with a close button and, for Google, an "Open
   calendar" link. Or an error in plain words with what to do next (e.g. "Winter 2027 isn't on your
   Carleton account. Pick another term in ScheduleScoop.")

Every current `alert()` maps to one of these states.

### Skipped dates: reading week and holidays (owner asked for reading week)

Every recurring class gets its occurrences removed on:
- **Reading week.** Winter: the week (Mon–Fri) containing Family Day (third Monday of February).
  Fall: Carleton's fall break week in late October. It isn't a fixed rule, so `src/schedule.js` holds
  a small table of fall-break Mondays by year (2025–2030, from Carleton's academic calendar), with a
  fallback to the last full Mon–Fri week of October for years not listed. Summer: none.
- **Statutory holidays inside the term (builder's call, same mechanism):** Thanksgiving (second
  Monday of October), Good Friday, Victoria Day, Canada Day, Civic Holiday (first Monday of
  August). These are computed, not tabled.

How each export skips them:
- `.ics` and Google: `EXDATE;TZID=America/Toronto:` lines on each recurring event, one per skipped
  occurrence.
- Outlook: Graph doesn't take exclusions on create. After creating each series, call
  `GET /me/events/{id}/instances?startDateTime=…&endDateTime=…` for the skipped ranges and `DELETE`
  each matching instance. Failures here are counted and reported in the status card ("2 holiday
  classes couldn't be removed") but don't fail the export.

The biweekly rule counts weeks from the first meeting regardless of skips (a lab skipped by reading
week is not shifted). This matches what calendar apps do with `INTERVAL=2` + `EXDATE`.

### New-version marker (owner asked)

- A small "v3" pill next to the ScheduleScoop name in the popup header, always shown.
- For the first three popup opens after updating, the pill reads "v3 · new" and a one-line
  dismissible card under the header says "New look, skips reading week, weekly-lab option".
  Stored as `seenVersion` in `chrome.storage.local`.

### Duplicate warning (small addition)

After a successful export, store `{term, calendar, exportedAt}` in `chrome.storage.local`. If the
same term and calendar are exported again, the status card asks "You already exported Winter 2027 to
Google on Nov 3. Export again? This will create duplicates." with Export again and Cancel. Nothing
gets deleted from the student's calendar.

### Fixes

| # | Problem | Fix |
|---|---------|-----|
| 1 | Discord webhook URL is hardcoded in a public repo, so anyone can post to it | Owner chose to keep the Discord feedback form. Restyle it to match, and add a simple client-side limit (one send per minute, max 2,000 characters) so a single user can't flood it |
| 2 | `background.js` uses `window.location` in the service worker, which crashes when the logout redirect fires | Use `chrome.tabs.update(details.tabId, {url})` |
| 3 | Privacy Policy links point to `.../ext-privacy-policy` (404) | Point to `.../ext-privacy-policy.md` |
| 4 | Year list is hardcoded 2025–2027 | Generate it at runtime |
| 5 | Google events are built with `toISOString()`, so they're off by hours if the computer isn't on Eastern time | Send local wall-clock `dateTime` strings (no `Z`) with `timeZone: America/Toronto`, as Outlook already does |
| 6 | `.ics` has no `UID`/`DTSTAMP`, uses LF line endings, doesn't escape `,;\` and isn't line-folded, so some apps reject it or import duplicates | Write RFC 5545-valid output: CRLF, escaping, folding at 75 octets, a stable `UID` per course/day/term, `DTSTAMP`, and a `VTIMEZONE` for America/Toronto |
| 7 | Old names "NeuroNest", "Timetable Tools", "yawndeer's stuff" in UI and alerts | Rename to ScheduleScoop everywhere, including `PRODID` and `docs/tasks.md`'s title |
| 8 | `web_accessible_resources` exposes all `.js`/`.html` to `<all_urls>` | Remove the block. Nothing needs it, since injection uses `executeScript` |
| 9 | `createAppleCalendarEvents` is referenced but not defined | Remove the branch with Apple |
| 10 | Disabled "Individual" mode is still reachable through the stored `carleton[2]` flag | Remove the mode. Always export combined |
| 11 | `.ics` filename uses the scraped student name | Name it `ScheduleScoop-Winter-2027.ics` |
| 12 | Popup loads Poppins from Google Fonts on every open | System font stack |
| 13 | Event title is `COMP 3106-B`, and the course name is only in the description | Title becomes `COMP 3106 Lecture` / `COMP 3106 Lab` (code + schedule type). Section, name, instructor, CRN and room go in the description |

### Code shape

- `src/schedule.js`: pure logic with no DOM or Chrome APIs. It handles term codes, default term, time
  parsing, first-meeting date (including the week-two rule for tutorials and labs), recurrence rules,
  and the neutral event list → ICS / Google payload / Outlook payload. It is a classic script that
  sets `globalThis.ScheduleScoop` and also works with `module.exports` for Node tests.
- `src/carleton.js` (was `carleton-timetables.js`): page navigation and table scraping, which builds
  the neutral event list and hands it to exporters.
- `src/status-card.js`: the Shadow DOM status card.
- `popup.html` / `popup.css` / `popup.js`: rebuilt.
- `background.js`: auth handlers kept. Dead `log_calendar`/`update_agreement` handlers and unused
  temp-tab tracking are removed.
- Delete: `styles/style.css`, `boxicons-2.1.4/`, `tests/webhook-test.txt`.
- Injection: `executeScript({files: ['src/schedule.js', 'src/status-card.js', 'src/carleton.js']})` in
  both the popup and background.
- Manifest version → `3.0.0`. The Web Store is already on 2.5.8, so a "v2" label would read as a
  downgrade (builder's call, owner asked for a visible new-version marker).

### Tests

- `node --test` (built in, no dependencies) on `src/schedule.js`: default term per month, 12-hour time
  parsing including 12 am/pm, first-meeting dates for lectures/tutorials/labs, biweekly labs, ICS
  validity (CRLF, escaping, folding, UID stability), Google and Outlook payloads producing
  Toronto wall-clock times when the test process runs in another `TZ`.
- A scraper test that loads a saved Student Detail Schedule page in a light DOM (e.g. `linkedom` as a
  dev dependency only) and checks the parsed course list. The real fixture is git-ignored. A
  hand-made, anonymised fixture is committed.
- Manual check by the owner on the live site: one export to each of Google, Outlook and `.ics`.

## Delivery

Work on a branch of `Siddigz/schedule-scoop` (the owner's fork), push it there, and open a pull
request. The PR's target (the fork's `main` or `nolandruid/schedule-scoop`) is confirmed with the
owner just before it is opened. Publishing to the Chrome Web Store is the owner's job.

## Test page

1. **Real page for scraper tests.** Settled: the owner saves the Student Detail Schedule page into
   `tests/fixtures/private/` (git-ignored) before the scraper work starts. The scraper and its tests
   are written against it. The committed fixture is an anonymised copy of it.

## Left to the builder

Exact colours, spacing and icon artwork; status-card wording; exact file names within the shape
above; how the duplicate record is keyed; test structure.
