
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

const policyURL = 'https://github.com/DerekY2/ext-privacy-policies/blob/main/SPARKLING%20H2O2.md'
const dataPolicyURL = 'https://github.com/DerekY2/ext-privacy-policies/blob/main/SPARKLING%20H2O2.md#data-collection'

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
nodes.forEach(node => {
  node.addEventListener("click", (e)=>{
    const nodeParent = e.target.closest("li");
    //clog(selectionParent)
    nodeParent.classList.toggle("showMenu")
  })
})

// click listener & open options page
staticNodes.forEach(node => {
  node.addEventListener("click", (e)=>{
    chrome.runtime.openOptionsPage()
  })
})

// click listener - selectors
nodeSelectors.forEach(selector =>{
  selector.addEventListener("click", (e)=>{
    // Check if the click event originated from a config-btn
    if (e.target.closest(".config-btn")) {
      // If so, stop the event from propagating to the parent
      e.stopPropagation();
      return;
    }
    e.preventDefault
    loader[selector.dataset.school](selector)
  })
})

saveBtns.forEach(b=>{
  b.addEventListener('click',()=>{
    saveTimetable()
  })
})

resetBtns.forEach(b=>{
  b.addEventListener('click',()=>{
    resetTimetable()
  })
})

presetBtns.forEach(e=>{
  e.addEventListener('click',()=>{
    refreshTimetable()
  })
})

closeBtns.forEach(e=>{
  e.addEventListener('click',()=>{
    closeTimetable()
  })
})

configBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    showTimetable(btn)
  });
});

policyBtns.forEach(b=>{
  b.addEventListener('click',e=>{
    policy[b.dataset.node]()
    // console.log("clicked",b.dataset.node)
  })
})

nodeLists.forEach(b=>{
  b.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.config-btn')) {
      e.preventDefault()
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

policyAgreementCheckbox.addEventListener('change',()=>{
  if(policyAgreementCheckbox.checked){
    policyAgreementBtn.disabled = false;
  }
  else{
    policyAgreementBtn.disabled = true;
  }
})

policyAgreementBtn.addEventListener('click',e=>{
  e.preventDefault()
  if(policyAgreementCheckbox.checked){
    setLocal("privacy_policy_agreement", [policyAgreementCheckbox.checked, new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false }), false]);
    screen1.classList.add('hidden')
    policyModal.classList.add('hidden');
  }
})

infoBtns.forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.preventDefault()
    e.stopPropagation()
    notify(btn.dataset.info)
  })
})

dropdownConfigSelectors.forEach(e=>{
  e.addEventListener('change',()=>{
    refreshTimetable(e.value)
  })
})

// Close the overlay when clicking outside of it
darkScreen.addEventListener("click", () => {
  hideOverlays()
});

ok.addEventListener('click',()=>{
  hideBanner()
})

screen1.addEventListener("click", (e) => {
  e.preventDefault()
  e.stopPropagation()
});

// listener - open updates.html when clicked
showUpdates.addEventListener('click',(e)=>{
  open(showUpdates.dataset.url)
  window.close()
})

function injectScript(tabId, file) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [file]
  });
}

function open(request_url){
  if(request_url){
    chrome.tabs.query({'url':request_url}, tabs => {
      if(tabs.length>0){
        chrome.tabs.update(tabs[tabs.length-1].id, {active: true})
      }
      else{
        chrome.tabs.create({url: request_url})
      }
    })
  }
}

function loaderCarleton(node){
  injectCarleton(node.dataset.injection, node.dataset.url, node.dataset.timetables)
}

function injectCarleton(file, login, timetables){
  chrome.tabs.query({ active: true, url: timetables },tab=>{
    if(tab.length>0){
      chrome.storage.session.set({['timetable-requested']:[true,'carleton', file]}, ()=>{
        injectScript(tab[0].id, file);
      })
    }
    else{ // if auto-navigate
      chrome.tabs.create({ url: login }, newTab=>{
        chrome.storage.session.set({['timetable-requested']:[true,'carleton', file]}, ()=>{
        chrome.runtime.sendMessage({ action: 'newCarletonTempTab', tab: newTab, type:'timetable'});
          injectScript(newTab.id, file);
        })
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
  setLocal(school, [semester, year, combined])
  hideOverlays()
}

function refreshTimetable(key){
  chrome.storage.local.get([key], (result) => {
    const termData = result[key];
    if (termData) {
      semesterSelect.value = termData[0];
      yearSelect.value = termData[1];
      exportMode.checked = termData[2]==undefined?true:termData[2]
      setTimetableState(key, [semesterSelect.value, yearSelect.value])
    } else {
      setTimetableState(key, resetTimetable());
      saveTimetable()
    }
  });
}

function setTimetableState(school, term) {
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

  const targetState = document.querySelector(`.node-state[data-school="${school}"]`);

  if (targetState) {
    targetState.textContent = `${sem} ${term[1]}`;
  } else {
    console.error('Node state label not found for school:', school);
  }
}

function resetTimetable(){
  const defaultTerm = getDefaultTerm();
  //console.log('Using default term:', defaultTerm);
  semesterSelect.value = defaultTerm[0];
  yearSelect.value = defaultTerm[1];
  exportMode.checked = defaultTerm[2]==undefined?true:defaultTerm[2]
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
    console.error("ERROR: month not found. Default term is set to:", term, year, true);
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
        console.error("Error retrieving key:", key, chrome.runtime.lastError);
        return;
    }
    const original = result[key]; // Retrieve the current value
    if(Array.isArray(original)&&Array.isArray(val)){
      var  eq=arraysEqual(original,val)
    }else{
      var eq=original===val
    }
    if (!eq) { // Only update if the value is different
      //console.log("About to save - ", original, " ==> ", val);
      chrome.storage.local.set({ [key]: val }, function() {
        if (chrome.runtime.lastError) {
          console.error("Error saving value:", key, chrome.runtime.lastError);
        }
        else{
          //console.log("Value saved successfully for", key, ":", val);
        }
        try{
          refresh[key](key)
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
  content.querySelector('.banner-placeholder').classList.remove('hidden')
  const helem=header.querySelector('.notif-header')
  const pelem = content.querySelector('.notif-content')
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