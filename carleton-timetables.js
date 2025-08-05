async function getCarletonAndPrivacyPolicy() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(['carleton', 'privacy_policy_agreement'], (results) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(results);
        }
      });
    } catch (err) {
      console.error('Error in getCarletonAndPrivacyPolicy:', err);
      reject(err);
    }
  });
}

(async () => {
  let results;
  try {
    results = await getCarletonAndPrivacyPolicy();
  } catch (err) {
    alert('Failed to load settings. Please try again.\n\nNeuroNest');
    chrome.runtime.sendMessage({action:'end-timetable-request'});
    chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
    return;
  }

  let r;
  let pa;
  try {
    if (!results) {
      r = getDefaultTerm();
      alert(`No default term found; Using: ${r}`);
    } else {
      r = results['carleton'];
      pa = results['privacy_policy_agreement'];
    }
  } catch (err) {
    console.error('Error processing results:', err);
    alert('Error processing settings.\n\nNeuroNest');
    chrome.runtime.sendMessage({action:'end-timetable-request'});
    chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
    return;
  }

  const termSelector = document.getElementById('term_id');
  const BIG_FAT_HEADER = 'body > div.pagetitlediv > table > tbody > tr:nth-child(1) > td:nth-child(1) > h2';
  const timetableNav = 'body > div.footerlinksdiv > span > map > p:nth-child(2) > a:nth-child(2)';
  const calendarNav = 'body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(3) > td:nth-child(2) > span > ul > li:nth-child(1) > a:nth-child(4)';
  const targetTerm = r[1] + r[0];
  const exportCombined = r[2];
  const submitBtn = document.querySelector('input[type=submit]');
  const tableElement = 'table.datadisplaytable[summary="This table lists the scheduled meeting times and assigned instructors for this class.."]';

  try {
    if (document.title.trim() == 'Sign In') {
      // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
    }
    else if (document.title.trim() == 'Sign out') {
      // chrome.runtime.sendMessage({action:'redirect', href:'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd'})
      window.location.href = 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd';
    }
    else if (document.title.trim() == 'Main Menu') {
      waitForElmText(calendarNav, 'Student Timetable').then(
        () => {
          try {
            document.querySelector(calendarNav).click();
          } catch (err) {
            console.error('Error clicking calendarNav:', err);
            alert('Navigation error.\n\nNeuroNest');
          }
        }
      ).catch(err => {
        console.error('waitForElmText error:', err);
        alert('Failed to find Student Timetable link.\n\nNeuroNest');
      });
    }
    else if (document.title.trim() == 'Student Timetable') {
      // chrome.runtime.sendMessage({action:'timetable1', node:'carleton', case:'student-calendar', tab:tab[0],script:'armory/carleton-timetable.js'})
      waitForElmText(timetableNav, 'Detail Schedule').then(
        () => {
          try {
            document.querySelector(timetableNav).click();
          } catch (err) {
            console.error('Error clicking timetableNav:', err);
            alert('Navigation error.\n\nNeuroNest');
          }
        }
      ).catch(err => {
        console.error('waitForElmText error:', err);
        alert('Failed to find Detail Schedule link.\n\nNeuroNest');
      });
    }
    else if (document.title.trim() == 'Registration Term') {
      waitForElm('#term_id').then(() => {
        try {
          if (isValidTerm(termSelector, targetTerm)) {
            termSelector.value = targetTerm;
            submitBtn.click();
          } else {
            alert(`Request failed: Term [${mapTerm(r)}] Not Found\n\nTimetable Tools`);
            chrome.runtime.sendMessage({action:'end-timetable-request'});
            chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
          }
        } catch (err) {
          console.error('Error in Registration Term:', err);
          alert('Error selecting term.\n\nNeuroNest');
          chrome.runtime.sendMessage({action:'end-timetable-request'});
          chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
        }
      }).catch(err => {
        console.error('waitForElm error:', err);
        alert('Failed to find term selector.\n\nNeuroNest');
        chrome.runtime.sendMessage({action:'end-timetable-request'});
        chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
      });
    }
    else if (document.title.trim() == 'Student Detail Schedule') {
      chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempLoginCU'});
      waitForElm(BIG_FAT_HEADER).then((elm) => {
        try {
          run();
        } catch (err) {
          console.error('Error running timetable extraction:', err);
          alert('Failed to process timetable.\n\nNeuroNest');
          chrome.runtime.sendMessage({action:'end-timetable-request'});
          chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
        }
      }).catch(err => {
        console.error('waitForElm error:', err);
        alert('Failed to find timetable header.\n\nNeuroNest');
        chrome.runtime.sendMessage({action:'end-timetable-request'});
        chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
      });
    }
    else {
      // chrome.runtime.sendMessage({action:'timetable1', node:'carleton', case:'sign-in', tab:tab[0], script:'armory/carleton-timetable.js'})
    }
  } catch (err) {
    console.error('Unhandled error in main navigation:', err);
    alert('Unexpected error occurred.\n\nNeuroNest');
    chrome.runtime.sendMessage({action:'end-timetable-request'});
    chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
  }

  async function waitForElm(selector) {
    return new Promise((resolve, reject) => {
      try {
        if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
          if (document.querySelector(selector)) {
            observer.disconnect();
            resolve(document.querySelector(selector));
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error('Timeout waiting for element: ' + selector));
        }, 10000);
      } catch (err) {
        console.error('waitForElm error:', err);
        reject(err);
      }
    });
  }

  async function waitForElmText(selector, text, maxWaitTime = 5000) {
    const start = Date.now();
    try {
      while (Date.now() - start < maxWaitTime) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim() === text) {
          return element;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Timeout waiting for element text');
    } catch (err) {
      console.error('waitForElmText error:', err);
      throw err;
    }
  }

  function isValidTerm(termSelector, targetTerm) {
    try {
      const options = termSelector.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value == targetTerm) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('isValidTerm error:', err);
      return false;
    }
  }

  function run() {
    try {
      if (pa && pa[0]) {
        const tables = [];
        const log = [];
        let staticHeadersDiv, userInfo2, userInfo3;
        try {
          staticHeadersDiv = document.querySelector('.staticheaders');
          userInfo2 = staticHeadersDiv ? staticHeadersDiv.innerHTML.split('<br>')[1].trim().split(' ').slice(0, 2).join(' ') : 'Nameless';
          userInfo3 = staticHeadersDiv ? staticHeadersDiv.innerHTML.split('<br>')[0].trim().split(' ').slice(1).join(' ') : 'Unknown User';
        } catch (err) {
          console.error('Error extracting user info:', err);
          userInfo2 = 'Nameless';
          userInfo3 = 'Unknown User';
        }

        document.querySelectorAll('table.datadisplaytable').forEach((table, index) => {
          try {
            const section = {};
            const meta = {};
            meta['table-num'] = index;
            if (table.querySelector('a')) {
              table.querySelectorAll('tr').forEach((r) => {
                const headerElement = r.querySelector('th');
                const valueElement = r.querySelector('td');
                if (headerElement && valueElement) {
                  let header = headerElement.textContent.slice(0, -1).trim();
                  let value = valueElement.textContent.trim();
                  meta[header] = value;
                }
              });
              let courseData = table.querySelector('a').textContent.trim().split(' - ').reverse();
              let courseCode = courseData[1];
              let courseSection = courseData[0];
              let courseName = courseData.slice(2).join(' - ');
              let crn = getRowContent(table, 3);
              let instructor = getRowContent(table, 5);
              section.courseName = courseName;
              section.courseCode = courseCode;
              section.courseSection = courseSection;
              section.crn = crn;
              section.instructor = instructor.trim() ? instructor.trim() : 'Instructor: N/A';
              tables[index / 2] = section;
              log.push(meta);
            } else {
              const row = table.querySelector('tr:nth-of-type(2)');
              if (!row) throw new Error('Missing row in table');
              const cells = row.querySelectorAll('td');
              section.classStartTime = cells[1].textContent.trim() == 'TBA' ? 'N/A' : cells[1].textContent.trim().split(' - ')[0];
              section.classEndTime = cells[1].textContent.trim() == 'TBA' ? 'N/A' : cells[1].textContent.trim().split(' - ')[1];
              section.daysOfTheWeek = cells[2].textContent.trim();
              section.location = cells[3].textContent.trim() == 'TBA' ? '' : cells[3].textContent.trim();
              section.startDate = new Date(cells[4].textContent.trim().split(' - ')[0]);
              section.endDate = new Date(cells[4].textContent.trim().split(' - ')[1]);
              Object.assign(tables[Math.floor(index / 2)], section);

              table.querySelectorAll('th').forEach((r, o) => {
                let header = r.textContent.trim();
                let value = cells[o].textContent.trim();
                meta[header] = value;
              });
              log.push(meta);
            }
          } catch (err) {
            console.error('Error parsing table:', err);
          }
        });

        const timetable = tables;

        function getRowContent(table, rowIndex) {
          try {
            const row = table.querySelector(`tr:nth-of-type(${rowIndex}) td`);
            return !(row == '') ? row.textContent.trim() : 'N/A';
          } catch (err) {
            console.error('getRowContent error:', err);
            return 'N/A';
          }
        }

        function createICal(timetable) {
          try {
            if (exportCombined) {
              let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//NeuroNest//CU_Timetable//EN\n';
              let count = 0;
              let allCourses = '';
              timetable.forEach(node => {
                try {
                  node.startDate = adjustStartDateToDay(new Date(node.startDate), node.daysOfTheWeek);
                  const daysMap = { 'M': 'MO', 'T': 'TU', 'W': 'WE', 'R': 'TH', 'F': 'FR' };
                  const startTime = node.classStartTime == 'N/A' ? 'none' : convertTo24Hour(node.classStartTime).split(':');
                  const endTime = node.classEndTime == 'N/A' ? 'none' : convertTo24Hour(node.classEndTime).split(':');
                  const startHour = parseInt(startTime[0], 10);
                  const startMinute = parseInt(startTime[1], 10);
                  const endHour = parseInt(endTime[0], 10);
                  const endMinute = parseInt(endTime[1], 10);
                  const timeNoSpace = node.classStartTime.replace(/\s/g, '');
                  const timeNoSpace2 = node.classEndTime.replace(/\s/g, '');
                  let dayList = [];
                  node.daysOfTheWeek.split('').forEach(day => {
                    const dayOfWeek = daysMap[day];
                    dayList.push(dayOfWeek);
                  });
                  if (dayList && startTime != 'none') {
                    const courseInfo = `${node.courseCode} - ${node.courseSection}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location ? node.location : 'Location: N/A'}\n${node.courseName}\n${node.instructor}\n${node.crn}\n...\n`;
                    const startDate = new Date(node.startDate);
                    const endDate = new Date(node.startDate);
                    const untilDate = new Date(node.endDate);
                    untilDate.setDate(untilDate.getDate() + 1);
                    startDate.setUTCHours(startHour, startMinute, 0, 0);
                    endDate.setUTCHours(endHour, endMinute, 0, 0);
                    allCourses += courseInfo;
                    icsContent += 'BEGIN:VEVENT\n';
                    icsContent += `DTSTART;TZID=America/Toronto:${formatDateLocal(startDate)}\n`;
                    icsContent += `DTEND;TZID=America/Toronto:${formatDateLocal(endDate)}\n`;
                    icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayList.join(',')};UNTIL=${formatDateUTC(untilDate)};WKST=SU;\n`;
                    icsContent += `SUMMARY:${node.courseCode}-${node.courseSection}\n`;
                    icsContent += `DESCRIPTION:${node.courseName}\\n${node.courseCode} - ${node.courseSection}\\n${node.instructor}\\n${node.crn}\\n${timeNoSpace} - ${timeNoSpace2}\\n${node.location ? node.location : 'Location: N/A'}\n`;
                    icsContent += `LOCATION:${node.location}\n`;
                    icsContent += 'END:VEVENT\n';
                    count++;
                  }
                } catch (err) {
                  console.error('Error creating iCal event:', err);
                }
              });
              icsContent += 'END:VCALENDAR';
              if (count > 0) {
                try {
                  const blob = new Blob([icsContent], { type: 'text/calendar' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = userInfo2 + '.ics';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Error downloading iCal:', err);
                  alert('Failed to download calendar file.\n\nNeuroNest');
                }
              } else {
                alert('Nothing to see here...\n\nNeuroNest');
              }
              const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
              logCalendar([userInfo3, currentDate, 'carleton', userInfo2, allCourses, icsContent]);
            } else {
              let totalCount = 0;
              let totalIcs = '';
              let allCourses = '';
              timetable.forEach(node => {
                try {
                  let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//NeuroNest//Timetable//EN\n';
                  let count = 0;
                  node.startDate = adjustStartDateToDay(new Date(node.startDate), node.daysOfTheWeek);
                  const daysMap = { 'M': 'MO', 'T': 'TU', 'W': 'WE', 'R': 'TH', 'F': 'FR' };
                  const startTime = node.classStartTime == 'N/A' ? 'none' : convertTo24Hour(node.classStartTime).split(':');
                  const endTime = node.classEndTime == 'N/A' ? 'none' : convertTo24Hour(node.classEndTime).split(':');
                  const startHour = parseInt(startTime[0], 10);
                  const startMinute = parseInt(startTime[1], 10);
                  const endHour = parseInt(endTime[0], 10);
                  const endMinute = parseInt(endTime[1], 10);
                  const timeNoSpace = node.classStartTime.replace(/\s/g, '');
                  const timeNoSpace2 = node.classEndTime.replace(/\s/g, '');
                  let dayList = [];
                  node.daysOfTheWeek.split('').forEach(day => {
                    const dayOfWeek = daysMap[day];
                    dayList.push(dayOfWeek);
                  });
                  if (dayList && startTime != 'none') {
                    const startDate = new Date(node.startDate);
                    const endDate = new Date(node.startDate);
                    const untilDate = new Date(node.endDate);
                    untilDate.setDate(untilDate.getDate() + 1);
                    startDate.setUTCHours(startHour, startMinute, 0, 0);
                    endDate.setUTCHours(endHour, endMinute, 0, 0);
                    const courseInfo = `${node.courseCode} - ${node.courseSection}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location ? node.location : 'Location: N/A'}\n${node.courseName}\n${node.instructor}\n${node.crn}\n...\n`;
                    allCourses += courseInfo;
                    icsContent += 'BEGIN:VEVENT\n';
                    icsContent += `DTSTART;TZID=America/Toronto:${formatDateLocal(startDate)}\n`;
                    icsContent += `DTEND;TZID=America/Toronto:${formatDateLocal(endDate)}\n`;
                    icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayList.join(',')};UNTIL=${formatDateUTC(untilDate)};WKST=SU;\n`;
                    icsContent += `SUMMARY:${node.courseCode}-${node.courseSection}\n`;
                    icsContent += `DESCRIPTION:${node.courseName}\\n${node.courseCode} - ${node.courseSection}\\n${node.instructor}\\n${node.crn}\\n${timeNoSpace} - ${timeNoSpace2}\\n${node.location ? node.location : 'Location: N/A'}\n`;
                    icsContent += `LOCATION:${node.location}\n`;
                    icsContent += 'END:VEVENT\n';
                    count++;
                    totalCount++;
                  }
                  icsContent += 'END:VCALENDAR';
                  if (count > 0) {
                    totalIcs += icsContent + '\n\n';
                    try {
                      const blob = new Blob([icsContent], { type: 'text/calendar' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${node.courseCode}-${node.courseSection}` + '.ics';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('Error downloading iCal:', err);
                      alert('Failed to download calendar file.\n\nNeuroNest');
                    }
                  }
                } catch (err) {
                  console.error('Error creating iCal event:', err);
                }
              });
              const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
              logCalendar([userInfo3, currentDate, 'carleton', userInfo2, allCourses, totalIcs]);
              if (totalCount <= 0) {
                alert('No classes found\n\nNeuroNest');
              }
            }
          } catch (err) {
            console.error('createICal error:', err);
            alert('Failed to generate calendar file.\n\nNeuroNest');
          }
        }

        function adjustStartDateToDay(startDate, daysOfTheWeek) {
          try {
            const daysMap = { 'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5 };
            const dayOfWeek = daysMap[daysOfTheWeek[0]];
            const currentDay = startDate.getDay();
            let diff = dayOfWeek - currentDay;
            if (diff < 0) diff += 7;
            startDate.setDate(startDate.getDate() + diff);
            return startDate;
          } catch (err) {
            console.error('adjustStartDateToDay error:', err);
            return startDate;
          }
        }

        if (!pa[2]) {
          try {
            updateAgreement([
              userInfo3,
              "NeuroNest",
              pa[1],
              `${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false })}`,
              `${pa[0] ? "Yes" : "No"}`
            ]);
          } catch (err) {
            console.error('updateAgreement error:', err);
          }
        }

        function logCalendar(info) {
          try {
            chrome.runtime.sendMessage({ action: 'log_calendar', data: info });
          } catch (err) {
            console.error('logCalendar error:', err);
          }
        }

        function updateAgreement(info) {
          try {
            chrome.runtime.sendMessage({ action: 'update_agreement', data: info });
          } catch (err) {
            console.error('updateAgreement error:', err);
          }
        }

        function formatDateLocal(date) {
          try {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0];
          } catch (err) {
            console.error('formatDateLocal error:', err);
            return '';
          }
        }

        function formatDateUTC(date) {
          try {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          } catch (err) {
            console.error('formatDateUTC error:', err);
            return '';
          }
        }

        const convertTo24Hour = (time12h) => {
          try {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'pm') hours = parseInt(hours, 10) + 12;
            return `${hours}:${minutes}`;
          } catch (err) {
            console.error('convertTo24Hour error:', err);
            return '00:00';
          }
        };

        createICal(timetable);
        chrome.runtime.sendMessage({ action: 'end-timetable-request' });
        chrome.runtime.sendMessage({ action: 'closeTempTabs', type: 'tempTimetableCU' });
      } else {
        alert("ERROR: Privacy Policy Agreement not found, aborting!\n\n NeuroNest");
        chrome.runtime.sendMessage({ action: 'end-timetable-request' });
        chrome.runtime.sendMessage({ action: 'closeTempTabs', type: 'tempTimetableCU' });
      }
    } catch (err) {
      console.error('run() error:', err);
      alert('Unexpected error during timetable processing.\n\nNeuroNest');
      chrome.runtime.sendMessage({ action: 'end-timetable-request' });
      chrome.runtime.sendMessage({ action: 'closeTempTabs', type: 'tempTimetableCU' });
    }
  }

  function mapTerm(term) {
    try {
      let sem;
      switch (term[0]) {
        case '30':
          sem = 'Fall';
          break;
        case '20':
          sem = 'Summer';
          break;
        case '10':
          sem = 'Winter';
          break;
        default:
          console.error('Invalid semester code:', term[0]);
          return;
      }
      return `${sem} ${term[1]}`;
    } catch (err) {
      console.error('mapTerm error:', err);
      return '';
    }
  }

  function getDefaultTerm() {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      let year = String(currentDate.getFullYear());
      let term;
      if (month >= 1 && month <= 3) {
        term = '10';
      } else if (month >= 4 && month <= 7) {
        term = '20';
      } else if (month >= 8 && month <= 11) {
        term = '30';
      } else if (month === 12) {
        term = '10';
        year = String(Number(year) + 1);
      } else {
        term = '10';
        console.error(`ERROR: month not found. Default term is set to: ${term} ${year}`);
      }
      return [term, year, true];
    } catch (err) {
      console.error('getDefaultTerm error:', err);
      return ['10', String(new Date().getFullYear()), true];
    }
  }

})();
