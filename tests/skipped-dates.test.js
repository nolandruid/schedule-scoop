const test = require('node:test');
const assert = require('node:assert/strict');
const { skippedDates, weekday } = require('../src/schedule.js');

test('winter break is the Family Day week, plus Good Friday', () => {
  const d = skippedDates('10', '2027'); // Family Day 2027 = Feb 15
  for (const x of ['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18', '2027-02-19']) {
    assert.ok(d.includes(x), x);
  }
  assert.ok(d.includes('2027-03-26')); // Good Friday 2027
  assert.ok(!d.includes('2027-02-22'));
});

test('fall 2026 has the published break week and Thanksgiving', () => {
  const d = skippedDates('30', '2026');
  for (const x of ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']) {
    assert.ok(d.includes(x), x);
  }
  assert.ok(d.includes('2026-10-12')); // Thanksgiving
  assert.ok(d.includes('2026-09-07')); // Labour Day
});

test('fall 2025 uses the published break week', () => {
  const d = skippedDates('30', '2025');
  assert.ok(d.includes('2025-10-27') && d.includes('2025-10-31'));
});

test('fall falls back to the last full Mon-Fri week of October', () => {
  const d = skippedDates('30', '2040');
  assert.ok(d.includes('2040-10-22') && d.includes('2040-10-26'));
  assert.ok(!d.includes('2040-10-29'));
});

test('summer holidays', () => {
  const d = skippedDates('20', '2027');
  for (const x of ['2027-05-24', '2027-07-01', '2027-08-02']) assert.ok(d.includes(x), x);
});

test('never lists weekends and is sorted', () => {
  for (const [c, y] of [['20', '2028'], ['10', '2026'], ['30', '2027']]) {
    const d = skippedDates(c, y);
    assert.ok(d.every((x) => ![0, 6].includes(weekday(x))));
    assert.deepEqual(d, [...d].sort());
  }
});
