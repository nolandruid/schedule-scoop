// console.log('im here')
chrome.storage.local.get(['carleton',"privacy_policy_agreement"],(results)=>{
  var r;
  var pa;
  if(!results){
    r=getDefaultTerm()
    alert("No default term found; Using:",r)
  }else{
    r=results['carleton']
    pa=results['privacy_policy_agreement'] || [true, new Date().toISOString(), false] // Default to agreed
  }
  
  // Ensure privacy policy is set if missing
  if (!pa) {
    pa = [true, new Date().toISOString(), false];
    chrome.storage.local.set({
      privacy_policy_agreement: pa
    });
  }
  
  console.log('Schedule Export Debug:', {
    term: r,
    privacy: pa,
    title: document.title.trim(),
    url: window.location.href
  });
  //console.log('IM HERE')
  const termSelector = document.getElementById('term_id')
  const BIG_FAT_HEADER = 'body > div.pagetitlediv > table > tbody > tr:nth-child(1) > td:nth-child(1) > h2'
  const timetableNav = 'body > div.footerlinksdiv > span > map > p:nth-child(2) > a:nth-child(2)'
  const calendarNav = 'body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(3) > td:nth-child(2) > span > ul > li:nth-child(1) > a:nth-child(4)'
  const targetTerm = r[1]+r[0]
  const exportCombined = r[2]
  const submitBtn = document.querySelector('input[type=submit]')
  
  console.log('Processing page:', document.title.trim());
  
  if(document.title.trim()=='Sign In'){
    console.log('On sign in page - waiting for login...');
  }
  else if(document.title.trim()=='Sign out'){
    console.log('Signed out - redirecting to main page');
    window.location.href='https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd'
  }
  else if(document.title.trim()=='Main Menu'){
    console.log('On main menu - navigating to student timetable');
    waitForElmText(calendarNav,'Student Timetable').then(() => {
      document.querySelector(calendarNav).click()
    }).catch(() => {
      console.log('Could not find Student Timetable link, trying direct navigation');
      window.location.href = 'https://central.carleton.ca/prod/bwskfshd.P_CrseSchd';
    })
  }
  else if(document.title.trim()=='Student Timetable'){  
    console.log('On student timetable page - navigating to detail schedule');
    waitForElmText(timetableNav,'Detail Schedule').then(() => {
      document.querySelector(timetableNav).click()
    }).catch(() => {
      console.log('Could not find Detail Schedule link, trying direct navigation');
      window.location.href = 'https://central.carleton.ca/prod/bwskfshd.P_CrseSchdDetl';
    })
  }
  else if(document.title.trim()=='Registration Term'){
    console.log('On term selection page - selecting term:', targetTerm);
    waitForElm('#term_id').then(()=>{
      //console.log('termSelector found')
      if (isValidTerm(termSelector, targetTerm)) {
        termSelector.value = targetTerm;
        submitBtn.click();
      } else {
        alert(`Request failed: Term [${mapTerm(r)}] Not Found\n\nCarleton Schedule Exporter`)
        chrome.runtime.sendMessage({action:'end-timetable-request'})
        chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
      }
    })
  }
  else if(document.title.trim()=='Student Detail Schedule'){
    console.log('On detail schedule page - starting export');
    chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempLoginCU'})
    waitForElm(BIG_FAT_HEADER).then((elm) => {
      //console.log('Timetable Loaded');
      //console.log(elm.textContent);
      run()
    })
  }
  else{
    console.log('Unknown page or stuck:', document.title.trim(), window.location.href);
    
    // If we're on a Carleton page but don't recognize it, try to navigate to the right place
    if (window.location.href.includes('central.carleton.ca') || window.location.href.includes('ssoman.carleton.ca')) {
      console.log('Attempting navigation to schedule page...');
      
      // Try to find and click schedule-related links
      const scheduleLinks = document.querySelectorAll('a');
      let foundScheduleLink = false;
      
      for (let link of scheduleLinks) {
        if (link.textContent.includes('Student Detail Schedule') || 
            link.textContent.includes('Detail Schedule') ||
            link.href.includes('bwskfshd.P_CrseSchdDetl')) {
          console.log('Found schedule link, clicking...');
          link.click();
          foundScheduleLink = true;
          break;
        }
      }
      
      if (!foundScheduleLink) {
        console.log('No schedule link found, trying direct navigation...');
        window.location.href = 'https://central.carleton.ca/prod/bwskfshd.P_CrseSchdDetl';
      }
    } else {
      alert('Please log into Carleton Central first, then try the export again.');
      chrome.runtime.sendMessage({action:'end-timetable-request'})
      chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
    }
  }

  function waitForElm(selector) {
    return new Promise(resolve => {
      //console.log('waiting for',selector,'...')
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
    });
  }

  function waitForElmText(selector, text, maxWaitTime = 5000) {
    return Promise.race([
      new Promise((resolve, reject) => {
        const observer = new MutationObserver((mutations, observer) => {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim() === text) {
            observer.disconnect();
            resolve(element);
          }
        });
  
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for element text')), maxWaitTime)
      )
    ]);
  }

  function isValidTerm(termSelector, targetTerm) {
    const options = termSelector.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value == targetTerm) {
        return true;
      }
    }
    return false;
  }  

  function run(){
    if(pa[0]){
    //console.log('running  downloader.')
    const tables = [];
    const log = []
    const staticHeadersDiv = document.querySelector('.staticheaders')
    const userInfo2 = staticHeadersDiv ? staticHeadersDiv.innerHTML.split('<br>')[1].trim().split(' ').slice(0,2).join(' ') : 'Nameless';
    const userInfo3 = staticHeadersDiv ? staticHeadersDiv.innerHTML.split('<br>')[0].trim().split(' ').slice(1).join(' ') : 'Unknown User';
    document.querySelectorAll('table.datadisplaytable').forEach((table, index) => {
      const section = {};
      const meta = {}
      meta['table-num']=index
      if (table.querySelector('a')) {
        //console.log(table.querySelectorAll('tr'))
        table.querySelectorAll('tr').forEach((r) => {
          const headerElement = r.querySelector('th');
          const valueElement = r.querySelector('td');
          if (headerElement && valueElement) {
            let header = headerElement.textContent.slice(0, -1).trim();
            let value = valueElement.textContent.trim();
            meta[header] = value;
          }
        });
        let courseData = table.querySelector('a').textContent.trim().split(' - ').reverse()
        let courseCode = courseData[1]
        let courseSection = courseData[0]
        let courseName = courseData.slice(2).join(' - ')
        let crn = getRowContent(table, 3);
        let instructor = getRowContent(table, 5);
        //console.log(courseData,'\n',courseCode,'\n',courseSection,'\n',courseName)
        section.courseName = courseName;  
        section.courseCode = courseCode;
        section.courseSection = courseSection
        section.crn=crn
        section.instructor = instructor.trim()?instructor.trim():'Instructor: N/A'
        tables[index / 2] = section;
        log.push(meta)
      } else {
        
        const row = table.querySelector('tr:nth-of-type(2)');
        const cells = row.querySelectorAll('td');
        section.classStartTime = cells[1].textContent.trim()=='TBA'?'N/A':cells[1].textContent.trim().split(' - ')[0];
        section.classEndTime = cells[1].textContent.trim()=='TBA'?'N/A':cells[1].textContent.trim().split(' - ')[1];
        //console.log('starttimes:',section.classStartTime, section.classEndTime)
        section.daysOfTheWeek = cells[2].textContent.trim();
        section.location = cells[3].textContent.trim()=='TBA'?'':cells[3].textContent.trim();
        section.startDate = new Date(cells[4].textContent.trim().split(' - ')[0]);
        section.endDate = new Date(cells[4].textContent.trim().split(' - ')[1]);
        Object.assign(tables[Math.floor(index/2)], section);

        table.querySelectorAll('th').forEach((r,o)=>{
          let header = r.textContent.trim()
          let value = cells[o].textContent.trim()
          meta[header]=value
        })
        log.push(meta)
      }
    });

    const timetable= tables;
    //console.log('timetable:\n',timetable)
    function getRowContent(table, rowIndex) {
      const row = table.querySelector(`tr:nth-of-type(${rowIndex}) td`);
      return !(row=='') ? row.textContent.trim() : 'N/A';
    }
    
    function createICal(timetable) {
      //console.log('Creating iCal with timetable:', timetable);
      
      if(exportCombined){
        let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SparklingH2O2//CU_Timetable//EN\n';
        var count=0;
        var allCourses='';
        timetable.forEach(node => {
          //console.log('Processing node:', node);
          node.startDate = adjustStartDateToDay(new Date(node.startDate), node.daysOfTheWeek);
          const daysMap = {
            'M': 'MO',
            'T': 'TU',
            'W': 'WE',
            'R': 'TH',
            'F': 'FR'
          };
      
          //console.log('unconverted time: ', node.classStartTime, 'end:', node.classEndTime);
          const startTime = node.classStartTime=='N/A'?'none':convertTo24Hour(node.classStartTime).split(':');
          const endTime = node.classEndTime=='N/A'?'none':convertTo24Hour(node.classEndTime).split(':');
          //console.log('converted to 24 hours:', startTime, 'end:', endTime);
          const startHour = parseInt(startTime[0], 10);
          const startMinute = parseInt(startTime[1], 10);
          const endHour = parseInt(endTime[0], 10);
          const endMinute = parseInt(endTime[1], 10);
          const timeNoSpace = node.classStartTime.replace(/\s/g, '');
          const timeNoSpace2 = node.classEndTime.replace(/\s/g, '');
          var dayList = []
          node.daysOfTheWeek.split('').forEach(day => {
            //console.log('day:', day);
            const dayOfWeek = daysMap[day];
            dayList.push(dayOfWeek)
          });
          if (dayList && startTime!='none') {
            const courseInfo = `${node.courseCode} - ${node.courseSection}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location?node.location:'Location: N/A'}\n${node.courseName}\n${node.instructor}\n${node.crn}\n...\n`;
            const startDate = new Date(node.startDate);
            const endDate = new Date(node.startDate); // Use the same start date for DTEND
            const untilDate = new Date(node.endDate);
            untilDate.setDate(untilDate.getDate() + 1);
            startDate.setUTCHours(startHour, startMinute, 0, 0);
            endDate.setUTCHours(endHour, endMinute, 0, 0);
            //console.log(`Creating event for ${node.courseName} on ${dayList}`);
            //console.log(`Start Date: ${startDate}`);
            //console.log(`End Date: ${endDate}`);
            allCourses+=courseInfo;
            icsContent += 'BEGIN:VEVENT\n';
            icsContent += `DTSTART;TZID=America/Toronto:${formatDateLocal(startDate)}\n`;
            icsContent += `DTEND;TZID=America/Toronto:${formatDateLocal(endDate)}\n`;
            icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayList.join(',')};UNTIL=${formatDateUTC(untilDate)};WKST=SU;\n`;
            icsContent += `SUMMARY:${node.courseCode}-${node.courseSection}\n`;
            icsContent += `DESCRIPTION:${node.courseName}\\n${node.courseCode} - ${node.courseSection}\\n${node.instructor}\\n${node.crn}\\n${timeNoSpace} - ${timeNoSpace2}\\n${node.location?node.location:'Location: N/A'}\n`;
            icsContent += `LOCATION:${node.location}\n`;
            icsContent += 'END:VEVENT\n';
            count++
          }
        });
        icsContent += 'END:VCALENDAR';
        //console.log('iCal content generated:', icsContent);
        if(count>0){
          // Instead of downloading, open calendar integration
          openCalendarIntegration(icsContent, userInfo2, count);
        }else{
          alert('Nothing to see here...\n\nCarleton Schedule Exporter')
        }
        const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
        // Store export locally instead of sending to server
        const exportData = {
          user: userInfo3,
          timestamp: currentDate,
          institution: 'carleton',
          term: userInfo2,
          courses: allCourses,
          courseCount: count
        };
        
        chrome.runtime.sendMessage({
          action:'log_calendar', 
          data: [userInfo3, currentDate, 'carleton', userInfo2, allCourses, icsContent]
        });
        
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('images/sky-icon.png'),
          title: 'Schedule Exported!',
          message: `Successfully exported ${count} courses for ${userInfo2}`
        });
      }
      else{
        var totalCount=0
        var totalIcs = '';
        var allCourses='';
        timetable.forEach(node => {
          let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SparklingH2O2//Timetable//EN\n';
          var count=0;
          //console.log('Processing node:', node);
          node.startDate = adjustStartDateToDay(new Date(node.startDate), node.daysOfTheWeek);
          const daysMap = {
            'M': 'MO',
            'T': 'TU',
            'W': 'WE',
            'R': 'TH',
            'F': 'FR'
          };
      
          //console.log('unconverted time: ', node.classStartTime, 'end:', node.classEndTime);
          const startTime = node.classStartTime=='N/A'?'none':convertTo24Hour(node.classStartTime).split(':');
          const endTime = node.classEndTime=='N/A'?'none':convertTo24Hour(node.classEndTime).split(':');
          //console.log('converted to 24 hours:', startTime, 'end:', endTime);
          const startHour = parseInt(startTime[0], 10);
          const startMinute = parseInt(startTime[1], 10);
          const endHour = parseInt(endTime[0], 10);
          const endMinute = parseInt(endTime[1], 10);
          const timeNoSpace = node.classStartTime.replace(/\s/g, '');
          const timeNoSpace2 = node.classEndTime.replace(/\s/g, '');
          var dayList = []
          node.daysOfTheWeek.split('').forEach(day => {
            //console.log('day:', day);
            const dayOfWeek = daysMap[day];
            dayList.push(dayOfWeek)
          });
          if (dayList && startTime!='none') {
            const startDate = new Date(node.startDate);
            const endDate = new Date(node.startDate); // Use the same start date for DTEND
            const untilDate = new Date(node.endDate);
            untilDate.setDate(untilDate.getDate() + 1);
  
            startDate.setUTCHours(startHour, startMinute, 0, 0);
            endDate.setUTCHours(endHour, endMinute, 0, 0);
            const courseInfo = `${node.courseCode} - ${node.courseSection}\n${timeNoSpace} - ${timeNoSpace2}\n${node.location?node.location:'Location: N/A'}\n${node.courseName}\n${node.instructor}\n${node.crn}\n...\n`;
            //console.log(`Creating event for ${node.courseName} on ${dayList}`);
            //console.log(`Start Date: ${startDate}`);
            //console.log(`End Date: ${endDate}`);
            allCourses+=courseInfo;
            icsContent += 'BEGIN:VEVENT\n';
            icsContent += `DTSTART;TZID=America/Toronto:${formatDateLocal(startDate)}\n`;
            icsContent += `DTEND;TZID=America/Toronto:${formatDateLocal(endDate)}\n`;
            icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayList.join(',')};UNTIL=${formatDateUTC(untilDate)};WKST=SU;\n`;
            icsContent += `SUMMARY:${node.courseCode}-${node.courseSection}\n`;
            icsContent += `DESCRIPTION:${node.courseName}\\n${node.courseCode} - ${node.courseSection}\\n${node.instructor}\\n${node.crn}\\n${timeNoSpace} - ${timeNoSpace2}\\n${node.location?node.location:'Location: N/A'}\n`;
            icsContent += `LOCATION:${node.location}\n`;
            icsContent += 'END:VEVENT\n';
            count++
            totalCount++
          }
          icsContent += 'END:VCALENDAR';
          //console.log('iCal content generated:', icsContent);
          if(count>0){
            totalIcs+=icsContent+'\n\n';
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${node.courseCode}-${node.courseSection}`+'.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
        const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
        // Store export locally instead of sending to server
        const exportData = {
          user: userInfo3,
          timestamp: currentDate,
          institution: 'carleton',
          term: userInfo2,
          courses: allCourses,
          courseCount: totalCount
        };
        
        chrome.runtime.sendMessage({
          action:'log_calendar', 
          data: [userInfo3, currentDate, 'carleton', userInfo2, allCourses, totalIcs]
        });
        
        // Show success notification
        if(totalCount > 0) {
          // Instead of downloading, open calendar integration
          openCalendarIntegration(totalIcs, userInfo2, totalCount);
        } else {
          alert('No classes found\n\nCarleton Schedule Exporter')
        }
      }
    }

    function adjustStartDateToDay(startDate, daysOfTheWeek) {
      const daysMap = {
        'M': 1, // Monday
        'T': 2, // Tuesday
        'W': 3, // Wednesday
        'R': 4, // Thursday
        'F': 5  // Friday
      };

      const dayOfWeek = daysMap[daysOfTheWeek[0]]; // Get the first day of the week from the string
      const currentDay = startDate.getDay(); // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)

      // Calculate the difference in days to the desired day of the week
      let diff = dayOfWeek - currentDay;
      if (diff < 0) {
        diff += 7; // Adjust if the desired day is in the next week
      }

      // Adjust the start date
      startDate.setDate(startDate.getDate() + diff);
      return startDate;
    }
    if(!pa[2]){
      // Update privacy agreement locally only
      chrome.runtime.sendMessage({
        action:'update_agreement', 
        data: [userInfo3, "Carleton Schedule Exporter", pa[1], new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false }), pa[0]?"Yes":"No"]
      });
    }

    function logCalendar(info){
      // This function is kept for backward compatibility but no longer sends data externally
      console.log('Export completed locally');
    }

    function updateAgreement(info){
      // This function is kept for backward compatibility but no longer sends data externally
      console.log('Agreement updated locally');
    }
    
    function formatDateLocal(date) {
      //console.log('Formatting date local:', date);
      //console.log('finished date local:', date.toISOString().replace(/[-:]/g, '').split('.')[0]);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0];
    }
    
    function formatDateUTC(date) {
      //console.log('Formatting date:', date);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    
    const convertTo24Hour = (time12h) => {
      const [time, modifier] = time12h.split(' ');
    
      let [hours, minutes] = time.split(':');
      //console.log('before format: ',`${hours},${minutes}`)

      if (hours === '12') {
        hours = '00';
      }
    
      if (modifier === 'pm') {
        //console.log('pm detected, adding 12')
        hours = parseInt(hours, 10) + 12;
      }
      //console.log('after format: ',`${hours}:${minutes}`)
      return `${hours}:${minutes}`;
    }
    
    // Sample timetable data
    const tempTimetable = [
      {
        courseName: "Introduction to Computer Science II",
        courseCode: "COMP 1406",
        courseSection: "E",
        crn: "11164",
        instructor: "Farah H. Chanchary",
        classStartTime: "2:35 pm",
        classEndTime: "3:55 pm",
        daysOfTheWeek: "MW",
        location: "Nicol Building 4010",
        startDate: "2025-01-06T05:00:00.000Z",
        endDate: "2025-04-08T04:00:00.000Z"
      }
    ];
    createICal(timetable);
    chrome.runtime.sendMessage({action:'end-timetable-request'})
    chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
    }
    else{
      alert("ERROR: Privacy Policy Agreement not found, aborting!\n\n Carleton Schedule Exporter")
      chrome.runtime.sendMessage({action:'end-timetable-request'})
      chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
    }
    
    function openCalendarIntegration(icsContent, userName, courseCount) {
      // Create calendar integration modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      `;
      
      content.innerHTML = `
        <h2 style="color: #333; margin-bottom: 10px;">Schedule Ready! 📅</h2>
        <p style="color: #666; margin-bottom: 20px;">Found ${courseCount} courses for ${userName}</p>
        <p style="color: #666; margin-bottom: 25px;">Choose how to add to your calendar:</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
          <button id="googleCalBtn" style="background: #4285f4; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
            📊 Google Calendar
          </button>
          <button id="outlookCalBtn" style="background: #0078d4; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
            📧 Outlook
          </button>
          <button id="appleCalBtn" style="background: #000; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
            🍎 Apple Calendar
          </button>
          <button id="notionCalBtn" style="background: #37352f; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-size: 14px;">
            📝 Notion Calendar
          </button>
        </div>
        
        <button id="copyToClipboard" style="background: #28a745; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; margin: 5px; font-size: 14px;">
          📋 Copy Schedule Data
        </button>
        
        <button id="closeModal" style="background: #6c757d; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; margin: 5px; font-size: 14px;">
          ✕ Close
        </button>
      `;
      
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      // Google Calendar integration
      document.getElementById('googleCalBtn').onclick = () => {
        const events = parseICSEvents(icsContent);
        events.forEach((event, index) => {
          setTimeout(() => {
            const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.summary)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
            window.open(googleUrl, '_blank');
          }, index * 500); // Stagger opens to avoid popup blocking
        });
        showSuccess('Opening Google Calendar events...');
      };
      
      // Outlook integration
      document.getElementById('outlookCalBtn').onclick = () => {
        chrome.tabs.create({ url: 'https://outlook.live.com/calendar/' });
        copyToClipboard(icsContent);
        showInstructions('Outlook Calendar opened! Calendar data copied to clipboard. In Outlook: Settings → Import Calendar → Paste the data.');
      };
      
      // Apple Calendar
      document.getElementById('appleCalBtn').onclick = () => {
        const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${userName}-schedule.ics`;
        link.click();
        showSuccess('Calendar file created! Double-click to open in Apple Calendar.');
      };
      
      // Notion Calendar
      document.getElementById('notionCalBtn').onclick = () => {
        chrome.tabs.create({ url: 'https://calendar.notion.so/' });
        copyToClipboard(icsContent);
        showInstructions('Notion Calendar opened! Calendar data copied to clipboard. In Notion: Settings → Import → Paste the data.');
      };
      
      // Copy to clipboard
      document.getElementById('copyToClipboard').onclick = () => {
        copyToClipboard(icsContent);
        showSuccess('Schedule data copied to clipboard!');
      };
      
      // Close modal
      document.getElementById('closeModal').onclick = () => {
        document.body.removeChild(modal);
      };
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      };
      
      function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          console.log('Copied to clipboard');
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        });
      }
      
      function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
          background: #d4edda;
          color: #155724;
          padding: 10px;
          border-radius: 5px;
          margin-top: 15px;
          border: 1px solid #c3e6cb;
        `;
        successDiv.textContent = message;
        content.appendChild(successDiv);
        
        setTimeout(() => {
          if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
          }
        }, 3000);
      }
      
      function showInstructions(message) {
        const instrDiv = document.createElement('div');
        instrDiv.style.cssText = `
          background: #fff3cd;
          color: #856404;
          padding: 10px;
          border-radius: 5px;
          margin-top: 15px;
          border: 1px solid #ffeaa7;
          font-size: 12px;
        `;
        instrDiv.textContent = message;
        content.appendChild(instrDiv);
        
        setTimeout(() => {
          if (instrDiv.parentNode) {
            instrDiv.parentNode.removeChild(instrDiv);
          }
        }, 5000);
      }
    }
    
    function parseICSEvents(icsContent) {
      const events = [];
      const lines = icsContent.split('\n');
      let currentEvent = {};
      let inEvent = false;
      
      for (let line of lines) {
        line = line.trim();
        
        if (line === 'BEGIN:VEVENT') {
          inEvent = true;
          currentEvent = {};
        } else if (line === 'END:VEVENT') {
          inEvent = false;
          if (currentEvent.summary) {
            events.push(currentEvent);
          }
        } else if (inEvent) {
          if (line.startsWith('SUMMARY:')) {
            currentEvent.summary = line.substring(8);
          } else if (line.startsWith('DTSTART;TZID=America/Toronto:')) {
            currentEvent.start = line.substring(30);
          } else if (line.startsWith('DTEND;TZID=America/Toronto:')) {
            currentEvent.end = line.substring(28);
          } else if (line.startsWith('DESCRIPTION:')) {
            currentEvent.description = line.substring(12).replace(/\\n/g, '\n');
          } else if (line.startsWith('LOCATION:')) {
            currentEvent.location = line.substring(9);
          }
        }
      }
      
      return events;
    }
  }

  function mapTerm(term){
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
    return `${sem} ${term[1]}`
  }

  function getDefaultTerm() {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    let year = String(currentDate.getFullYear());
    let term;
    if (month >= 1 && month <= 4) {
      term = '10';
    } else if (month >= 5 && month <= 8) {
      term = '20';
    } else if (month >= 9 && month <= 11) {
      term = '30';
    } else if (month === 12) {
      term = '10';
      year = String(Number(year) + 1);
    } else {
      term = '10';
      console.error("ERROR: month not found. Default term is set to:", term, year);
    }
    //console.log("Default term is set to:", [term, year, false]);
    return [term, year, true];
  }
})