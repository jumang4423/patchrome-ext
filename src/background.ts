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

chrome.storage.local.get(['settings'], (result) => {
  if (result.settings) {
    currentSettings = result.settings;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    currentSettings = changes.settings.newValue;
    broadcastSettings();
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === 'GET_SETTINGS') {
    sendResponse(currentSettings);
    return true;
  } else if (request.type === 'UPDATE_SETTINGS') {
    currentSettings = request.settings;
    chrome.storage.local.set({ settings: currentSettings });
    broadcastSettings();
    sendResponse({ success: true });
    return true;
  }
});

function broadcastSettings() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: currentSettings
        }).catch(() => {});
      }
    });
  });
}