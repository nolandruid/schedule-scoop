// Helper to promisify chrome.storage.session.get
const getSession = (key) => {
  return new Promise((resolve) => {
    chrome.storage.session.get(key, (result) => resolve(result));
  });
};

// Helper to promisify chrome.storage.session.set
const setSession = (obj) => {
  return new Promise((resolve) => {
    chrome.storage.session.set(obj, () => resolve());
  });
};

// Helper to promisify chrome.storage.local.get
const getLocal = (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result));
  });
};

// Helper to promisify chrome.storage.local.set
const setLocal = (obj) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => resolve());
  });
};

// Helper to promisify chrome.tabs.create
const createTab = (options) => {
  return new Promise((resolve) => {
    chrome.tabs.create(options, (tab) => resolve(tab));
  });
};

// Helper to promisify chrome.tabs.remove
const removeTab = (tabId) => {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => resolve());
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.action === 'newCarletonTempTab') {
      let key = message.type === 'login' ? 'tempLoginCU' : 'tempTimetableCU';
      const tab = await createTab({ url: message.login });
      const result = await getSession(key);
      const temp = result[key] ? result[key] : [];
      temp.push(tab);
      await setSession({ [key]: temp });
      //console.log(`Tracking new, ${key} tab:`, tab, `.\nTotal:`, temp);
    }

    else if (message.action === 'closeTempTabs') {
      let key = message.type === 'tempLoginCU' ? 'tempLoginCU' : 'tempTimetableCU';
      const result = await getSession(key);
      let tabs = result[key];
      //console.log(`About to close temp:`, tabs);
      if (tabs && tabs.length > 0) {
        for (const tab of tabs) {
          try {
            await removeTab(tab.id);
            //console.log(`removed ${key} tab:`, tab);
          } catch (err) {
            console.error(err);
          }
        }
      }
      tabs = [];
      await setSession({ [key]: tabs });
      //console.log(`Updated ${key}.\nRemaining tabs:`, tabs);
    }

    else if (message.action === 'end-timetable-request') {
      await setSession({ ['timetable-requested']: [false] });
    }

    else if (message.action === 'log_calendar') {
      const calendar_data = {
        name: message.data[0],
        time: message.data[1],
        institution: message.data[2],
        term: message.data[3],
        info: message.data[4],
        calendar: message.data[5]
      };
      // Send the data as a JSON object to the PHP server
      fetch('http://ec2-35-182-229-61.ca-central-1.compute.amazonaws.com/handle_calendar.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendar_data)
      });
    }

    else if (message.action === 'update_agreement') {
      //console.log('updating agreement')
      const agreement_details = {
        name: message.data[0],
        policy: message.data[1],
        agreement_date: message.data[2],
        recorded_date: message.data[3],
        agreed: message.data[4]
      };
      // Send the data as a JSON object to the PHP server
      await fetch('http://ec2-35-182-229-61.ca-central-1.compute.amazonaws.com/handle_policy.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agreement_details)
      });
      const results = await getLocal('privacy_policy_agreement');
      const r = results['privacy_policy_agreement'];
      r[2] = true;
      await setLocal({ ['privacy_policy_agreement']: r });
      //console.log('updated agreement')
    }
  })();
});

chrome.webNavigation.onCommitted.addListener((details) => {
  (async () => {
    const result = await getSession(['timetable-requested']);
    const r = result['timetable-requested'];
    if (r && r[0]) {
      if (details.url === 'https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout') {
        window.location.href = 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd';
      }
      else {
        injectScript(details.tabId, r[2]);
        console.log('timetable requested, injected script');
      }
    }
  })();
}, {
  url: [
    { hostContains: 'central.carleton.ca' },
    { urlEquals: 'https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout' }
  ]
});

const injectScript = (tabId, file) => {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [file]
  });
};
  