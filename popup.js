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

const policyURL = 'https://github.com/DerekY2/ext-privacy-policies/blob/main/NeuroNest.md'
const dataPolicyURL = 'https://github.com/DerekY2/ext-privacy-policies/blob/main/NeuroNest.md#data-collection'

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
}
init()