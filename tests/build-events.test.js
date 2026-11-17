const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEvents } = require('../src/schedule.js');

const TERM = { code: '10', year: '2027', labsBiweekly: true };
const meeting = (days, extra = {}) => ({
  days, start: '08:35', end: '09:55', location: 'SA 302', startDate: '2027-01-06', endDate: '2027-04-09', ...extra,
});
const section = (type, meetings, extra = {}) => ({
  code: 'COMP 3106', section: 'B', name: 'Intro to AI', type, crn: '31234', instructor: 'Instructor A', meetings, ...extra,
});

test('lecture on MW gives one event per day with its own first date', () => {
  const { events } = buildEvents([section('Lecture', [meeting('MW')])], TERM);
  assert.deepEqual(events.map((e) => [e.byDay, e.date]), [['MO', '2027-01-11'], ['WE', '2027-01-06']]);
  assert.ok(events.every((e) => e.interval === 1 && e.until === '2027-04-09' && e.start === '08:35' && e.end === '09:55'));
});

test('tutorial on a day earlier in the week than term start does not get an extra week', () => {
  const { events } = buildEvents([section('Tutorial', [meeting('M')])], TERM);
  assert.equal(events[0].date, '2027-01-11');
});

test('tutorial on a later day starts in week two', () => {
  const { events } = buildEvents([section('Tutorial', [meeting('R')])], TERM);
  assert.equal(events[0].date, '2027-01-14');
});

test('labs are biweekly only when labsBiweekly is true', () => {
  const lab = [section('Laboratory', [meeting('W')])];
  assert.equal(buildEvents(lab, TERM).events[0].interval, 2);
  assert.equal(buildEvents(lab, { ...TERM, labsBiweekly: false }).events[0].interval, 1);
  assert.equal(buildEvents([section('Lecture', [meeting('W')])], TERM).events[0].interval, 1);
});

test('weekly classes skip reading week and Good Friday', () => {
  const wed = buildEvents([section('Lecture', [meeting('W')])], TERM).events[0];
  assert.deepEqual(wed.exDates, ['2027-02-17']);
  const fri = buildEvents([section('Lecture', [meeting('F')])], TERM).events[0];
  assert.deepEqual(fri.exDates, ['2027-02-19', '2027-03-26']);
});

test('biweekly lab only excludes dates it actually meets on', () => {
  const lab = buildEvents([section('Laboratory', [meeting('W')])], TERM).events[0];
  assert.equal(lab.date, '2027-01-13');
  assert.deepEqual(lab.exDates, []);
});

test('TBA sections produce no events and are counted', () => {
  const r = buildEvents([section('Lecture', [meeting('', { start: null, end: null })])], TERM);
  assert.deepEqual(r.events, []);
  assert.equal(r.skippedSections, 1);
  assert.equal(buildEvents([section('Lecture', [])], TERM).skippedSections, 1);
});

test('each meeting uses its own date range', () => {
  const { events } = buildEvents([
    section('Lecture', [meeting('M', { startDate: '2027-05-03', endDate: '2027-06-14' })]),
    section('Lecture', [meeting('M', { startDate: '2027-07-05', endDate: '2027-08-16' })], { code: 'MATH 1104' }),
  ], { code: '20', year: '2027', labsBiweekly: true });
  assert.deepEqual(events.map((e) => [e.date, e.until]), [['2027-05-03', '2027-06-14'], ['2027-07-05', '2027-08-16']]);
  assert.deepEqual(events[0].exDates, ['2027-05-24']);
  assert.deepEqual(events[1].exDates, ['2027-08-02']);
});

test('title, description and stable uid', () => {
  const run = () => buildEvents([section('Lecture', [meeting('W')])], TERM).events[0];
  const e = run();
  assert.equal(e.title, 'COMP 3106 Lecture');
  assert.equal(e.description, 'Intro to AI\nSection B\nInstructor A\nCRN 31234\nSA 302');
  assert.equal(e.location, 'SA 302');
  assert.equal(e.uid, 'COMP3106-B-WE-0835-202710@schedulescoop');
  assert.equal(run().uid, e.uid);
  const noRoom = buildEvents([section('Lecture', [meeting('W', { location: '' })])], TERM).events[0];
  assert.ok(noRoom.description.endsWith('Location TBA'));
});
