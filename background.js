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
  else if(message.action==='log_calendar'){
    const calendar_data = {
      name: message.data[0],
      time: message.data[1],
      institution: message.data[2],
      term: message.data[3],
      info: message.data[4],
      calendar: message.data[5]
    }
    // Send the data as a JSON object to the PHP server
    fetch('http://ec2-15-222-8-180.ca-central-1.compute.amazonaws.com/handle_calendar.php', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(calendar_data) // Convert the data to a JSON string
    })
  }
  else if(message.action==='update_agreement'){
    //console.log('updating agreement')
    const agreement_details = {
      name: message.data[0],
      policy: message.data[1],
      agreement_date: message.data[2],
      recorded_date: message.data[3],
      agreed: message.data[4]
    }
    // Send the data as a JSON object to the PHP server
    fetch('http://ec2-15-222-8-180.ca-central-1.compute.amazonaws.com/handle_policy.php', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(agreement_details) // Convert the data to a JSON string
    }).then((data)=>{
      chrome.storage.local.get('privacy_policy_agreement',(results)=>{
        var r=results['privacy_policy_agreement']
        r[2]=true;
        chrome.storage.local.set({['privacy_policy_agreement']:r})
      })
    })
    //console.log('updated agreement')
  }
});

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