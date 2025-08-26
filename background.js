// Helper to promisify chrome.storage.session.get
/**
 * Promisifies chrome.storage.session.get for easier async/await usage
 * @param {string|Array|Object} key - Storage key(s) to retrieve
 * @returns {Promise<Object>} Promise that resolves with the storage result
 */
const getSession = (key) => {
  return new Promise((resolve) => {
    chrome.storage.session.get(key, (result) => resolve(result));
  });
};

// Helper to promisify chrome.storage.session.set
/**
 * Promisifies chrome.storage.session.set for easier async/await usage
 * @param {Object} obj - Object containing key-value pairs to store
 * @returns {Promise<void>} Promise that resolves when storage is complete
 */
const setSession = (obj) => {
  return new Promise((resolve) => {
    chrome.storage.session.set(obj, () => resolve());
  });
};

// Helper to promisify chrome.storage.local.get
/**
 * Promisifies chrome.storage.local.get for easier async/await usage
 * @param {string|Array|Object} key - Storage key(s) to retrieve
 * @returns {Promise<Object>} Promise that resolves with the storage result
 */
const getLocal = (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result));
  });
};

// Helper to promisify chrome.storage.local.set
/**
 * Promisifies chrome.storage.local.set for easier async/await usage
 * @param {Object} obj - Object containing key-value pairs to store
 * @returns {Promise<void>} Promise that resolves when storage is complete
 */
const setLocal = (obj) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => resolve());
  });
};

// Helper to promisify chrome.tabs.create
/**
 * Promisifies chrome.tabs.create for easier async/await usage
 * @param {Object} options - Tab creation options (url, active, etc.)
 * @returns {Promise<chrome.tabs.Tab>} Promise that resolves with the created tab
 */
const createTab = (options) => {
  return new Promise((resolve) => {
    chrome.tabs.create(options, (tab) => resolve(tab));
  });
};

// Helper to promisify chrome.tabs.remove
/**
 * Promisifies chrome.tabs.remove for easier async/await usage
 * @param {number} tabId - ID of the tab to remove
 * @returns {Promise<void>} Promise that resolves when tab is removed
 */
const removeTab = (tabId) => {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => resolve());
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object' || typeof message.action !== 'string') {
    return false;
  }

  // Handle Google Calendar token request synchronously
  if (message.action === 'getGoogleCalendarToken') {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('Google Calendar auth error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('Google Calendar token obtained successfully');
        sendResponse({ success: true, token: token });
      }
    });
    return true; // Keep message channel open for async response
  }

  // Handle Outlook Calendar token request synchronously
  if (message.action === 'getOutlookCalendarToken') {
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
        console.error('Outlook Calendar auth error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: { message: chrome.runtime.lastError.message } });
        return;
      }
      
      if (!responseUrl) {
        console.error('Outlook Calendar auth cancelled');
        sendResponse({ success: false, error: { message: 'Authentication cancelled by user' } });
        return;
      }
      
      // Extract access token from URL fragment
      const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
      const accessToken = urlParams.get('access_token');
      
      if (accessToken) {
        console.log('Outlook Calendar token obtained successfully');
        sendResponse({ success: true, token: accessToken });
      } else {
        console.error('Failed to extract Outlook access token');
        sendResponse({ success: false, error: { message: 'Failed to extract access token from response' } });
      }
    });
    return true; // Keep message channel open for async response
  }

  // Handle other async operations
  (async () => {

    if (message.action === 'newCarletonTempTab') {
      const isLogin = message && message.type === 'login';
      const loginUrl = message && typeof message.login === 'string' ? message.login : undefined;
      if (!loginUrl) {
        return;
      }
      let key = isLogin ? 'tempLoginCU' : 'tempTimetableCU';
      const tab = await createTab({ url: loginUrl });
      const result = await getSession(key);
      const temp = result[key] ? result[key] : [];
      if (tab && typeof tab.id === 'number') {
        temp.push(tab);
      }
      await setSession({ [key]: temp });
      //console.log(`Tracking new, ${key} tab:`, tab, `.\nTotal:`, temp);
    }

    else if (message.action === 'closeTempTabs') {
      let key = message && message.type === 'tempLoginCU' ? 'tempLoginCU' : 'tempTimetableCU';
      const result = await getSession(key);
      let tabs = result[key];
      //console.log(`About to close temp:`, tabs);
      if (Array.isArray(tabs) && tabs.length > 0) {
        for (const tab of tabs) {
          try {
            if (tab && typeof tab.id === 'number') {
              await removeTab(tab.id);
            }
            //console.log(`removed ${key} tab:`, tab);
          } catch (err) {
            // Error removing tab
          }
        }
      }
      tabs = [];
      await setSession({ [key]: tabs });
      //console.log(`Updated ${key}.\nRemaining tabs:`, tabs);
    }

    if (message.action === 'end-timetable-request') {
      await setSession({ ['timetable-requested']: [false] });
    }

    else if (message.action === 'log_calendar') {
      const arr = Array.isArray(message.data) ? message.data : [];
      if (arr.length < 6) {
        return;
      }
      const calendarData = {
        name: typeof arr[0] === 'string' ? arr[0] : '',
        time: typeof arr[1] === 'string' ? arr[1] : '',
        institution: typeof arr[2] === 'string' ? arr[2] : '',
        term: typeof arr[3] === 'string' ? arr[3] : '',
        info: typeof arr[4] === 'string' ? arr[4] : '',
        calendar: typeof arr[5] === 'string' ? arr[5] : ''
      };
      try {
        // Send the data as a JSON object to the PHP server
        await fetch('http://ec2-35-182-229-61.ca-central-1.compute.amazonaws.com/handle_calendar.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarData)
        });
      } catch (e) {
        // network error ignored
      }
    }

    else if (message.action === 'update_agreement') {
      //console.log('updating agreement')
      const arr = Array.isArray(message.data) ? message.data : [];
      if (arr.length < 5) {
        return;
      }
      const agreementDetails = {
        name: typeof arr[0] === 'string' ? arr[0] : '',
        policy: typeof arr[1] === 'string' ? arr[1] : '',
        agreement_date: typeof arr[2] === 'string' ? arr[2] : '',
        recorded_date: typeof arr[3] === 'string' ? arr[3] : '',
        agreed: String(arr[4])
      };
      try {
        // Send the data as a JSON object to the PHP server
        await fetch('http://ec2-35-182-229-61.ca-central-1.compute.amazonaws.com/handle_policy.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(agreementDetails)
        });
      } catch (e) {
        // network error ignored
      }
      const results = await getLocal('privacy_policy_agreement');
      const r = results['privacy_policy_agreement'];
      if (Array.isArray(r)) {
        r[2] = true;
        await setLocal({ ['privacy_policy_agreement']: r });
      }
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
        // Script injection completed
      }
    }
  })();
}, {
  url: [
    { hostContains: 'central.carleton.ca' },
    { urlEquals: 'https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout' }
  ]
});

/**
 * Injects a content script into a specific tab
 * @param {number} tabId - ID of the target tab
 * @param {string} file - Path to the script file to inject
 */
const injectScript = (tabId, file) => {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [file]
  });
};