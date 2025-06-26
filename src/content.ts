import { Settings } from './shared/types';

let currentSettings: Settings = {
  enabled: true,
  speed: 1.0,
  reverb: 0,
  audioGraph: {
    nodes: [
      { id: '1', type: 'input', params: { speed: 1.0 } },
      { id: '2', type: 'reverb', params: { mix: 0 } },
      { id: '3', type: 'output', params: {} }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' }
    ]
  }
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