chrome.storage.local.get(['carleton',"privacy_policy_agreement"],(results)=>{
  var r;
  var pa;
  if(!results){
    r=getDefaultTerm()
    alert("No default term found;\Using:",r)
  }else{
    r=results['carleton']
    pa=results['privacy_policy_agreement']
  }
  //console.log('IM HERE')
  const termSelector = document.getElementById('term_id')
  const BIG_FAT_HEADER = 'body > div.pagetitlediv > table > tbody > tr:nth-child(1) > td:nth-child(1) > h2'
  const timetableNav = 'body > div.footerlinksdiv > span > map > p:nth-child(2) > a:nth-child(2)'
  const calendarNav = 'body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(3) > td:nth-child(2) > span > ul > li:nth-child(1) > a:nth-child(4)'
  const targetTerm = r[1]+r[0]
  const exportCombined = r[2]
  const submitBtn = document.querySelector('input[type=submit]')
  const tableElement ='table.datadisplaytable[summary="This table lists the scheduled meeting times and assigned instructors for this class.."]'

  if(document.title.trim()=='Sign In'){
    // chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
  }
  else if(document.title.trim()=='Sign out'){
    // chrome.runtime.sendMessage({action:'redirect', href:'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd'})
    window.location.href='https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd'
  }
  else if(document.title.trim()=='Main Menu'){
    waitForElmText(calendarNav,'Student Timetable').then(
      document.querySelector(calendarNav).click()
    )
  }
  else if(document.title.trim()=='Student Timetable'){
    // chrome.runtime.sendMessage({action:'timetable1', node:'carleton', case:'student-calendar', tab:tab[0],script:'armory/carleton-timetable.js'})
    waitForElmText(timetableNav,'Detail Schedule').then(
      document.querySelector(timetableNav).click()
    )
  }
  else if(document.title.trim()=='Registration Term'){
    waitForElm('#term_id').then(()=>{
      //console.log('termSelector found')
      if (isValidTerm(termSelector, targetTerm)) {
        termSelector.value = targetTerm;
        submitBtn.click();
      } else {
        alert(`Request failed: Term [${mapTerm(r)}] Not Found\n\nTimetable Tools`)
        chrome.runtime.sendMessage({action:'end-timetable-request'})
        chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
      }
    })
  }
  else if(document.title.trim()=='Student Detail Schedule'){
    chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempLoginCU'})
    waitForElm(BIG_FAT_HEADER).then((elm) => {
      //console.log('Timetable Loaded');
      //console.log(elm.textContent);
      run()
    })
  }
  else{
    // chrome.runtime.sendMessage({action:'timetable1', node:'carleton', case:'sign-in', tab:tab[0], script:'armory/carleton-timetable.js'})
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

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
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
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = userInfo2+'.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }else{
            alert('Nothing to see here...\n\nSparkling H2O2')
          }
          const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
          logCalendar([userInfo3, currentDate, 'carleton', userInfo2, allCourses, icsContent]);
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
          logCalendar([userInfo3, currentDate, 'carleton', userInfo2, allCourses, totalIcs]);
          if(totalCount<=0){
            alert('No classes found\n\nSparkling H2O2')
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
        updateAgreement([userInfo3, "Sparkling H2O2", pa[1], new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false }), pa[0]?"Yes":"No"])
      }

      function logCalendar(info){
        chrome.runtime.sendMessage({action:'log_calendar', data:info});
      }
      
      function updateAgreement(info){
        chrome.runtime.sendMessage({action:'update_agreement', data:info});
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
      alert("ERROR: Privacy Policy Agreement not found, aborting!\n\n Sparkling H2O2")
      chrome.runtime.sendMessage({action:'end-timetable-request'})
      chrome.runtime.sendMessage({action:'closeTempTabs', type:'tempTimetableCU'})
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

  function delay(ms){
    return new Promise(resolve => setTimeout(resolve, ms))
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