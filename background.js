let currentSettings = {
  enabled: true,
  speed: 1.0
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
    return true; // Keep the message channel open for async response
  } else if (request.type === 'UPDATE_SETTINGS') {
    currentSettings = request.settings;
    chrome.storage.local.set({ settings: currentSettings });
    broadcastSettings();
    sendResponse({ success: true });
    return true; // Keep the message channel open for async response
  }
});

function broadcastSettings() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings: currentSettings
      }).catch(() => {});
    });
  });
}