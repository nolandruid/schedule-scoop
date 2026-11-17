# ScheduleScoop

A Chrome extension that exports your Carleton University timetable to Google Calendar, Outlook or an `.ics` file in a few clicks.

## What's new in v3

- **New look**: a single-screen popup with light and dark mode
- **Live status card**: progress and results show on the Carleton Central page instead of pop-up alerts
- **Reading week and holidays skipped**: no classes on reading week or statutory holidays
- **Weekly-lab option**: choose whether labs repeat every week or every 2 weeks
- **Duplicate warning**: exporting the same term to the same calendar twice asks first
- **More accurate calendars**: correct times in any timezone, and `.ics` files that import cleanly everywhere

## Features

- **Three destinations**: Google Calendar, Outlook (personal Microsoft accounts), or a standard `.ics` file
- **Lectures, tutorials and labs**: each scheduled with the right start week and recurrence
- **Reading week and holidays skipped**: see [Skipped days](#skipped-days)
- **Weekly or biweekly labs**: your choice
- **Clear event titles**: e.g. `COMP 3004 Lecture`, with the course name, section, instructor, CRN and room in the details
- **Any term**: Winter, Summer or Fall, last year through next year
- **Light and dark mode**: follows your system setting

## Installation

### From the Chrome Web Store
1. Open ScheduleScoop on the Chrome Web Store and click **Add to Chrome**
2. Pin the ScheduleScoop icon to your toolbar

### From source
1. Download or clone this repository
2. Open `chrome://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and choose the repository folder

## How to use

1. Click the ScheduleScoop icon in your toolbar
2. The first time, read the privacy policy, tick the box and click **Continue**
3. Pick your **term** and **year**
4. Pick a **calendar**: Google, Outlook or `.ics` file
5. Pick how often **labs** repeat: every week or every 2 weeks
6. Click **Export**. ScheduleScoop opens Carleton Central (sign in if asked)
7. Watch the status card in the bottom-right corner of the Carleton tab. It shows each step and tells you when your classes are in your calendar, or what went wrong
8. For Google or Outlook, finish the sign-in window that opens

Tip: signing in to Carleton Central before you click Export makes it faster.

## Calendar details

### Google Calendar
- Events go straight into your primary Google Calendar
- Sign-in uses Google's OAuth, and ScheduleScoop only asks to create calendar events
- When it's done, the status card links to the first week of your term

### Outlook
- Events go straight into your Outlook calendar through Microsoft Graph
- Works with personal Microsoft accounts only. Carleton (cmail) accounts aren't supported
- Reading-week and holiday classes are removed right after each series is created. If any can't be removed, the status card tells you how many

### `.ics` file
- Downloads as `ScheduleScoop-<Term>-<Year>.ics`, e.g. `ScheduleScoop-Winter-2027.ics`
- Import it into Apple Calendar, Google Calendar, Outlook or any other calendar app

## Course scheduling logic

All times are Ottawa time (America/Toronto), whatever timezone your computer is set to.

### Lectures
- Start in the first week of term and repeat weekly

### Tutorials
- Start in the **second week** of term and repeat weekly
- Carleton sometimes lists tutorial sections with the schedule type "Lecture". Those follow the lecture rule, since ScheduleScoop goes by what Carleton's page says

### Labs
- Start in the **second week** of term
- Repeat **every 2 weeks** by default, or **every week** if you pick that in the popup

### Skipped days
- **Reading week**: Winter is the week of Family Day (third Monday of February). Fall is Carleton's fall break in late October
- **Statutory holidays during the term**: Labour Day, Thanksgiving, Good Friday, Victoria Day, Canada Day (when it falls on a weekday) and the Civic Holiday

### Courses without set times
Online or asynchronous courses with no scheduled time ("TBA") are skipped, and the status card says how many.

## Privacy and security

- **Processed in your browser**: your timetable is read and turned into events locally, and sent only to the calendar you pick
- **Secure sign-in**: Google and Outlook use their official OAuth sign-in
- **Minimal permissions**: only the Carleton, Google and Microsoft sites the export needs
- **Open source**: the code is here for anyone to review

See the full [privacy policy](ext-privacy-policy.md).

## Troubleshooting

**"&lt;Term&gt; isn't on your Carleton account"**: you aren't registered for that term. Pick another term in the popup.

**"No classes with set times found"**: all your courses for that term are online or have no scheduled times yet.

**"You already exported &lt;Term&gt; to &lt;Calendar&gt;"**: exporting again adds a second copy of every class. Delete the first copy from your calendar, or click Cancel.

**"Your sign-in expired"**: click Export again to sign in. If some events were already added, the card says how many. Delete those first to avoid duplicates.

**Nothing happens after clicking Export**: make sure you're signed in to Carleton Central, then try again.

**Outlook sign-in fails**: use a personal Microsoft account (Outlook.com, Hotmail, Live). Carleton cmail accounts aren't supported.

## Feedback

Use the **Feedback** link at the bottom of the popup, or open an issue on GitHub.

## Development

- No build step: the extension loads straight from the repository folder
- `npm install`, then `npm test` runs the unit tests with Node's built-in test runner
- `src/schedule.js` holds the date and calendar logic (pure functions, fully tested)
- `src/carleton-parse.js` reads the Student Detail Schedule page
- `src/export.js` talks to Google and Microsoft Graph and downloads `.ics` files
- `src/status-card.js` is the in-page status card
- `src/carleton.js` runs the export on Carleton Central
- `popup.html`, `popup.css` and `popup.js` are the popup
- To preview the popup or status card in a normal browser tab, serve the repository root (e.g. `python3 -m http.server`) and open `tests/manual/popup-preview.html` or `tests/manual/status-card.html`
- Saved Carleton pages for local testing go in `tests/fixtures/private/`, which git ignores. Never commit real timetables
- When packaging for the Chrome Web Store, leave out `node_modules/`, `tests/` and `docs/`

## License

This project is licensed under the terms in the [LICENSE](LICENSE) file.
