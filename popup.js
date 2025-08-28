const nodes = document.querySelectorAll(".node");
const staticNodes = document.querySelectorAll(".node.const.config");
const nodeSelectors = document.querySelectorAll(".selector");
const configBtns = document.querySelectorAll(".config-btn");
const nodeLists = document.querySelectorAll('.sub-menu a')
// Footer
const changePopupBtn = document.querySelector('.change-logo-btn');
const showUpdates = document.querySelector('.show-version-details');

const allOverlays = document.querySelectorAll('.config-overlay');
const darkScreen = document.querySelector(".dark-screen");
// Buttons
const infoBtns = document.querySelectorAll('.info-btn');
const saveBtns = document.querySelectorAll('.config-save-btn');
const resetBtns = document.querySelectorAll('.config-reset-btn');
const presetBtns = document.querySelectorAll('.config-preset-btn');
const closeBtns = document.querySelectorAll('.close-btn');
const dropdownConfigSelectors = document.querySelectorAll('.dropdown-config-select');
const policyBtns = document.querySelectorAll('.config-policy-btn');

// Switches
const switches = document.querySelectorAll('.toggle-switch')

const semesterSelect = document.getElementById("semester-select");
const yearSelect = document.getElementById("year-select");
const timetableOverlay = document.querySelector(".timetable.config-overlay");
const schoolSelect = document.getElementById("school-select");
const exportMode = document.getElementById('export-mode')

const bannerOverlay = document.querySelector('.banner-overlay');
const header = document.querySelector('.banner-header');
const content = document.querySelector('.banner-content');
const ok = document.querySelector('.banner-ok-btn');
const screen1 = document.querySelector(".banner-screen");

const policyAgreementCheckbox = document.getElementById('policy-agreement-checkbox');
const policyAgreementBtn = document.getElementById('policy-agreement-btn')
const policyModal = document.querySelector(".privacy-policy-modal")

// Calendar selection elements
const calendarOptions = document.querySelectorAll('.calendar-option');
//Google Calendar API configuration
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

const policyURL = 'https://github.com/nolandruid/schedule-scoop/blob/main/ext-privacy-policy'
const dataPolicyURL = 'https://github.com/nolandruid/schedule-scoop/blob/main/ext-privacy-policy'

const refresh = {
  'carleton': (e) => refreshTimetable(e),
  'ottawa': (e) => refreshTimetable(e),
  'waterloo': (e) => refreshTimetable(e)
}

const loader={
  'carleton':(e)=> loaderCarleton(e)
}

const policy = {
  'timetable-tools': ()=>{chrome.tabs.create({ url: dataPolicyURL });},
  'interface': ()=>{chrome.tabs.create({ url: policyURL });}
}

// click listener & menu toggle - nodes
if (nodes && nodes.forEach) {
  nodes.forEach(node => {
    if (node && node.addEventListener) {
      node.addEventListener("click", (e)=>{
        const nodeParent = e.target && e.target.closest ? e.target.closest("li") : null;
        if (nodeParent) {
          nodeParent.classList.toggle("showMenu")
        }
      })
    }
  })
}

// click listener & open options page
if (staticNodes && staticNodes.forEach) {
  staticNodes.forEach(node => {
    if (node && node.addEventListener) {
      node.addEventListener("click", (e)=>{
        if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage()
        }
      })
    }
  })
}

// click listener - selectors
if (nodeSelectors && nodeSelectors.forEach) {
  nodeSelectors.forEach(selector =>{
    if (selector && selector.addEventListener) {
      selector.addEventListener("click", (e)=>{
        if (!e) return;
        // Check if the click event originated from a config-btn
        if (e.target && e.target.closest && e.target.closest(".config-btn")) {
          e.stopPropagation();
          return;
        }
        if (e.preventDefault) e.preventDefault();
        const schoolKey = selector.dataset ? selector.dataset.school : undefined;
        if (schoolKey && loader && typeof loader[schoolKey] === 'function') {
          loader[schoolKey](selector)
        }
      })
    }
  })
}

if (saveBtns && saveBtns.forEach) {
  saveBtns.forEach(b=>{
    if (b && b.addEventListener) {
      b.addEventListener('click',()=>{
        saveTimetable()
      })
    }
  })
}

if (resetBtns && resetBtns.forEach) {
  resetBtns.forEach(b=>{
    if (b && b.addEventListener) {
      b.addEventListener('click',()=>{
        resetTimetable()
      })
    }
  })
}

if (presetBtns && presetBtns.forEach) {
  presetBtns.forEach(e=>{
    if (e && e.addEventListener) {
      e.addEventListener('click',()=>{
        refreshTimetable()
      })
    }
  })
}

if (closeBtns && closeBtns.forEach) {
  closeBtns.forEach(e=>{
    if (e && e.addEventListener) {
      e.addEventListener('click',()=>{
        closeTimetable()
      })
    }
  })
}

if (configBtns && configBtns.forEach) {
  configBtns.forEach(btn => {
    if (btn && btn.addEventListener) {
      btn.addEventListener("click", (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        showTimetable(btn)
      });
    }
  });
}

if (policyBtns && policyBtns.forEach) {
  policyBtns.forEach(b=>{
    if (b && b.addEventListener) {
      b.addEventListener('click',e=>{
        const node = b && b.dataset ? b.dataset.node : undefined;
        if (node && policy && typeof policy[node] === 'function') {
          policy[node]()
        }
      })
    }
  })
}

if (nodeLists && nodeLists.forEach) {
  nodeLists.forEach(b=>{
    if (!b || !b.addEventListener) return;
    b.addEventListener('mousedown', (e) => {
      if (e && e.target && e.target.closest && !e.target.closest('.config-btn')) {
        if (e.preventDefault) e.preventDefault()
        b.classList.add('force-active');
      }
    });
    b.addEventListener('mouseup', () => {
      b.classList.remove('force-active');
    });
    b.addEventListener('mouseleave', () => {
      b.classList.remove('force-active');
    });
  })
}

if (policyAgreementCheckbox && policyAgreementCheckbox.addEventListener) {
  policyAgreementCheckbox.addEventListener('change',()=>{
    if(policyAgreementCheckbox.checked){
      if (policyAgreementBtn) policyAgreementBtn.disabled = false;
    }
    else{
      if (policyAgreementBtn) policyAgreementBtn.disabled = true;
    }
  })
}

if (policyAgreementBtn && policyAgreementBtn.addEventListener) {
  policyAgreementBtn.addEventListener('click',e=>{
    if (e && e.preventDefault) e.preventDefault()
    if(policyAgreementCheckbox && policyAgreementCheckbox.checked){
      setLocal("privacy_policy_agreement", [true, new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false }), false]);
      if (screen1) screen1.classList.add('hidden')
      if (policyModal) policyModal.classList.add('hidden');
    }
  })
}

if (infoBtns && infoBtns.forEach) {
  infoBtns.forEach(btn=>{
    if (btn && btn.addEventListener) {
      btn.addEventListener('click',e=>{
        if (e && e.preventDefault) e.preventDefault()
        if (e && e.stopPropagation) e.stopPropagation()
        const info = btn && btn.dataset ? btn.dataset.info : '';
        if (typeof info === 'string') {
          notify(info)
        }
      })
    }
  })
}

if (dropdownConfigSelectors && dropdownConfigSelectors.forEach) {
  dropdownConfigSelectors.forEach(e=>{
    if (e && e.addEventListener) {
      e.addEventListener('change',()=>{
        refreshTimetable(e.value)
      })
    }
  })
}

// Close the overlay when clicking outside of it
if (darkScreen && darkScreen.addEventListener) {
  darkScreen.addEventListener("click", () => {
    hideOverlays()
  });
}

if (ok && ok.addEventListener) {
  ok.addEventListener('click',()=>{
    hideBanner()
  })
}

if (screen1 && screen1.addEventListener) {
  screen1.addEventListener("click", (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (e && e.stopPropagation) e.stopPropagation()
  });
}

// listener - open updates.html when clicked
if (showUpdates && showUpdates.addEventListener) {
  showUpdates.addEventListener('click',(e)=>{
    const url = showUpdates && showUpdates.dataset ? showUpdates.dataset.url : undefined;
    open(url)
    if (window && typeof window.close === 'function') window.close()
  })
}

// Calendar option selection event listeners
if (calendarOptions && calendarOptions.forEach) {
  calendarOptions.forEach(option => {
    if (option && option.addEventListener) {
      option.addEventListener('click', (e) => {
        const calendarType = option.dataset ? option.dataset.calendarType : undefined;
        if (calendarType) {
          selectCalendar(calendarType);
        }
      });
    }
  });
}

/**
 * Injects a content script into a specific tab
 * @param {number} tabId - ID of the target tab
 * @param {string} file - Path to the script file to inject
 */
function injectScript(tabId, file) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [file]
  });
}

/**
 * Opens a URL in a new tab or focuses existing tab if already open
 * @param {string} requestUrl - URL to open
 */
function open(requestUrl){
  if(requestUrl){
    chrome.tabs.query({'url':requestUrl}, tabs => {
      if(tabs.length>0){
        chrome.tabs.update(tabs[tabs.length-1].id, {active: true})
      }
      else{
        chrome.tabs.create({url: requestUrl})
      }
    })
  }
}

/**
 * Loads Carleton timetable by injecting the appropriate script
 * @param {HTMLElement} node - DOM element containing dataset attributes for injection
 */
function loaderCarleton(node){
  injectCarleton(node.dataset.injection, node.dataset.url, node.dataset.timetables)
}

/**
 * Injects Carleton timetable script into active tab or creates new tab
 * @param {string} file - Path to the script file to inject
 * @param {string} login - Login URL for Carleton
 * @param {string} timetables - Timetables URL pattern to match
 */
function injectCarleton(file, login, timetables){
  if (typeof timetables !== 'string' || typeof file !== 'string' || typeof login !== 'string') {
    return;
  }
  chrome.tabs.query({ active: true, url: timetables },tab=>{
    if(tab.length>0){
      chrome.storage.session.set({['timetable-requested']:[true,'carleton', file]}, ()=>{
        injectScript(tab[0].id, file);
      })
    }
    else{ // if auto-navigate
      chrome.storage.session.set({['timetable-requested']:[true,'carleton', file]}, ()=>{
        chrome.runtime.sendMessage({ action: 'newCarletonTempTab', login:login, type:'timetable'});
      });
    }
  })
}

function showTimetable(btn){
  schoolSelect.value = btn.dataset.school;
  refreshTimetable(schoolSelect.value)
  timetableOverlay.classList.remove('hidden')
  darkScreen.classList.remove("hidden");
}

function saveTimetable(school=schoolSelect.value, semester=semesterSelect.value, year=yearSelect.value, combined=exportMode.checked){
  if (!school) return;
  const safeCombined = !!combined;
  setLocal(school, [semester, year, safeCombined])
  hideOverlays()
}

function refreshTimetable(key){
  if (!key) { return; }
  chrome.storage.local.get([key], (result) => {
    const termData = result[key];
    if (termData) {
      if (semesterSelect) semesterSelect.value = termData[0];
      if (yearSelect) yearSelect.value = termData[1];
      if (exportMode) exportMode.checked = termData[2]==undefined?true:!!termData[2]
      setTimetableState(key, [semesterSelect ? semesterSelect.value : termData[0], yearSelect ? yearSelect.value : termData[1]])
    } else {
      setTimetableState(key, resetTimetable());
      saveTimetable()
    }
  });
}

function setTimetableState(school, term) {
  if (!Array.isArray(term) || term.length < 2) return;
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

  const targetState = document.querySelector(`.node-state[data-school="${school}"]`);

  if (targetState) {
    targetState.textContent = `${sem} ${term[1]}`;
  } else {
    // Node state label not found
  }
}

function resetTimetable(){
  const defaultTerm = getDefaultTerm();
  //console.log('Using default term:', defaultTerm);
  if (semesterSelect) semesterSelect.value = defaultTerm[0];
  if (yearSelect) yearSelect.value = defaultTerm[1];
  if (exportMode) exportMode.checked = defaultTerm[2]==undefined?true:!!defaultTerm[2]
  //console.log('New term:', [semesterSelect.value, yearSelect.value, findTimetable.checked]);
  return defaultTerm
}

function initTimetable(){
  refreshTimetable('carleton')
  // refresh('ottawa')
  // refresh('waterloo')
}

function getDefaultTerm() {
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
  } else if (month == 12) {
    term = '10';
    year = String(Number(year) + 1);
  } else {
    term = '10';
    // Month not found
  }

  //console.log("Default term is set to:", [term, year, false]);
  return [term, year, true];
}

function closeTimetable(){
  timetableOverlay.classList.add('hidden')
  darkScreen.classList.add('hidden')
}

function setLocal(key, val){
  chrome.storage.local.get(key, (result)=> {
    if (chrome.runtime.lastError) {
        // Error retrieving key
        return;
    }
    const original = result ? result[key] : undefined; // Retrieve the current value
    if(Array.isArray(original)&&Array.isArray(val)){
      var  eq=arraysEqual(original,val)
    }else{
      var eq=original===val
    }
    if (!eq) { // Only update if the value is different
      //console.log("About to save - ", original, " ==> ", val);
      chrome.storage.local.set({ [key]: val }, function() {
        if (chrome.runtime.lastError) {
          // Error saving value
        }
        else{
          //console.log("Value saved successfully for", key, ":", val);
        }
        try{
          if (refresh && typeof refresh[key] === 'function') {
            refresh[key](key)
          }
        }
        catch(error){
          // console.error(`REFRESH ERROR FOR KEY ${key}:\n${error}`)
        }
      });
    } else {
      //console.log("No change detected. Value not updated for key:", key);
    }
  });
}

function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

function notify(warning){
  if (typeof warning !== 'string') return;
  bannerOverlay.querySelectorAll('.banner-title, .banner-msg').forEach((elem)=>{
    elem.classList.add('hidden')
    //console.log('added hidden class to - ',elem)
  })
  bannerOverlay.querySelectorAll(warning).forEach((elem)=>{
    elem.classList.remove('hidden')
    //console.log('remove hidden from - ',elem)
  })
  screen1.classList.remove('hidden')
  bannerOverlay.classList.remove('hidden')
  //console.log('sent notification - ',warning)
}

function hideOverlays(){
  allOverlays.forEach(o => {
    if(!o.classList.contains('hidden'))
    o.classList.add('hidden');
  });
  darkScreen.classList.add("hidden");
}

function hideBanner(){
  //console.log('Banner ok button click');
  bannerOverlay.classList.add("hidden");
  screen1.classList.add("hidden");
  const placeholder = content ? content.querySelector('.banner-placeholder') : null
  if (placeholder) placeholder.classList.remove('hidden')
  const helem=header ? header.querySelector('.notif-header') : null
  const pelem = content ? content.querySelector('.notif-content') : null
  if(helem){
    helem.remove()

  }
  if(pelem){
    pelem.remove()
  }
}

function init(){
  chrome.storage.local.get(['privacy_policy_agreement'],(result)=>{
    const p=result['privacy_policy_agreement']
    if(!p || !p[0]){
      screen1.classList.remove('hidden')
      policyModal.classList.remove('hidden')
      policyAgreementBtn.disabled=true;
    }
  })
  initTimetable()
  initCalendarSelection()
}

init()

/**
 * Handles calendar option selection
 * @param {string} calendarType - Type of calendar selected (google, outlook, apple, ics)
 */
function selectCalendar(calendarType) {
  // Remove selected class from all calendar options
  calendarOptions.forEach(option => {
    option.classList.remove('selected');
  });
  
  // Add selected class to clicked option
  const selectedOption = document.querySelector(`[data-calendar-type="${calendarType}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
  
  // Store selected calendar type
  setLocal('selected-calendar', calendarType);
}

/**
 * Gets the currently selected calendar type
 * @returns {string} Selected calendar type or default 'google'
 */
function getSelectedCalendar() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selected-calendar'], (result) => {
      const selectedCalendar = result['selected-calendar'] || 'google';
      resolve(selectedCalendar);
    });
  });
}

/**
 * Initializes calendar option selection UI and persistence
 */
function initCalendarSelection() {
  const initFn = async () => {
    try {
      // Restore previous selection
      const selected = await getSelectedCalendar();
      selectCalendar(selected);

      // Wire click handlers
      const options = document.querySelectorAll('.calendar-option');
      options.forEach((option) => {
        if (option && option.addEventListener) {
          option.addEventListener('click', (e) => {
            if (e && e.preventDefault) e.preventDefault();
            const type = option.dataset ? option.dataset.calendarType : undefined;
            if (type) selectCalendar(type);
          });
        }
      });
    } catch (err) {
      // Swallow to avoid breaking popup render
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFn, { once: true });
  } else {
    initFn();
  }
}

function updateTermDisplay() {
  const semesterSelect = document.getElementById('semester-select');
  const yearSelect = document.getElementById('year-select');
  const termDisplay = document.getElementById('term-display');

  if (!semesterSelect || !yearSelect || !termDisplay) {
    return;
  }

  let semesterLabel = semesterSelect.options[semesterSelect.selectedIndex].text;
  let year = yearSelect.value;

  semesterLabel = semesterLabel.charAt(0).toUpperCase() + semesterLabel.slice(1);

  termDisplay.textContent = `(${semesterLabel} ${year})`;
}

document.addEventListener('DOMContentLoaded', () => {
  updateTermDisplay();

  const semesterSelect = document.getElementById('semester-select');
  const yearSelect = document.getElementById('year-select');

  if (semesterSelect) {
    semesterSelect.addEventListener('change', updateTermDisplay);
  }
  if (yearSelect) {
    yearSelect.addEventListener('change', updateTermDisplay);
  }

  // Initialize feedback functionality
  initializeFeedback();
});

/**
 * Initialize feedback overlay functionality
 */
function initializeFeedback() {
  const feedbackBtn = document.getElementById('feedback-btn');
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const closeFeedbackBtn = document.getElementById('close-feedback');
  const cancelFeedbackBtn = document.getElementById('cancel-feedback');
  const feedbackForm = document.getElementById('feedback-form');

  // Show feedback overlay
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
      feedbackOverlay.classList.remove('hidden');
    });
  }

  // Hide feedback overlay
  function hideFeedbackOverlay() {
    feedbackOverlay.classList.add('hidden');
    // Reset form
    if (feedbackForm) {
      feedbackForm.reset();
    }
  }

  if (closeFeedbackBtn) {
    closeFeedbackBtn.addEventListener('click', hideFeedbackOverlay);
  }

  if (cancelFeedbackBtn) {
    cancelFeedbackBtn.addEventListener('click', hideFeedbackOverlay);
  }

  // Close overlay when clicking outside the form
  if (feedbackOverlay) {
    feedbackOverlay.addEventListener('click', (e) => {
      if (e.target === feedbackOverlay) {
        hideFeedbackOverlay();
      }
    });
  }

  // Handle form submission
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', handleFeedbackSubmission);
  }
}

/**
 * Handle feedback form submission
 * @param {Event} e - Form submission event
 */
function handleFeedbackSubmission(e) {
  e.preventDefault();

  const emailInput = document.getElementById('feedback-email');
  const textInput = document.getElementById('feedback-text');
  const submitBtn = document.querySelector('.submit-feedback');

  // Validate required field
  if (!textInput.value.trim()) {
    textInput.focus();
    textInput.style.borderColor = '#ff4444';
    setTimeout(() => {
      textInput.style.borderColor = '#444';
    }, 2000);
    return;
  }

  // Disable submit button during processing
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  // Prepare feedback data
  const feedbackData = {
    email: emailInput.value.trim() || 'anonymous',
    feedback: textInput.value.trim(),
    timestamp: new Date().toISOString(),
    extension: 'Schedule Scoop',
    version: chrome.runtime.getManifest().version
  };

  // Send feedback (you can implement your preferred method here)
  sendFeedback(feedbackData)
    .then(() => {
      // Success - show confirmation and close overlay
      showFeedbackConfirmation();
      document.getElementById('feedback-overlay').classList.add('hidden');
      document.getElementById('feedback-form').reset();
    })
    .catch((error) => {
      console.error('Failed to send feedback:', error);
      // Show error message
      showFeedbackError();
    })
    .finally(() => {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    });
}

/**
 * Send feedback data (placeholder implementation)
 * @param {Object} feedbackData - The feedback data to send
 * @returns {Promise} Promise that resolves when feedback is sent
 */
function sendFeedback(feedbackData) {
  // For now, just log to console and resolve after a short delay
  // You can replace this with your actual feedback submission logic
  console.log('Feedback submitted:', feedbackData);
  
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

/**
 * Show feedback confirmation message
 */
function showFeedbackConfirmation() {
  // You can implement a toast notification or use existing notification system
  console.log('Feedback sent successfully!');
  
  // Optional: Show a brief success message
  const feedbackBtn = document.getElementById('feedback-btn');
  const originalText = feedbackBtn.textContent;
  feedbackBtn.textContent = 'Thanks!';
  feedbackBtn.style.color = '#2af85d';
  
  setTimeout(() => {
    feedbackBtn.textContent = originalText;
    feedbackBtn.style.color = '';
  }, 2000);
}

/**
 * Show feedback error message
 */
function showFeedbackError() {
  console.error('Failed to send feedback');
  
  // Optional: Show error indication
  const feedbackBtn = document.getElementById('feedback-btn');
  const originalText = feedbackBtn.textContent;
  feedbackBtn.textContent = 'Error';
  feedbackBtn.style.color = '#ff4444';
  
  setTimeout(() => {
    feedbackBtn.textContent = originalText;
    feedbackBtn.style.color = '';
  }, 2000);
}
