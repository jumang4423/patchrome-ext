interface Settings {
  enabled: boolean;
  speed: number;
  reverb: number;
}

let currentSettings: Settings = {
  enabled: true,
  speed: 1.0,
  reverb: 0
};

function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
}

function updatePageSettings() {
  window.postMessage({
    type: 'PATCHROME_SETTINGS',
    settings: currentSettings
  }, '*');
}

chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
  if (response) {
    currentSettings = response;
    updatePageSettings();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SETTINGS_UPDATED') {
    currentSettings = request.settings;
    updatePageSettings();
  }
});

injectScript();

window.addEventListener('load', () => {
  updatePageSettings();
});