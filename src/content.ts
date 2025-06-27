import { Settings } from './shared/types';

console.log('[Patchrome Content] Content script loaded!');

let currentSettings: Settings = {
  enabled: true,
  speed: 1.0,
  reverb: 0,
  audioGraph: {
    nodes: [
      { id: '1', type: 'input', params: { speed: 1.0 } },
      { id: '3', type: 'output', params: {} }
    ],
    edges: [
      { id: 'e1-3', source: '1', target: '3' },
    ]
  }
};

function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  (document.head || document.documentElement).appendChild(script);
}

function updatePageSettings() {
  console.log(`[Content] Sending settings to inject.js:`, currentSettings);
  // Also send the worklet URLs since inject.js can't access chrome.runtime
  const workletUrl = chrome.runtime.getURL('src/worklets/spectral-gate-processor.js');
  window.postMessage({
    type: 'PATCHROME_SETTINGS',
    settings: currentSettings,
    workletUrl: workletUrl
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
    console.log(`[Content] Received SETTINGS_UPDATED from background:`, request.settings);
    currentSettings = request.settings;
    updatePageSettings();
  }
});

injectScript();

window.addEventListener('load', () => {
  updatePageSettings();
});