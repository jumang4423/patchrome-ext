const enableToggle = document.getElementById('enableToggle');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

let settings = {
  enabled: false,
  speed: 1.0
};

// Load initial settings
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading settings:', chrome.runtime.lastError);
      return;
    }
    if (response) {
      console.log('Loaded settings:', response);
      settings = response;
      updateUI();
    }
  });
});

function updateUI() {
  enableToggle.checked = settings.enabled;
  speedSlider.value = settings.speed;
  speedValue.textContent = settings.speed.toFixed(1) + 'x';
}

function saveSettings() {
  console.log('Saving settings:', settings);
  chrome.runtime.sendMessage({
    type: 'UPDATE_SETTINGS',
    settings: settings
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error saving settings:', chrome.runtime.lastError.message);
    }
  });
}

enableToggle.addEventListener('change', (e) => {
  settings.enabled = e.target.checked;
  saveSettings();
});

speedSlider.addEventListener('input', (e) => {
  settings.speed = parseFloat(e.target.value);
  speedValue.textContent = settings.speed.toFixed(1) + 'x';
  saveSettings();
});