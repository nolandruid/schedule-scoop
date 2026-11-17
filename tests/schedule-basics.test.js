const test = require('node:test');
const assert = require('node:assert/strict');
const {
  termLabel, defaultTerm, yearOptions, parseTime12, parseCarletonDate, addDays, weekday,
} = require('../src/schedule.js');

test('defaultTerm picks the term by month', () => {
  assert.deepEqual(defaultTerm(new Date(2026, 0, 15)), { code: '10', year: '2026' });
  assert.deepEqual(defaultTerm(new Date(2026, 4, 1)), { code: '20', year: '2026' });
  assert.deepEqual(defaultTerm(new Date(2026, 10, 17)), { code: '30', year: '2026' });
  assert.deepEqual(defaultTerm(new Date(2026, 11, 2)), { code: '10', year: '2027' });
});

test('yearOptions is current year -1 to +1', () => {
  assert.deepEqual(yearOptions(new Date(2026, 10, 17)), ['2025', '2026', '2027']);
});

test('parseTime12 converts 12-hour times', () => {
  assert.equal(parseTime12('8:35 am'), '08:35');
  assert.equal(parseTime12('12:05 pm'), '12:05');
  assert.equal(parseTime12('12:30 am'), '00:30');
  assert.equal(parseTime12('6:05 pm'), '18:05');
  assert.equal(parseTime12('TBA'), null);
});

test('parseCarletonDate reads "Mon DD, YYYY"', () => {
  assert.equal(parseCarletonDate('Jan 06, 2027'), '2027-01-06');
  assert.equal(parseCarletonDate('nonsense'), null);
});

test('date math ignores the local timezone', () => {
  assert.equal(addDays('2027-03-13', 1), '2027-03-14');
  assert.equal(addDays('2027-01-31', 1), '2027-02-01');
  assert.equal(weekday('2027-01-06'), 3);
});

test('termLabel names the term', () => {
  assert.equal(termLabel('30', '2026'), 'Fall 2026');
  assert.equal(termLabel('10', '2027'), 'Winter 2027');
});
