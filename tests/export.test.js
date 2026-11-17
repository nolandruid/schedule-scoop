const test = require('node:test');
const assert = require('node:assert/strict');
const { exportToGoogle, exportToOutlook, downloadICS } = require('../src/export.js');

const event = (n, exDates = []) => ({
  uid: `E${n}`, title: `T${n}`, description: '', location: '', date: '2027-01-06', start: '08:35', end: '09:55',
  byDay: 'WE', interval: 1, until: '2027-04-09', exDates,
});

// Fake fetch: `routes` returns {status, body} for (method, url); every call is recorded.
function fakeFetch(route) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    calls.push({ method, url, opts });
    const { status = 200, body = {} } = route(method, url, calls.length) || {};
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
  };
  fn.calls = calls;
  return fn;
}

const opts = (fetch, extra = {}) => ({ token: 'tok', fetch, sleep: 0, ...extra });

test('Google: posts each event and reports progress', async () => {
  const fetch = fakeFetch(() => ({ status: 200, body: { id: 'x' } }));
  const progress = [];
  const r = await exportToGoogle([event(1), event(2), event(3)], opts(fetch, { onProgress: (d, t) => progress.push([d, t]) }));
  assert.deepEqual(r, { created: 3, failed: 0 });
  assert.equal(fetch.calls.length, 3);
  assert.ok(fetch.calls.every((c) => c.method === 'POST' && c.url === 'https://www.googleapis.com/calendar/v3/calendars/primary/events'));
  assert.equal(fetch.calls[0].opts.headers.Authorization, 'Bearer tok');
  assert.equal(JSON.parse(fetch.calls[0].opts.body).start.dateTime, '2027-01-06T08:35:00');
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
});

test('Google: a failed event is counted and the rest continue', async () => {
  const fetch = fakeFetch((m, u, n) => ({ status: n === 2 ? 500 : 200 }));
  assert.deepEqual(await exportToGoogle([event(1), event(2), event(3)], opts(fetch)), { created: 2, failed: 1 });
});

test('Google: 401 aborts with auth error', async () => {
  const fetch = fakeFetch(() => ({ status: 401 }));
  await assert.rejects(exportToGoogle([event(1), event(2)], opts(fetch)), { message: 'auth' });
  assert.equal(fetch.calls.length, 1);
});

test('Outlook: creates series then deletes skipped instances only', async () => {
  const fetch = fakeFetch((method, url) => {
    if (method === 'POST') return { status: 201, body: { id: 'S1' } };
    if (method === 'GET') {
      return { body: { value: [
        { id: 'I-skip', start: { dateTime: '2027-02-17T08:35:00.0000000' } },
        { id: 'I-other', start: { dateTime: '2027-02-18T08:35:00.0000000' } },
      ] } };
    }
    return { status: 204 };
  });
  const r = await exportToOutlook([event(1, ['2027-02-17'])], opts(fetch));
  assert.deepEqual(r, { created: 1, failed: 0, skipFailures: 0 });
  const [post, get, del] = fetch.calls;
  assert.equal(post.url, 'https://graph.microsoft.com/v1.0/me/events');
  assert.ok(get.url.startsWith('https://graph.microsoft.com/v1.0/me/events/S1/instances?'));
  assert.ok(get.url.includes('startDateTime=2027-02-17T00:00:00') && get.url.includes('endDateTime=2027-02-18T00:00:00'));
  assert.equal(get.opts.headers.Prefer, 'outlook.timezone="America/Toronto"');
  assert.deepEqual([del.method, del.url], ['DELETE', 'https://graph.microsoft.com/v1.0/me/events/I-skip']);
  assert.equal(fetch.calls.length, 3);
});

test('Outlook: a failed delete is counted, not thrown', async () => {
  const fetch = fakeFetch((method) => {
    if (method === 'POST') return { status: 201, body: { id: 'S1' } };
    if (method === 'GET') return { body: { value: [{ id: 'I1', start: { dateTime: '2027-02-17T08:35:00' } }] } };
    return { status: 500 };
  });
  assert.deepEqual(await exportToOutlook([event(1, ['2027-02-17'])], opts(fetch)), { created: 1, failed: 0, skipFailures: 1 });
});

test('Outlook: 401 aborts with auth error', async () => {
  await assert.rejects(exportToOutlook([event(1)], opts(fakeFetch(() => ({ status: 401 })))), { message: 'auth' });
});

test('downloadICS clicks a download link with the filename', () => {
  const clicked = [];
  const doc = {
    body: { appendChild() {}, removeChild() {} },
    createElement: () => ({ click() { clicked.push(this.download); } }),
  };
  downloadICS('BEGIN:VCALENDAR\r\n', 'ScheduleScoop-Winter-2027.ics', doc);
  assert.deepEqual(clicked, ['ScheduleScoop-Winter-2027.ics']);
});
