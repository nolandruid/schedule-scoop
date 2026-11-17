const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseHTML } = require('linkedom');
const { parseSchedulePage } = require('../src/carleton-parse.js');

const load = (file) => parseHTML(fs.readFileSync(file, 'utf8')).document;
const meeting = (days, start, end, location, type = 'Lecture') => ({
  days, start, end, location, type, startDate: '2027-01-06', endDate: '2027-04-09',
});

test('parses the anonymised sample page', () => {
  const sections = parseSchedulePage(load(path.join(__dirname, 'fixtures/detail-schedule.sample.html')));
  assert.deepEqual(sections, [
    { code: 'COMP 3004', section: 'A', name: 'Object-Oriented Software Engineering', type: 'Lecture', crn: '10001',
      instructor: 'Instructor A, Instructor B', meetings: [meeting('MW', '08:35', '09:55', 'Nideyinàn (former UC) 231')] },
    { code: 'CLCV 2305', section: 'A', name: 'Ancient Science and Technology', type: 'Lecture', crn: '10002',
      instructor: 'Instructor C', meetings: [meeting('', null, null, 'Online')] },
    { code: 'PHYS 1007', section: 'L2', name: 'Physics - Labs', type: 'Laboratory', crn: '10003',
      instructor: 'Instructor TBA', meetings: [meeting('R', '14:35', '17:25', 'Herzberg Laboratories 3326', 'Laboratory')] },
    { code: 'COMP 3804', section: 'B', name: 'Design and Analysis of Algorithms I', type: 'Lecture', crn: '10004',
      instructor: 'Instructor D', meetings: [
        meeting('TR', '16:05', '17:25', 'Azrieli Theatre 301'),
        meeting('F', '18:05', '20:55', 'Richcraft Hall 2200'),
      ] },
    { code: 'HIST 4900', section: 'A', name: 'Directed Studies', type: '', crn: '10005',
      instructor: 'Instructor E', meetings: [] },
  ]);
});

const PRIVATE = path.join(__dirname, 'fixtures/private');
const privateFiles = fs.existsSync(PRIVATE) ? fs.readdirSync(PRIVATE).filter((f) => f.endsWith('.html')) : [];

test('parses the real saved page (private, skipped when absent)', { skip: privateFiles.length === 0 }, () => {
  for (const f of privateFiles) {
    const doc = load(path.join(PRIVATE, f));
    const sections = parseSchedulePage(doc);
    const links = doc.querySelectorAll('table.datadisplaytable th.ddtitle a').length;
    assert.equal(sections.length, links, f);
    for (const s of sections) {
      assert.match(s.code, /^[A-Z]{4} \d{4}$/);
      assert.ok(s.section);
      for (const m of s.meetings.filter((x) => x.start)) {
        assert.match(m.start, /^\d\d:\d\d$/);
        assert.match(m.end, /^\d\d:\d\d$/);
        assert.match(m.startDate, /^\d{4}-\d\d-\d\d$/);
        assert.match(m.endDate, /^\d{4}-\d\d-\d\d$/);
        assert.ok(m.days);
      }
    }
  }
});
