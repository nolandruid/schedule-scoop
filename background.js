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
    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
    const scope = 'https://graph.microsoft.com/calendars.readwrite';
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_mode=fragment&` +
      `prompt=login&` +
      `login_hint=&` +
      `domain_hint=`;

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

  if (message.action === 'newCarletonTempTab' && typeof message.login === 'string') {
    chrome.tabs.create({ url: message.login });
  } else if (message.action === 'clearGoogleToken' && typeof message.token === 'string') {
    chrome.identity.removeCachedAuthToken({ token: message.token });
  } else if (message.action === 'end-timetable-request') {
    chrome.storage.session.set({ 'timetable-requested': [false] });
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  (async () => {
    const result = await getSession(['timetable-requested']);
    const r = result['timetable-requested'];
    if (r && r[0]) {
      if (details.url === 'https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout') {
        chrome.tabs.update(details.tabId, { url: SSO_URL });
      }
      else {
        injectScript(details.tabId);
      }
    }
  })();
}, {
  url: [
    { hostContains: 'central.carleton.ca' },
    { urlEquals: 'https://360.carleton.ca/urd/sits.urd/run/siw_lgn_logout.saml_logout' }
  ]
});

const SSO_URL = 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd';
const EXPORT_SCRIPTS = ['src/schedule.js', 'src/carleton-parse.js', 'src/export.js', 'src/status-card.js', 'src/carleton.js'];

/**
 * Injects the export scripts into a Carleton Central tab
 * @param {number} tabId - ID of the target tab
 */
function injectScript(tabId) {
  chrome.scripting.executeScript({ target: { tabId }, files: EXPORT_SCRIPTS });
}
