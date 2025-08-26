/**
 * Retrieves Carleton timetable settings and privacy policy agreement from Chrome storage
 * @returns {Promise<Object>} Promise that resolves to storage results containing carleton and privacy_policy_agreement data
 * @throws {Error} Throws error if storage access fails
 */
async function getCarletonAndPrivacyPolicy() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(['carleton', 'privacy_policy_agreement'], (results) => {
        if (chrome.runtime.lastError) {
          // Storage error
          reject(chrome.runtime.lastError);
        } else {
          resolve(results);
        }
      });
    } catch (err) {
      // Error in getCarletonAndPrivacyPolicy
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
    // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
    return;
  }

  let r;
  let pa;
  try {
    if (!results || typeof results !== 'object') {
      r = getDefaultTerm();
      alert(`No default term found; Using: ${r}`);
    } else {
      r = Array.isArray(results['carleton']) ? results['carleton'] : getDefaultTerm();
      pa = Array.isArray(results['privacy_policy_agreement']) ? results['privacy_policy_agreement'] : undefined;
    }
  } catch (err) {
    // Error processing results
    alert('Error processing settings.\n\nNeuroNest');
    chrome.runtime.sendMessage({action:'end-timetable-request'});
    // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
    return;
  }

  const termSelector = document.getElementById('term_id');
  const bigFatHeader = 'body > div.pagetitlediv > table > tbody > tr:nth-child(1) > td:nth-child(1) > h2';
  const timetableNav = 'body > div.footerlinksdiv > span > map > p:nth-child(2) > a:nth-child(2)';
  const calendarNav = 'body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(3) > td:nth-child(2) > span > ul > li:nth-child(1) > a:nth-child(4)';
  const targetTerm = String(r[1]) + String(r[0]);
  const exportCombined = !!r[2];
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
            // Error clicking calendarNav
            alert('Navigation error.\n\nNeuroNest');
          }
        }
      ).catch(err => {
        // waitForElmText error
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
            // Error clicking timetableNav
            alert('Navigation error.\n\nNeuroNest');
          }
        }
      ).catch(err => {
        // waitForElmText error
        alert('Failed to find Detail Schedule link.\n\nNeuroNest');
      });
    }
    else if (document.title.trim() == 'Registration Term') {
      waitForElm('#term_id').then(() => {
        try {
          if (termSelector && isValidTerm(termSelector, targetTerm)) {
            termSelector.value = targetTerm;
            submitBtn.click();
          } else {
            alert(`Request failed: Term [${mapTerm(r)}] Not Found\n\nTimetable Tools`);
            chrome.runtime.sendMessage({action:'end-timetable-request'});
            // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
          }
        } catch (err) {
          // Error in Registration Term
          alert('Error selecting term.\n\nNeuroNest');
          chrome.runtime.sendMessage({action:'end-timetable-request'});
          // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
        }
      }).catch(err => {
        // waitForElm error
        alert('Failed to find term selector.\n\nNeuroNest');
        chrome.runtime.sendMessage({action:'end-timetable-request'});
        // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
      });
    }
    else if (document.title.trim() == 'Student Detail Schedule') {
      // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempLoginCU'});
      waitForElm(bigFatHeader).then((elm) => {
        try {
          run();
        } catch (err) {
          // Error running timetable extraction
          alert('Failed to process timetable.\n\nNeuroNest');
          chrome.runtime.sendMessage({action:'end-timetable-request'});
          // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
        }
      }).catch(err => {
        // waitForElm error
        alert('Failed to find timetable header.\n\nNeuroNest');
        chrome.runtime.sendMessage({action:'end-timetable-request'});
        // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
      });
    }
    else {
      // chrome.runtime.sendMessage({action:'timetable1', node:'carleton', case:'sign-in', tab:tab[0], script:'armory/carleton-timetable.js'})
    }
  } catch (err) {
    // Unhandled error in main navigation
    alert('Unexpected error occurred.\n\nNeuroNest');
    chrome.runtime.sendMessage({action:'end-timetable-request'});
    // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'});
  }

  /**
   * Waits for a DOM element to appear on the page
   * @param {string} selector - CSS selector for the element to wait for
   * @returns {Promise<Element>} Promise that resolves with the found element
   * @throws {Error} Throws error if element not found within 10 seconds
   */
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
        // waitForElm error
        reject(err);
      }
    });
  }

  /**
   * Waits for a DOM element with specific text content to appear
   * @param {string} selector - CSS selector for the element
   * @param {string} text - Expected text content of the element
   * @param {number} [maxWaitTime=5000] - Maximum wait time in milliseconds
   * @returns {Promise<Element>} Promise that resolves with the found element
   * @throws {Error} Throws error if element with text not found within maxWaitTime
   */
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
      // waitForElmText error
      throw err;
    }
  }

  /**
   * Validates if a term exists in the term selector dropdown
   * @param {HTMLSelectElement} termSelector - The term selector dropdown element
   * @param {string} targetTerm - The term code to validate (e.g., "202410")
   * @returns {boolean} True if term exists in selector, false otherwise
   */
  const isValidTerm = (termSelector, targetTerm) => {
    try {
      const options = termSelector.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value == targetTerm) {
          return true;
        }
      } 
      return false;
    } catch (err) {
      // isValidTerm error
      return false;
    }
  }

  /**
   * Main function that processes the timetable data and generates calendar files
   * Extracts course information from Carleton's timetable page and creates ICS files
   * @returns {Promise<void>} Promise that completes when timetable processing is done
   */
  const run = async () => {
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
          // Error extracting user info
          userInfo2 = 'Nameless';
          userInfo3 = 'Unknown User';
        }

        /**
         * Extracts content from a specific table row
         * @param {HTMLTableElement} table - The table element to search in
         * @param {number} rowIndex - The row index to extract content from (1-based)
         * @returns {string} The text content of the row, or 'N/A' if not found
         */
        const getRowContent = (table, rowIndex) => {
          try {
            const row = table.querySelector(`tr:nth-of-type(${rowIndex}) td`);
            return !(row == '') ? row.textContent.trim() : 'N/A';
          } catch (err) {
            // getRowContent error
            return 'N/A';
          }
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
              let courseCode = courseData[1] || '';
              let courseSection = courseData[0] || '';
              let courseName = courseData.slice(2).join(' - ');
              let crn = getRowContent(table, 3);
              let instructor = getRowContent(table, 5);
              section.courseName = courseName;
              section.courseCode = courseCode;
              section.courseSection = courseSection;
              section.crn = crn;
              section.instructor = instructor.trim() ? instructor.trim() : 'Instructor: N/A';
              const targetIndex = Math.floor(index / 2);
              if (!tables[targetIndex]) tables[targetIndex] = {};
              Object.assign(tables[targetIndex], section);
              log.push(meta);
            } else {
              const row = table.querySelector('tr:nth-of-type(2)');
              if (!row) throw new Error('Missing row in table');
              const cells = row.querySelectorAll('td');
              const timeCell = cells[1] ? cells[1].textContent.trim() : '';
              section.classStartTime = timeCell == 'TBA' ? 'N/A' : (timeCell.split(' - ')[0] || 'N/A');
              section.classEndTime = timeCell == 'TBA' ? 'N/A' : (timeCell.split(' - ')[1] || 'N/A');
              section.daysOfTheWeek = cells[2] ? cells[2].textContent.trim() : '';
              const loc = cells[3] ? cells[3].textContent.trim() : '';
              section.location = loc == 'TBA' ? '' : loc;
              const dateCell = cells[4] ? cells[4].textContent.trim() : '';
              const dateParts = dateCell.split(' - ');
              section.startDate = new Date(dateParts[0] || Date.now());
              section.endDate = new Date(dateParts[1] || Date.now());
              const targetIndex = Math.floor(index / 2);
              if (!tables[targetIndex]) tables[targetIndex] = {};
              Object.assign(tables[targetIndex], section);

              table.querySelectorAll('th').forEach((r, o) => {
                let header = r.textContent.trim();
                let value = cells[o] ? cells[o].textContent.trim() : '';
                meta[header] = value;
              });
              log.push(meta);
            }
          } catch (err) {
            // Error parsing table
          }
        });

        const timetable = tables;

        /**
         * Creates iCalendar (.ics) files from timetable data
         * @param {Array<Object>} timetable - Array of course objects containing schedule information
         */
        const createICal = (timetable) => {
          try {
            if (!Array.isArray(timetable) || timetable.length === 0) {
              alert('No timetable data to export.\n\nNeuroNest');
              return;
            }
            if (exportCombined) {
              let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//NeuroNest//CU_Timetable//EN\n';
              let count = 0;
              let allCourses = '';
              let processedEvents = [];
              timetable.forEach(node => {
                try {
                  if (!node || !node.daysOfTheWeek) return;
                  const daysMap = { 'M': 'MO', 'T': 'TU', 'W': 'WE', 'R': 'TH', 'F': 'FR' };
                  const startTime = node.classStartTime == 'N/A' ? 'none' : convertTo24Hour(node.classStartTime).split(':');
                  const endTime = node.classEndTime == 'N/A' ? 'none' : convertTo24Hour(node.classEndTime).split(':');
                  const startHour = parseInt(startTime[0], 10);
                  const startMinute = parseInt(startTime[1], 10);
                  const endHour = parseInt(endTime[0], 10);
                  const endMinute = parseInt(endTime[1], 10);
                  const timeNoSpace = node.classStartTime.replace(/\s/g,'');
                  const timeNoSpace2 = node.classEndTime.replace(/\s/g, '');
                  // Create separate events for each day
                  node.daysOfTheWeek.split('').forEach(day => {
                    const dayOfWeek = daysMap[day];
                    if (dayOfWeek && startTime != 'none') {
                      // Adjust start date to this specific day
                      const adjustedStartDate = adjustStartDateToDay(new Date(node.startDate), day);
                      const startDate = new Date(adjustedStartDate);
                      const endDate = new Date(adjustedStartDate);
                      const untilDate = new Date(node.endDate);
                      untilDate.setDate(untilDate.getDate() + 1);
                      startDate.setUTCHours(startHour, startMinute, 0, 0);
                      endDate.setUTCHours(endHour, endMinute, 0, 0);
                      
                      const courseInfo = `${node.courseCode} - ${node.courseSection}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location ? node.location : 'Location: N/A'}\n${node.courseName}\n${node.instructor}\n${node.crn}\n...\n`;
                      allCourses += courseInfo;
                        
                        processedEvents.push({
                          // Neutral format
                          title: `${node.courseCode}-${node.courseSection}`,
                          description: `${node.courseName}\n${node.courseCode} - ${node.courseSection}...`,
                          location: node.location || 'Location: N/A',
                          startDateTime: startDate,
                          endDateTime: endDate,
                          recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayOfWeek};UNTIL=${formatDateUTC(untilDate)};WKST=SU`,
                          timezone: 'America/Toronto'
                        });
                      icsContent += 'BEGIN:VEVENT\n';
                      icsContent += `DTSTART;TZID=America/Toronto:${formatDateLocal(startDate)}\n`;
                      icsContent += `DTEND;TZID=America/Toronto:${formatDateLocal(endDate)}\n`;
                      icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek};UNTIL=${formatDateUTC(untilDate)};WKST=SU;\n`;
                      icsContent += `SUMMARY:${node.courseCode}-${node.courseSection}\n`;
                      icsContent += `DESCRIPTION:${node.courseName}\\n${node.courseCode} - ${node.courseSection}\\n${node.instructor}\\n${node.crn}\\n${timeNoSpace} - ${timeNoSpace2}\\n${node.location ? node.location : 'Location: N/A'}\n`;
                      icsContent += `LOCATION:${node.location}\n`;
                      icsContent += 'END:VEVENT\n';
                      count++;
                    }
                  });
                } catch (err) {
                  // Error creating iCal event
                }
              });
              icsContent += 'END:VCALENDAR';
              if (count > 0) {
                // Check selected calendar type and export accordingly
                chrome.storage.local.get(['selected-calendar'], (result) => {
                    const selectedCalendar = result['selected-calendar'] || 'ics';
                    
                    if (selectedCalendar === 'google') {
                      // Export to Google Calendar
                      createGoogleCalendarEvents(processedEvents, userInfo2);
                    } else if (selectedCalendar === 'outlook') {
                      // Export to Outlook Calendar
                      createOutlookCalendarEvents(processedEvents, userInfo2);
                    } else if (selectedCalendar === 'apple') {
                      // Export to Apple Calendar via CalDAV
                      createAppleCalendarEvents(processedEvents, userInfo2);
                    } else {
                      // Export as ICS file (default for ics and fallback)
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
                        // Error downloading iCal
                        alert('Failed to download calendar file.\n\nNeuroNest');
                      }
                    }
                    
                    const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
                    logCalendar([userInfo3, currentDate, 'carleton', userInfo2, allCourses, icsContent]);
                });
              } else {
                alert('Nothing to see here...\n\nNeuroNest');
              }
            } else {
              let totalCount = 0;
              let totalIcs = '';
              let allCourses = '';
              let processedEvents = []; // Array to collect events for Google Calendar
              timetable.forEach(node => {
                try {
                  let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//NeuroNest//Timetable//EN\n';
                  let count = 0;
                  if (!node || !node.daysOfTheWeek) return;
                  const daysMap = { 'M': 'MO', 'T': 'TU', 'W': 'WE', 'R': 'TH', 'F': 'FR' };
                  const startTime = node.classStartTime == 'N/A' ? 'none' : convertTo24Hour(node.classStartTime).split(':');
                  const endTime = node.classEndTime == 'N/A' ? 'none' : convertTo24Hour(node.classEndTime).split(':');
                  const startHour = parseInt(startTime[0], 10);
                  const startMinute = parseInt(startTime[1], 10);
                  const endHour = parseInt(endTime[0], 10);
                  const endMinute = parseInt(endTime[1], 10);
                  const timeNoSpace = node.classStartTime.replace(/\s/g, '');
                  const timeNoSpace2 = node.classEndTime.replace(/\s/g, '');
                  // Create separate events for each day
                  node.daysOfTheWeek.split('').forEach(day => {
                    const dayOfWeek = daysMap[day];
                    if (dayOfWeek && startTime != 'none') {
                      // Adjust start date to this specific day
                      const adjustedStartDate = adjustStartDateToDay(new Date(node.startDate), day);
                      const startDate = new Date(adjustedStartDate);
                      const endDate = new Date(adjustedStartDate);
                      const untilDate = new Date(node.endDate);
                      untilDate.setDate(untilDate.getDate() + 1);
                      startDate.setUTCHours(startHour, startMinute, 0, 0);
                      endDate.setUTCHours(endHour, endMinute, 0, 0);
                      
                      const courseInfo = `${node.courseCode} - ${node.courseSection}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location ? node.location : 'Location: N/A'}\n${node.courseName}\n${node.instructor}\n${node.crn}\n...\n`;
                      allCourses += courseInfo;
                      
                      // Store processed event data for Google Calendar
                      processedEvents.push({
                        summary: `${node.courseCode}-${node.courseSection}`,
                        description: `${node.courseName}\n${node.courseCode} - ${node.courseSection}\n${node.instructor}\n${node.crn}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location ? node.location : 'Location: N/A'}`,
                        location: node.location || 'Location: N/A',
                        start: {
                          dateTime: startDate.toISOString(),
                          timeZone: 'America/Toronto'
                        },
                        end: {
                          dateTime: endDate.toISOString(),
                          timeZone: 'America/Toronto'
                        },
                        recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek};UNTIL=${formatDateUTC(untilDate)};WKST=SU`]
                      });
                      
                      icsContent += 'BEGIN:VEVENT\n';
                      icsContent += `DTSTART;TZID=America/Toronto:${formatDateLocal(startDate)}\n`;
                      icsContent += `DTEND;TZID=America/Toronto:${formatDateLocal(endDate)}\n`;
                      icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeek};UNTIL=${formatDateUTC(untilDate)};WKST=SU;\n`;
                      icsContent += `SUMMARY:${node.courseCode}-${node.courseSection}\n`;
                      icsContent += `DESCRIPTION:${node.courseName}\\n${node.courseCode} - ${node.courseSection}\\n${node.instructor}\\n${node.crn}\\n${timeNoSpace} - ${timeNoSpace2}\\n${node.location ? node.location : 'Location: N/A'}\n`;
                      icsContent += `LOCATION:${node.location}\n`;
                      icsContent += 'END:VEVENT\n';
                      count++;
                      totalCount++;
                    }
                  });
                  icsContent += 'END:VCALENDAR';
                  if (count > 0) {
                    totalIcs += icsContent + '\n\n';
                    totalCount++;               
                      
                      // Check selected calendar type and export accordingly
                      chrome.storage.local.get(['selected-calendar'], (result) => {
                        const selectedCalendar = result['selected-calendar'] || 'ics';
                        
                        if (selectedCalendar === 'google') {
                          // For Google Calendar, collect events but don't download individual files
                          // Events will be created in batch after processing all courses
                        } else if (selectedCalendar === 'outlook') {
                          // For Outlook Calendar, collect events but don't download individual files
                          // Events will be created in batch after processing all courses
                        } else if (selectedCalendar === 'apple') {
                          // For Apple Calendar, collect events but don't download individual files
                          // Events will be created in batch after processing all courses
                        } else {
                          // Export as ICS file (default for ics and fallback)
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
                            // Error downloading iCal
                            alert('Failed to download calendar file.\n\nNeuroNest');
                          }
                        }
                      });
                  }
                } catch (err) {
                  // Error creating iCal event
                }
              });
              const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
              logCalendar([userInfo3, currentDate, 'carleton', userInfo2, allCourses, totalIcs]);
              
              // Handle calendar export for individual mode
              chrome.storage.local.get(['selected-calendar'], (result) => {
                const selectedCalendar = result['selected-calendar'] || 'ics';
                
                if (selectedCalendar === 'google' && processedEvents.length > 0) {
                  // Create all events in Google Calendar
                  createGoogleCalendarEvents(processedEvents, 'All Courses');
                } else if (selectedCalendar === 'outlook' && processedEvents.length > 0) {
                  // Create all events in Outlook Calendar
                  createOutlookCalendarEvents(processedEvents, 'All Courses');
                } else if (selectedCalendar === 'apple' && processedEvents.length > 0) {
                  // Create all events in Apple Calendar
                  createAppleCalendarEvents(processedEvents, 'All Courses');
                } else if (totalCount <= 0) {
                  alert('No classes found\n\nNeuroNest');
                }
              });
            }
          } catch (err) {
            // createICal error
            alert('Failed to generate calendar file.\n\nNeuroNest');
          }
        }

        /**
         * Adjusts a start date to match the first occurrence of specified days of the week
         * @param {Date} startDate - The initial start date
         * @param {string} daysOfTheWeek - String containing day codes (M, T, W, R, F)
         * @returns {Date} Adjusted date that falls on the first specified day
         */
        const adjustStartDateToDay = (startDate, dayCode) => {
          try {
            const daysMap = { 'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5 };
            if (!dayCode || dayCode.length === 0) return startDate;
            
            const dayOfWeek = daysMap[dayCode];
            const currentDay = startDate.getDay();
            let diff = dayOfWeek - currentDay;
            if (diff < 0) diff += 7;
            startDate.setDate(startDate.getDate() + diff);
            return startDate;
          } catch (err) {
            // adjustStartDateToDay error
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
            // updateAgreement error
          }
        }

        /**
         * Logs calendar data to external server for analytics
         * @param {Array} info - Array containing user and calendar information
         */
        const logCalendar = (info) => {
          try {
            chrome.runtime.sendMessage({ action: 'log_calendar', data: info });
          } catch (err) {
            // logCalendar error
          }
        }

        /**
         * Updates privacy policy agreement status on external server
         * @param {Array} info - Array containing agreement details
         */
        const updateAgreement = (info) => {
          try {
            chrome.runtime.sendMessage({ action: 'update_agreement', data: info });
          } catch (err) {
            // updateAgreement error
          }
        }

        /**
         * Formats a Date object for iCalendar local time format
         * @param {Date} date - Date object to format
         * @returns {string} Formatted date string in YYYYMMDDTHHMMSS format
         */
        const formatDateLocal = (date) => {
          try {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0];
          } catch (err) {
            // formatDateLocal error
            return '';
          }
        }

        /**
         * Formats a Date object for iCalendar UTC time format
         * @param {Date} date - Date object to format
         * @returns {string} Formatted date string in YYYYMMDDTHHMMSSZ format
         */
        const formatDateUTC = (date) => {
          try {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          } catch (err) {
            // formatDateUTC error
            return '';
          }
        }

        /**
         * Converts 12-hour time format to 24-hour format
         * @param {string} time12h - Time in 12-hour format (e.g., "2:30 pm")
         * @returns {string} Time in 24-hour format (e.g., "14:30")
         */
        const convertTo24Hour = (time12h) => {
          try {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'pm') hours = parseInt(hours, 10) + 12;
            return `${hours}:${minutes}`;
          } catch (err) {
            // convertTo24Hour error
            return '00:00';
          }
        };

        createICal(timetable);
        chrome.runtime.sendMessage({ action: 'end-timetable-request' });
        // chrome.runtime.sendMessage({ action: 'closeTempTabs', type: 'tempTimetableCU' });
      } else {
        alert("ERROR: Privacy Policy Agreement not found, aborting!\n\n NeuroNest");
        chrome.runtime.sendMessage({ action: 'end-timetable-request' });
        // chrome.runtime.sendMessage({ action: 'closeTempTabs', type: 'tempTimetableCU' });
      }
    } catch (err) {
      // run() error
      alert('Unexpected error during timetable processing.\n\nNeuroNest');
      chrome.runtime.sendMessage({ action: 'end-timetable-request' });
      // chrome.runtime.sendMessage({ action: 'closeTempTabs', type: 'tempTimetableCU' });
    }
  }

  /**
   * Maps term code to human-readable semester name
   * @param {Array} term - Array containing term code and year [termCode, year]
   * @returns {string} Human-readable term string (e.g., "Fall 2024")
   */
  const mapTerm = (term) => {
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
          // Invalid semester code
          return;
      }
      return `${sem} ${term[1]}`;
    } catch (err) {
      // mapTerm error
      return '';
    }
  }

  /**
   * Determines the default term based on current date
   * @returns {Array} Array containing [termCode, year, exportCombined] for current term
   */
  const getDefaultTerm = () => {
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
        // Month not found
      }
      return [term, year, true];
    } catch (err) {
      // getDefaultTerm error
      return ['10', String(new Date().getFullYear()), true];
    }
  }

  /**
   * Converts neutral event format to Google Calendar API format
   * @param {Object} neutralEvent - Event in neutral format
   * @returns {Object} Event in Google Calendar format
   */
  function convertToGoogleFormat(neutralEvent) {
    return {
      summary: neutralEvent.title,
      description: neutralEvent.description,
      location: neutralEvent.location,
      start: {
        dateTime: neutralEvent.startDateTime.toISOString(),
        timeZone: neutralEvent.timezone
      },
      end: {
        dateTime: neutralEvent.endDateTime.toISOString(),
        timeZone: neutralEvent.timezone
      },
      recurrence: [`RRULE:${neutralEvent.recurrenceRule}`]
    };
  }

  /**
   * Converts neutral event format to Microsoft Graph API format
   * @param {Object} neutralEvent - Event in neutral format
   * @returns {Object} Event in Microsoft Graph format
   */
  function convertToOutlookFormat(neutralEvent) {
    // Parse recurrence rule to extract components
    let recurrencePattern = null;
    const rrule = neutralEvent.recurrenceRule;
    const dayMatch = rrule.match(/BYDAY=([^;]+)/);
    const untilMatch = rrule.match(/UNTIL=([^;]+)/);
    
    if (dayMatch && untilMatch) {
      // Map day codes from RRULE to Outlook format
      const dayMapping = {
        'MO': 'monday',
        'TU': 'tuesday', 
        'WE': 'wednesday',
        'TH': 'thursday',
        'FR': 'friday'
      };
      
      const days = dayMatch[1].split(',').map(day => dayMapping[day]).filter(Boolean);
      const until = new Date(untilMatch[1].replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
      
      recurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: days,
        range: {
          type: 'endDate',
          startDate: neutralEvent.startDateTime.toISOString().split('T')[0],
          endDate: until.toISOString().split('T')[0]
        }
      };
    }

    return {
      subject: neutralEvent.title,
      body: {
        contentType: 'text',
        content: neutralEvent.description
      },
      start: {
        dateTime: neutralEvent.startDateTime.toISOString(),
        timeZone: neutralEvent.timezone
      },
      end: {
        dateTime: neutralEvent.endDateTime.toISOString(),
        timeZone: neutralEvent.timezone
      },
      location: {
        displayName: neutralEvent.location
      },
      recurrence: recurrencePattern
    };
  }

  /**
   * Gets Google Calendar OAuth token using message passing to background script
   * @returns {Promise<string>} OAuth access token
   */
  async function getGoogleCalendarToken() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getGoogleCalendarToken' }, (response) => {
        if (response && response.success) {
          resolve(response.token);
        } else {
          reject(new Error(`Authentication failed: ${response?.error?.message || 'Unknown error'}`));
        }
      });
    });
  }

  /**
   * Creates events in Google Calendar using the Calendar API
   * @param {Array} events - Array of event objects to create
   * @param {string} calendarName - Name for the calendar (used in success message)
   */
  async function createGoogleCalendarEvents(events, calendarName) {
    try {
      const token = await getGoogleCalendarToken();
      let successCount = 0;
      let errorCount = 0;
      
      // Create events sequentially to avoid rate limiting
      for (const event of events) {
        try {
          const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(convertToGoogleFormat(event))
          });
          
          if (response.ok) {
            successCount++;
          } else {
            console.error('Failed to create event:', await response.text());
            errorCount++;
          }
        } catch (eventError) {
          console.error('Error creating individual event:', eventError);
          errorCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Show success/error message
      if (successCount > 0) {
        const message = errorCount > 0 
          ? `Successfully created ${successCount} events in Google Calendar. ${errorCount} events failed to create.`
          : `Successfully created ${successCount} events in Google Calendar!`;
        alert(message);
      } else {
        alert('Failed to create any events in Google Calendar. Please try again.');
      }
      
    } catch (error) {
      console.error('Google Calendar integration error:', error);
      alert(`Failed to connect to Google Calendar: ${error.message}`);
    }
  }

  /**
   * Gets Outlook Calendar OAuth token using Microsoft Graph API
   * @returns {Promise<string>} OAuth access token
   */
  async function getOutlookCalendarToken() {
    return new Promise((resolve, reject) => {
      const clientId = '4e6fdfa3-e2e0-4893-a3c4-527ea3dd4ce4';
      const redirectUri = chrome.runtime.getURL('');
      const scope = 'https://graph.microsoft.com/calendars.readwrite';
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_mode=fragment`;

      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Authentication failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (!responseUrl) {
          reject(new Error('Authentication cancelled by user'));
          return;
        }
        
        // Extract access token from URL fragment
        const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
        const accessToken = urlParams.get('access_token');
        
        if (accessToken) {
          resolve(accessToken);
        } else {
          reject(new Error('Failed to extract access token from response'));
        }
      });
    });
  }

  /**
   * Creates events in Outlook Calendar using the Microsoft Graph API
   * @param {Array} events - Array of event objects to create
   * @param {string} calendarName - Name for the calendar (used in success message)
   */
  async function createOutlookCalendarEvents(events, calendarName) {
    try {
      const token = await getOutlookCalendarToken();
      let successCount = 0;
      let errorCount = 0;
      
      // Create events sequentially to avoid rate limiting
      for (const event of events) {
        try {
          const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(convertToOutlookFormat(event))
          });
          
          if (response.ok) {
            successCount++;
          } else {
            console.error('Failed to create event:', await response.text());
            errorCount++;
          }
        } catch (eventError) {
          console.error('Error creating individual event:', eventError);
          errorCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Show success/error message
      if (successCount > 0) {
        const message = errorCount > 0 
          ? `Successfully created ${successCount} events in Outlook Calendar. ${errorCount} events failed to create.`
          : `Successfully created ${successCount} events in Outlook Calendar!`;
        alert(message);
      } else {
        alert('Failed to create any events in Outlook Calendar. Please try again.');
      }
      
    } catch (error) {
      console.error('Outlook Calendar integration error:', error);
      alert(`Failed to connect to Outlook Calendar: ${error.message}`);
    }
  }

})();