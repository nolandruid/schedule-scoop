chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.action==='newCarletonTempTab'){
    if(message.type=='login'){
      var key='tempLoginCU'
    }else{
      key = 'tempTimetableCU'
    }
    chrome.storage.session.get(key,(result)=>{
      var temp = result[key]?result[key]:[];
      newTempTab = message.tab
      temp.push(newTempTab)
      chrome.storage.session.set({[key]: temp},()=>{
        //console.log('Tracking new,',key,'tab:',newTempTab,'.\nTotal:',temp)
      })
    })
  }

  else if(message.action==='closeTempTabs'){
    if(message.type=='tempLoginCU'){
      var key='tempLoginCU'
    }else{
      key = 'tempTimetableCU'
    }
    chrome.storage.session.get(key,(result)=>{
      var tabs=result[key]
      //console.log('About to close temp:',tabs)
      if(tabs&&tabs.length>0)
        tabs.forEach(tab=>{
          try{
            chrome.tabs.remove(tab.id,()=>{
              //console.log('removed',key,'tab:',tab)
            })
          }
          catch(err){
            console.error(err)
          }
        })
        tabs=[]
        chrome.storage.session.set({[key]:tabs},()=>{
          //console.log('Updated', key,'.\nRemaining tabs:', tabs);
        })
    })
  }
  else if(message.action==='end-timetable-request'){
    chrome.storage.session.set({['timetable-requested']:[false]})
  }
});


function store(key, val){
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
      chrome.storage.storage.set({ [key]: val }, function() {
        if (chrome.runtime.lastError) {
          console.error("Error saving value:", key, chrome.runtime.lastError);
        }
        else{
          //console.log("Value saved successfully for", key, ":", val);
        }
        refresh[key](key)
      });
    } else {
      //console.log("No change detected. Value not updated for key:", key);
    }
  });
}

chrome.webNavigation.onCommitted.addListener((details) => {
  chrome.storage.session.get(['timetable-requested'], (result) => {
    const r = result['timetable-requested'];
    if (r && r[0]) {
      if(details.url=='https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout'){
        window.location.href='https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd'
      }
      else{
        injectScript(details.tabId, r[2]);
        console.log('timetable requested, injected script');
      }
    }
  });
}, {
  url: [
    { hostContains: 'central.carleton.ca' },
    { urlEquals: 'https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout'}
  ]
});

function injectScript(tabId, file) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [file]
  });
}