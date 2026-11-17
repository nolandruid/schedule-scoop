const test = require('node:test');
const assert = require('node:assert/strict');
const { toICS, icsFilename } = require('../src/schedule.js');

const NOW = new Date(Date.UTC(2026, 10, 17, 15, 4, 5));
const event = (extra = {}) => ({
  uid: 'COMP3106-B-WE-0835-202710@schedulescoop',
  title: 'COMP 3106 Lecture',
  description: 'Intro to AI\nSection B',
  location: 'SA 302',
  date: '2027-01-06', start: '08:35', end: '09:55', byDay: 'WE', interval: 1, until: '2027-04-09',
  exDates: ['2027-02-17'],
  ...extra,
});
const unfold = (s) => s.replace(/\r\n /g, '');

test('uses CRLF line endings only', () => {
  const ics = toICS([event()], { now: NOW });
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!ics.replace(/\r\n/g, '').includes('\n'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ScheduleScoop//Timetable Export//EN\r\n'));
  assert.ok(ics.includes('BEGIN:VTIMEZONE\r\nTZID:America/Toronto\r\n'));
});

test('escapes text values', () => {
  const ics = unfold(toICS([event({ title: 'Ethics, Law; and AI\\' })], { now: NOW }));
  assert.ok(ics.includes('SUMMARY:Ethics\\, Law\\; and AI\\\\\r\n'));
  assert.ok(ics.includes('DESCRIPTION:Intro to AI\\nSection B\r\n'));
});

test('folds long lines at 75 octets and unfolds back', () => {
  const long = 'é'.repeat(30) + 'x'.repeat(170);
  const ics = toICS([event({ description: long })], { now: NOW });
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, line);
  assert.ok(unfold(ics).includes(`DESCRIPTION:${long}\r\n`));
});

test('event fields, UNTIL covering the last evening, and EXDATE', () => {
  const ics = unfold(toICS([event()], { now: NOW }));
  assert.ok(ics.includes('UID:COMP3106-B-WE-0835-202710@schedulescoop\r\n'));
  assert.ok(ics.includes('DTSTAMP:20261117T150405Z\r\n'));
  assert.ok(ics.includes('DTSTART;TZID=America/Toronto:20270106T083500\r\n'));
  assert.ok(ics.includes('DTEND;TZID=America/Toronto:20270106T095500\r\n'));
  assert.ok(ics.includes('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=WE;UNTIL=20270410T045959Z;WKST=SU\r\n'));
  assert.ok(ics.includes('EXDATE;TZID=America/Toronto:20270217T083500\r\n'));
  assert.ok(ics.includes('LOCATION:SA 302\r\n'));
});

test('no EXDATE line when nothing is skipped; output is stable', () => {
  const a = toICS([event({ exDates: [] })], { now: NOW });
  assert.ok(!a.includes('EXDATE'));
  assert.equal(a, toICS([event({ exDates: [] })], { now: NOW }));
});

test('icsFilename', () => {
  assert.equal(icsFilename('10', '2027'), 'ScheduleScoop-Winter-2027.ics');
});
