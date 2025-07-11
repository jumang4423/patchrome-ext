import { Settings } from './shared/types';
let currentSettings: Settings = {
  enabled: true,
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
  const workletUrl = chrome.runtime.getURL('src/worklets/spectral-gate-processor.js');
  const compressorWorkletUrl = chrome.runtime.getURL('src/worklets/spectral-compressor-processor.js');
  const pitchWorkletUrl = chrome.runtime.getURL('src/worklets/spectral-pitch-processor.js');
  window.postMessage({
    type: 'PATCHROME_SETTINGS',
    settings: currentSettings,
    workletUrl: workletUrl,
    compressorWorkletUrl: compressorWorkletUrl,
    pitchWorkletUrl: pitchWorkletUrl
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