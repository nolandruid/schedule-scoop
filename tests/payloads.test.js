const test = require('node:test');
const assert = require('node:assert/strict');
const { toGoogleEvent, toOutlookEvent } = require('../src/schedule.js');

const event = (extra = {}) => ({
  uid: 'COMP3106-L1-WE-1435-202710@schedulescoop',
  title: 'COMP 3106 Laboratory',
  description: 'Intro to AI\nSection L1',
  location: 'HP 4115',
  date: '2027-01-13', start: '14:35', end: '17:25', byDay: 'WE', interval: 2, until: '2027-04-09',
  exDates: ['2027-02-17', '2027-03-03'],
  ...extra,
});

test('Google event uses Toronto wall-clock times, not UTC', () => {
  const g = toGoogleEvent(event());
  assert.deepEqual(g.start, { dateTime: '2027-01-13T14:35:00', timeZone: 'America/Toronto' });
  assert.deepEqual(g.end, { dateTime: '2027-01-13T17:25:00', timeZone: 'America/Toronto' });
  assert.equal(g.summary, 'COMP 3106 Laboratory');
  assert.equal(g.description, 'Intro to AI\nSection L1');
  assert.equal(g.location, 'HP 4115');
  assert.deepEqual(g.recurrence, [
    'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE;UNTIL=20270410T045959Z;WKST=SU',
    'EXDATE;TZID=America/Toronto:20270217T143500,20270303T143500',
  ]);
});

test('Google event omits EXDATE when none', () => {
  assert.equal(toGoogleEvent(event({ exDates: [] })).recurrence.length, 1);
});

test('Outlook event shape', () => {
  const o = toOutlookEvent(event());
  assert.equal(o.subject, 'COMP 3106 Laboratory');
  assert.deepEqual(o.body, { contentType: 'text', content: 'Intro to AI\nSection L1' });
  assert.deepEqual(o.start, { dateTime: '2027-01-13T14:35:00', timeZone: 'America/Toronto' });
  assert.deepEqual(o.end, { dateTime: '2027-01-13T17:25:00', timeZone: 'America/Toronto' });
  assert.deepEqual(o.recurrence, {
    pattern: { type: 'weekly', interval: 2, daysOfWeek: ['wednesday'], firstDayOfWeek: 'sunday' },
    range: { type: 'endDate', startDate: '2027-01-13', endDate: '2027-04-09', recurrenceTimeZone: 'America/Toronto' },
  });
  assert.deepEqual(o.location, { displayName: 'HP 4115' });
  assert.equal('location' in toOutlookEvent(event({ location: '' })), false);
});
