// Simple content script that communicates with injected script
let currentSettings = {
  enabled: true,
  speed: 1.0
};

// Inject the script that will run in page context
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
 (document.head || document.documentElement).appendChild(script);
}

// Send settings to the page
function updatePageSettings() {
  window.postMessage({
    type: 'PATCHROME_SETTINGS',
    settings: currentSettings
  }, '*');
}

// Get initial settings
chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
  if (response) {
    currentSettings = response;
    updatePageSettings();
  }
});

// Listen for settings updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SETTINGS_UPDATED') {
    currentSettings = request.settings;
    updatePageSettings();
  }
});

// Inject script early
injectScript();

// Also update when page loads
window.addEventListener('load', () => {
  updatePageSettings();
});